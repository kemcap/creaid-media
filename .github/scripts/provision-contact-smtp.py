"""Provision exactly the existing disabled preview configuration, verify one internal enquiry,
and roll back on any unconfirmed delivery. Never print secrets or response bodies."""
import base64
import concurrent.futures
import importlib.util
import json
import os
import re
import secrets
import ssl
import stat
import uuid
from pathlib import Path
from urllib.request import Request, build_opener, HTTPSHandler
import paramiko

def module(name,file):
    spec=importlib.util.spec_from_file_location(name,Path(__file__).with_name(file))
    m=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m
u=module("uploader","upload-ionos.py")
p=module("protection","verify-contact-protection.py")
require=u.require
PRIVATE="/creaid-contact-private"
def normalized(data):
    s=data.decode("utf-8-sig")
    s=re.sub(r"(?m)^\s*//[^\r\n]*","",s)
    s=s.replace("// locally generate 32 random bytes as hex; never commit","")
    return re.sub(r"\s+","",s)
DISABLED=b"""<?php
declare(strict_types=1);
return [
'enabled'=>false,
'allowed_origins'=>['https://vorschau.creaid-media.de'],
'smtp_host'=>'smtp.ionos.de',
'smtp_port'=>465,
'smtp_username'=>'formular@creaid-media.de',
'smtp_password'=>'',
'recipient'=>'info@creaid-media.de',
'rate_secret'=>'',
];
"""
def config_bytes(password):
    # Base64 is used solely for PHP-safe string quoting, NOT encryption.
    # This file must remain protected by the denied directory, restrictive mode and PHP guard.
    encoded=base64.b64encode(password.encode("utf-8")).decode("ascii")
    rate=secrets.token_hex(32)
    return ("""<?php
declare(strict_types=1);
// Generated only on IONOS. Do not copy into a repository or log.
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') !== realpath(__DIR__.'/../creaid-v11/api/contact.php')) {
    http_response_code(404);
    exit;
}
return [
    'enabled' => true,
    'allowed_origins' => ['https://vorschau.creaid-media.de'],
    'smtp_host' => 'smtp.ionos.de',
    'smtp_port' => 465,
    'smtp_username' => 'formular@creaid-media.de',
    'smtp_password' => base64_decode('"""+encoded+"""',true),
    'recipient' => 'info@creaid-media.de',
    'rate_secret' => '"""+rate+"""',
];
""").encode("utf-8")
def replace_config(s,data,mode=0o600):
    temp="config-"+uuid.uuid4().hex+".php"
    try:
        with s.open(temp,"wx") as f:
            s.chmod(temp,mode)
            f.write(data)
            f.flush()
        require(stat.S_ISREG(s.lstat(temp).st_mode) and stat.S_IMODE(s.lstat(temp).st_mode)==mode,"Private temporary file permissions mismatch.")
        with s.open(temp,"rb") as f:require(f.read(len(data)+1)==data,"Private temporary configuration verification failed.")
        s.posix_rename(temp,"config.php")
    finally:
        try:s.remove(temp)
        except OSError:pass
def one_test():
    payload={"name":"CreAid-Media Funktionstest","email":"formular@creaid-media.de",
        "company":"CreAid-Media","phone":"","service":"Allgemeine Projektanfrage",
        "message":"TECHNISCHER TEST – Kontaktformular auf vorschau.creaid-media.de. Keine Kundenanfrage; keine Antwort erforderlich. Test-ID: "+uuid.uuid4().hex,
        "website":""}
    req=Request("https://vorschau.creaid-media.de/api/contact.php",
        data=json.dumps(payload,ensure_ascii=False).encode("utf-8"),method="POST",
        headers={"Origin":"https://vorschau.creaid-media.de","Content-Type":"application/json",
                 "Accept":"application/json","Cache-Control":"no-store","User-Agent":"CreAid contact internal acceptance test"})
    opener=build_opener(p.NoRedirect(),HTTPSHandler(context=ssl.create_default_context()))
    with opener.open(req,timeout=35) as r:
        require(r.status==200 and r.headers.get("Content-Type","").startswith("application/json"),"Unexpected test endpoint response.")
        result=json.loads(r.read(2048))
        require(result=={"ok":True,"status":"accepted"},"SMTP acceptance not confirmed.")
def main():
    password=os.environ.get("CONTACT_SMTP_PASSWORD","")
    require(bool(password),"SMTP secret missing.")
    marker=p.read_marker()
    pairs=[(scheme,host) for host in p.hosts for scheme in ("http","https")]
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        rows=list(pool.map(lambda pair:p.probe(pair,marker),pairs))
    require(not any(row[3]=="EXPOSED" for row in rows),"Private marker publicly exposed.")
    expected_root_hosts={"creaid-media.com","www.creaid-media.com","creaidmedia.de","www.creaidmedia.de"}
    require(all(any(row[0]=="http" and row[1]==host and row[3]=="DENIED" for row in rows) for host in expected_root_hosts),"Root-mapped aliases did not explicitly deny the private marker.")
    require(all(row[3] in {"NOT_FOUND","DENIED"} for row in rows if row[1]=="vorschau.creaid-media.de"),"Preview exposes unexpected marker response.")
    print("Known webspace-root aliases deny private access; preview cannot serve marker. Other unreachable hosts remain unverified.",flush=True)
    client=paramiko.SSHClient()
    client.set_missing_host_key_policy(u.PinnedIONOSKey())
    try:
        client.connect(os.environ["SFTP_HOST"].strip(),port=22,username=os.environ["SFTP_USERNAME"],password=os.environ["SFTP_PASSWORD"],look_for_keys=False,allow_agent=False,timeout=20,banner_timeout=20,auth_timeout=20)
        with client.open_sftp() as s:
            s.get_channel().settimeout(60)
            u.enter_preview(s)
            require(stat.S_ISREG(s.lstat("api/contact.php").st_mode),"Public endpoint missing.")
            require(stat.S_ISDIR(s.lstat(PRIVATE).st_mode),"Invalid private directory.")
            s.chdir(PRIVATE)
            require(stat.S_ISREG(s.lstat(".htaccess").st_mode),"Private denial file missing.")
            with s.open(".htaccess","rb") as f:require(f.read(1024).strip()==b"Require all denied","Private deny rule differs.")
            require(stat.S_ISREG(s.lstat("config.php").st_mode),"Private config missing or unsafe.")
            require(stat.S_ISREG(s.lstat("core.php").st_mode) and stat.S_ISREG(s.lstat("vendor/autoload.php").st_mode),"Backend incomplete.")
            original_mode=stat.S_IMODE(s.lstat("config.php").st_mode)
            with s.open("config.php","rb") as f:original=f.read(16385)
            require(len(original)<=16384 and normalized(original)==normalized(DISABLED),"Config not the expected disabled template. No changes made.")
            data=config_bytes(password)
            installed=False
            try:
                replace_config(s,data);installed=True
                print("Private SMTP config installed atomically with mode 0600 and direct-script guard; no secret values logged.",flush=True)
                one_test()
                print("CONTACT_SMTP_ACCEPTED: one internal test message accepted by SMTP. No customer messages sent.",flush=True)
            except Exception as e:
                if installed:
                    replace_config(s,original,original_mode)
                    print("Original disabled configuration restored. Test delivery not confirmed; do not retry automatically.",flush=True)
                print("Provisioning or acceptance failed: "+type(e).__name__,flush=True)
                return 1
    finally:client.close()
    return 0
if __name__=="__main__":
    try:raise SystemExit(main())
    except Exception as e:
        print("Precondition or rollback failure: "+type(e).__name__)
        raise SystemExit(1)
