"""Targeted Turnstile activation on dedicated preview, with verified baseline and rollback."""
import base64,importlib.util,json,os,re,ssl,stat,subprocess,uuid
from pathlib import Path
from urllib.request import Request,build_opener,HTTPSHandler,HTTPRedirectHandler
from urllib.error import HTTPError
from urllib.parse import urlencode
import paramiko
ROOT='/creaid-v11'
PRIVATE='/creaid-contact-private'
SITE='https://vorschau.creaid-media.de'
BASE='42fa5bb5a04513f099929aa36093034eead4ca08'
CORE_BASE='70ff9ce8f1df2f8a69bc7df760ab227f9bfd4334'
spec=importlib.util.spec_from_file_location('uploader',Path(__file__).with_name('upload-ionos.py'))
u=importlib.util.module_from_spec(spec);spec.loader.exec_module(u)
require=u.require
class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):return None
opener=build_opener(NoRedirect(),HTTPSHandler(context=ssl.create_default_context()))
def http(url,body=None,headers=None):
    req=Request(url,data=body,headers=headers or {},method='POST' if body is not None else 'GET')
    try:r=opener.open(req,timeout=30)
    except HTTPError as e:r=e
    with r:return r.status,r.headers,r.read(4*1024*1024)
def show(ref,path):return subprocess.check_output(['git','show',ref+':'+path])
def read(s,path):
    a=s.lstat(path)
    require(stat.S_ISREG(a.st_mode) and a.st_size<4*1024*1024,'Unexpected remote type/size: '+path.rsplit('/',1)[-1])
    with s.open(path,'rb') as f:return f.read(),stat.S_IMODE(a.st_mode)
def put(s,path,data,mode):
    temp=path.rsplit('/',1)[0]+'/.creaid-upload-'+uuid.uuid4().hex
    try:
        with s.open(temp,'wx') as f:
            s.chmod(temp,mode);f.write(data);f.flush()
        require(read(s,temp)==(data,mode),'Staged bytes or mode differ.')
        s.posix_rename(temp,path)
    finally:
        try:s.remove(temp)
        except OSError:pass
def reject(token,reason):
    d={'name':'CreAid Bot-Abwehr Test','email':'formular@creaid-media.de','service':'Allgemeine Projektanfrage','message':'Interner Negativtest; darf nicht gesendet werden.','website':''}
    if token is not None:d['turnstile_token']=token
    code,h,b=http(SITE+'/api/contact.php',json.dumps(d).encode(),{'Origin':SITE,'Content-Type':'application/json','Accept':'application/json','Cache-Control':'no-store'})
    require(code==422 and json.loads(b)=={'ok':False,'status':reason},'Live captcha rejection not confirmed: HTTP '+str(code))
    print('LIVE_REJECTION_OK '+reason,flush=True)
def main():
    key=os.environ.get('TURNSTILE_SITE_KEY','').strip()
    secret=os.environ.get('TURNSTILE_SECRET_KEY','').strip()
    require(bool(key),'TURNSTILE_SITE_KEY missing.')
    require(bool(secret),'TURNSTILE_SECRET_KEY missing.')
    require(key=='0x4AAAAAAGUfI4b2efonPTdb','TURNSTILE_SITE_KEY does not match the configured widget.')
    require(bool(re.fullmatch(r'[A-Za-z0-9_-]{20,256}',secret)),'TURNSTILE_SECRET_KEY has unexpected format.')
    require(not secret.startswith(('1x000','2x000','3x000')),'TURNSTILE_SECRET_KEY is a test key.')
    require(secret!=key,'TURNSTILE_SECRET_KEY must differ from SITE_KEY.')
    print('Both keys present and local format checks passed.',flush=True)
    code,_,body=http('https://challenges.cloudflare.com/turnstile/v0/siteverify',urlencode({'secret':secret,'response':'creaid-negative-preflight-'+uuid.uuid4().hex}).encode(),{'Content-Type':'application/x-www-form-urlencoded'})
    result=json.loads(body)
    require(code==200 and result.get('success') is False and 'invalid-input-response' in result.get('error-codes',[]) and 'invalid-input-secret' not in result.get('error-codes',[]),'Cloudflare key preflight failed.')
    print('Cloudflare key preflight OK; forged response rejected.',flush=True)
    require(os.environ['SFTP_USERNAME']==u.EXPECTED_USER and os.environ['SFTP_PORT']=='22' and os.environ['SFTP_HOST'].strip().endswith('.webspace-data.io'),'Unexpected SFTP connection.')
    for host in ('creaid-media.com','www.creaid-media.com','creaidmedia.de','www.creaidmedia.de'):
        code,_,_=http('http://'+host+'/creaid-contact-private/zugriffstest.txt')
        require(code==403,'Private access preflight failed.')
    code,_,_=http(SITE+'/creaid-contact-private/zugriffstest.txt')
    require(code in (403,404),'Preview private marker accessible.')
    client=paramiko.SSHClient();client.set_missing_host_key_policy(u.PinnedIONOSKey())
    try:
        client.connect(os.environ['SFTP_HOST'].strip(),port=22,username=os.environ['SFTP_USERNAME'],password=os.environ['SFTP_PASSWORD'],look_for_keys=False,allow_agent=False,timeout=20,banner_timeout=20,auth_timeout=20)
        with client.open_sftp() as s:
            s.get_channel().settimeout(60);u.enter_preview(s)
            require(stat.S_ISDIR(s.lstat(PRIVATE).st_mode),'Unsafe private directory.')
            deny,_=read(s,PRIVATE+'/.htaccess');require(deny.strip()==b'Require all denied','Private denial rule differs.')
            require(stat.S_ISDIR(s.lstat(ROOT+'/api').st_mode),'Unsafe API directory.')
            entries=s.listdir_attr(ROOT+'/api')
            require(len(entries)==1 and entries[0].filename=='contact.php' and stat.S_ISREG(entries[0].st_mode),'Unexpected API contents.')
            oldconfig,cmode=read(s,PRIVATE+'/config.php')
            require(cmode==0o600 and b"'turnstile_" not in oldconfig and b"'enabled' => true" in oldconfig and b"'recipient' => 'info@creaid-media.de'" in oldconfig and b"creaid-v11/api/contact.php" in oldconfig,'Existing protected SMTP configuration differs.')
            require(oldconfig.rstrip().endswith(b'];'),'Unknown configuration format.')
            config=oldconfig.rstrip()[:-2]+b"    'turnstile_required' => true,\n    'turnstile_secret' => base64_decode('"+base64.b64encode(secret.encode())+b"',true),\n    'turnstile_hostname' => 'vorschau.creaid-media.de',\n];\n"
            backups={};changes=[]
            def add(path,expected,new,mode=None):
                if expected is None:
                    try:s.lstat(path)
                    except FileNotFoundError:pass
                    else:raise RuntimeError('Unexpected new file exists.')
                    backups[path]=None
                else:
                    old,oldmode=read(s,path)
                    require(old==expected,'Remote baseline differs: '+path.rsplit('/',1)[-1])
                    backups[path]=(old,oldmode)
                    if mode is None:mode=oldmode
                changes.append((path,new,mode))
            add(PRIVATE+'/turnstile.php',None,Path('backend/contact/turnstile.php').read_bytes(),0o600)
            add(PRIVATE+'/core.php',show(CORE_BASE,'backend/contact/core.php'),Path('backend/contact/core.php').read_bytes())
            add(ROOT+'/api/contact.php',show(BASE,'backend/contact-public/contact.php'),Path('backend/contact-public/contact.php').read_bytes())
            for rel in ('assets/agency-pages.js','datenschutz.html','kontakt.html'):
                old=Path(os.environ['BASELINE_DIR'],'dist',rel).read_bytes()
                new=Path('dist',rel).read_bytes()
                require(new!=old,'Missing candidate change: '+rel)
                add(ROOT+'/'+rel,old,new)
            add(PRIVATE+'/config.php',oldconfig,config,0o600)
            print('All seven targets match baseline; applying atomic file replacements.',flush=True)
            applied=[]
            try:
                for path,data,mode in changes:
                    put(s,path,data,mode);applied.append(path)
                    require(read(s,path)==(data,mode),'Post-install verification failed.')
                for url,rel in [(SITE+'/kontakt','kontakt.html'),(SITE+'/datenschutz','datenschutz.html'),(SITE+'/assets/agency-pages.js','assets/agency-pages.js')]:
                    code,headers,body=http(url,headers={'Cache-Control':'no-cache','Accept-Encoding':'identity'})
                    require(code==200 and body==Path('dist',rel).read_bytes(),'HTTPS byte verification failed: '+rel)
                code,headers,body=http(SITE+'/api/contact.php')
                require(code==405 and json.loads(body)=={'ok':False,'status':'method'} and 'no-store' in headers.get('Cache-Control',''),'API GET or caching changed.')
                reject(None,'captcha_required')
                reject('creaid-forged-'+uuid.uuid4().hex,'captcha_invalid')
                print('TURNSTILE_LIVE_ACTIVE: frontend, private config, missing and forged token rejection verified. No test email sent.',flush=True)
            except Exception:
                print('Activation not confirmed; restoring previous working contact form.',flush=True)
                for path in reversed(applied):
                    previous=backups[path]
                    if previous is None:s.remove(path)
                    else:put(s,path,*previous)
                print('ROLLBACK_COMPLETE',flush=True)
                raise
    finally:client.close()
if __name__=='__main__':
    try:main()
    except Exception as e:
        if isinstance(e,RuntimeError):print('Activation stopped: '+str(e),flush=True)
        else:print('Activation stopped: '+type(e).__name__,flush=True)
        raise SystemExit(1)
