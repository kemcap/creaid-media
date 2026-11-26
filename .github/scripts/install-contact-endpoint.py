"""Install only the public contact endpoint in the confirmed dedicated preview."""
import hashlib
import importlib.util
import json
import os
import stat
import uuid
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError
import paramiko

spec=importlib.util.spec_from_file_location("preview_uploader",Path(__file__).with_name("upload-ionos.py"))
u=importlib.util.module_from_spec(spec)
spec.loader.exec_module(u)
require=u.require
source=Path("backend/contact-public/contact.php")
data=source.read_bytes()
require(data.startswith(b"<?php") and len(data)<16384,"Unexpected public endpoint.")
require(os.environ["SFTP_USERNAME"]==u.EXPECTED_USER and os.environ["SFTP_PORT"]=="22" and os.environ["SFTP_HOST"].strip().endswith(".webspace-data.io") and bool(os.environ["SFTP_PASSWORD"]),"Unexpected SFTP connection.")
def probe():
    url="https://vorschau.creaid-media.de/api/contact.php"
    # Both probes are guaranteed not to send an email: GET, and POST without Origin.
    # Even if someone has already enabled the private config, absent Origin fails closed.
    for method,body,expected in [("GET",None,{405: "method"}),("POST",b"{}",{403:"origin",503:"unavailable"})]:
        req=Request(url,data=body,method=method,headers={"User-Agent":"CreAid contact endpoint verification","Cache-Control":"no-cache","Content-Type":"application/json"})
        try:
            with urlopen(req,timeout=25) as resp:
                code=resp.status; content=resp.read(2048);ctype=resp.headers.get("Content-Type","")
        except HTTPError as exc:
            code=exc.code;content=exc.read(2048);ctype=exc.headers.get("Content-Type","")
        require(code in expected and ctype.startswith("application/json"),"Unexpected endpoint HTTP response: "+str(code))
        obj=json.loads(content)
        require(obj=={"ok":False,"status":expected[code]},"Unexpected endpoint response.")
        print(method,code,expected[code],flush=True)
client=paramiko.SSHClient()
client.set_missing_host_key_policy(u.PinnedIONOSKey())
try:
    client.connect(os.environ["SFTP_HOST"].strip(),port=22,username=os.environ["SFTP_USERNAME"],password=os.environ["SFTP_PASSWORD"],look_for_keys=False,allow_agent=False,timeout=20,banner_timeout=20,auth_timeout=20)
    with client.open_sftp() as s:
        root=s.normalize(".")
        require(root=="/" or root.rstrip("/").endswith("/creaid-v11"),"Unexpected preview root.")
        initial={a.filename:a for a in s.listdir_attr(".")}
        require(not {"wp-admin","wp-content","wp-includes","wp-config.php"}.intersection(initial),"WordPress detected.")
        require(u.OWNER_FILE in initial and stat.S_ISREG(initial[u.OWNER_FILE].st_mode),"Preview marker missing.")
        with s.open(u.OWNER_FILE,"rb") as f:require(f.read(len(u.OWNER)+1)==u.OWNER,"Wrong preview marker.")
        created_dir=False
        created_file=False
        temp="api/.creaid-upload-"+uuid.uuid4().hex
        try:
            if "api" not in initial:
                s.mkdir("api");created_dir=True
            require(stat.S_ISDIR(s.lstat("api").st_mode),"Unsafe API path.")
            entries=s.listdir_attr("api")
            require(all(a.filename=="contact.php" and stat.S_ISREG(a.st_mode) for a in entries),"Unknown API contents.")
            if entries:
                with s.open("api/contact.php","rb") as f:require(f.read(len(data)+1)==data,"Existing endpoint differs; refusing overwrite.")
            else:
                s.put(str(source),temp,confirm=True)
                s.rename(temp,"api/contact.php");created_file=True
            with s.open("api/contact.php","rb") as f:require(f.read(len(data)+1)==data,"Remote endpoint byte mismatch.")
            probe()
            print("CONTACT_ENDPOINT_INSTALLED: public PHP endpoint verified; no mail sent, no private configuration changed.",flush=True)
        except Exception:
            try:s.remove(temp)
            except OSError:pass
            if created_file:s.remove("api/contact.php")
            if created_dir:s.rmdir("api")
            raise
finally:client.close()
