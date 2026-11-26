"""Read-only DNS and sender-mailbox delivery diagnostics. Never send mail or log message content."""
import datetime
import email
import email.policy
import imaplib
import os
import re
import ssl
import subprocess
from pathlib import Path
import importlib.util
import paramiko

def dns():
    for host,typ in [('creaid-media.de','MX'),('creaid-media.de','TXT'),('_dmarc.creaid-media.de','TXT')]:
        out=subprocess.run(['dig','+time=5','+tries=1','+short',host,typ],capture_output=True,text=True,timeout=10)
        if typ=='TXT':
            rows=[line for line in out.stdout.splitlines() if ('v=spf1' if not host.startswith('_dmarc') else 'v=DMARC1') in line]
        else:rows=out.stdout.splitlines()
        print(host,typ,':', ' | '.join(rows) if rows else 'NO_RELEVANT_RECORD',flush=True)
def config():
    spec=importlib.util.spec_from_file_location('uploader',Path(__file__).with_name('upload-ionos.py'))
    u=importlib.util.module_from_spec(spec);spec.loader.exec_module(u)
    u.require(os.environ['SFTP_USERNAME']==u.EXPECTED_USER and os.environ['SFTP_PORT']=='22' and os.environ['SFTP_HOST'].strip().endswith('.webspace-data.io'),'Unexpected SFTP account.')
    client=paramiko.SSHClient();client.set_missing_host_key_policy(u.PinnedIONOSKey())
    try:
        client.connect(os.environ['SFTP_HOST'].strip(),port=22,username=os.environ['SFTP_USERNAME'],password=os.environ['SFTP_PASSWORD'],look_for_keys=False,allow_agent=False,timeout=20)
        with client.open_sftp() as s:
            u.enter_preview(s)
            s.chdir('/creaid-contact-private')
            with s.open('config.php','rb') as f:data=f.read(16384)
            for label,pattern in [('RECIPIENT_EXPECTED',rb"'recipient'\s*=>\s*'info@creaid-media\.de'"),('SENDER_EXPECTED',rb"'smtp_username'\s*=>\s*'formular@creaid-media\.de'"),('CONFIG_ENABLED',rb"'enabled'\s*=>\s*true")]:
                print(label+': '+('YES' if re.search(pattern,data) else 'NO'),flush=True)
    finally:client.close()
def sender_mailbox():
    try:
        with imaplib.IMAP4_SSL('imap.ionos.de',993,ssl_context=ssl.create_default_context(),timeout=20) as im:
            im.login('formular@creaid-media.de',os.environ['CONTACT_SMTP_PASSWORD'])
            typ,count=im.select('INBOX',readonly=True)
            if typ!='OK':raise RuntimeError('Mailbox selection failed')
            print('SENDER_INBOX_READONLY_OK',flush=True)
            since=(datetime.datetime.now(datetime.timezone.utc)-datetime.timedelta(days=2)).strftime('%d-%b-%Y')
            typ,ids=im.uid('search',None,'SINCE',since)
            if typ!='OK':raise RuntimeError('Search failed')
            relevant=0
            for uid in ids[0].split()[-50:]:
                typ,parts=im.uid('fetch',uid,'(BODY.PEEK[HEADER.FIELDS (FROM SUBJECT CONTENT-TYPE)])')
                if typ!='OK':continue
                raw=b''.join(x[1] for x in parts if isinstance(x,tuple))
                msg=email.message_from_bytes(raw,policy=email.policy.default)
                desc=(str(msg.get('From',''))+' '+str(msg.get('Subject',''))+' '+str(msg.get('Content-Type',''))).lower()
                if not any(t in desc for t in ('mailer-daemon','postmaster','delivery status','undeliver','unzustell','delivery failure','delivery report','delivery-status')):continue
                typ,parts=im.uid('fetch',uid,'(BODY.PEEK[]<0.65536>)')
                if typ!='OK':continue
                raw=b''.join(x[1] for x in parts if isinstance(x,tuple))
                if b'info@creaid-media.de' not in raw.lower():continue
                relevant+=1
                msg=email.message_from_bytes(raw,policy=email.policy.default)
                codes=set()
                for part in msg.walk():
                    if part.get_content_type()=='message/delivery-status':
                        for item in part.get_payload():
                            recipient=str(item.get('Final-Recipient','')).lower()
                            if 'info@creaid-media.de' in recipient:
                                status=str(item.get('Status',''))
                                if re.fullmatch(r'[245]\.\d{1,3}\.\d{1,3}',status):codes.add(status)
                print('MATCHING_DSN_STATUS: '+(', '.join(sorted(codes)) if codes else 'no structured status'),flush=True)
            print('MATCHING_DSN_COUNT: '+str(relevant),flush=True)
    except Exception as e:
        print('SENDER_IMAP_UNVERIFIED: '+type(e).__name__,flush=True)
if __name__=='__main__':
    dns();config();sender_mailbox()
