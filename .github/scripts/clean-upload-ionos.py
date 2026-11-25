"""Stage a complete verified preview, quarantine the old website, and switch without deleting unrelated files."""
import hashlib
import json
import os
import posixpath
import re
import stat
import uuid
from pathlib import Path
import paramiko
from importlib.util import spec_from_file_location, module_from_spec
from publish_cached_preview import FINGERPRINT, checked_rules
from preview_cache_activation import verify_public, MAX_FILE

spec=spec_from_file_location("existing_uploader",Path(__file__).with_name("upload-ionos.py"))
u=module_from_spec(spec)
spec.loader.exec_module(u)
require=u.require
DENY=b"Require all denied\n"
def digest(f):
    h=hashlib.sha256()
    while True:
        chunk=f.read(262144)
        if not chunk:break
        h.update(chunk)
    return h.hexdigest()
def main():
    host=os.environ["SFTP_HOST"].strip()
    user=os.environ["SFTP_USERNAME"]
    password=os.environ["SFTP_PASSWORD"]
    require(user==u.EXPECTED_USER and host.endswith(".webspace-data.io") and os.environ["SFTP_PORT"]=="22" and bool(password),"Unexpected dedicated SFTP connection.")
    cached=os.environ.get("CREAID_PREVIEW_CACHE_MODE","normal")=="auto"
    dist=Path("preview-cache-package/site" if cached else "dist")
    checked_rules((dist/".htaccess").read_bytes())
    manifest=json.loads(Path("ionos-deploy-manifest.json").read_text())
    pages=set(manifest["pages"])
    require("index.html" in pages and all(re.fullmatch(r"[a-z0-9-]+\.html",p) for p in pages),"Invalid page manifest.")
    top=pages|{"robots.txt","assets"}
    files=[]
    for p in (dist/"assets").rglob("*"):
        require(not p.is_symlink(),"Local symlink refused.")
        if p.is_dir():continue
        require(p.is_file() and p.suffix.lower() in u.ASSET_SUFFIXES,"Unexpected asset.")
        files.append(p)
    files.extend(dist/name for name in sorted(pages|{"robots.txt",".htaccess"}))
    for p in files:require(p.is_file() and not p.is_symlink(),"Missing local file.")
    client=paramiko.SSHClient()
    client.set_missing_host_key_policy(u.PinnedIONOSKey())
    token=uuid.uuid4().hex
    stage=".creaid-stage-"+token
    backup=".creaid-backup-"+token
    try:
        client.connect(host,port=22,username=user,password=password,look_for_keys=False,allow_agent=False,timeout=20,banner_timeout=20,auth_timeout=20)
        with client.open_sftp() as s:
            s.get_channel().settimeout(120)
            root=s.normalize(".")
            require(root=="/" or root.rstrip("/").endswith("/creaid-v11"),"Wrong SFTP directory.")
            initial={a.filename:a for a in s.listdir_attr(".")}
            require(not any(n in initial for n in ("wp-admin","wp-content","wp-includes","wp-config.php")),"WordPress detected. No changes.")
            require(u.OWNER_FILE in initial and stat.S_ISREG(initial[u.OWNER_FILE].st_mode),"Existing preview ownership marker required.")
            with s.open(u.OWNER_FILE,"rb") as f:require(f.read(len(u.OWNER)+1)==u.OWNER,"Incorrect preview owner.")
            require(".htaccess" in initial and stat.S_ISREG(initial[".htaccess"].st_mode),"Existing preview Apache file required.")
            old=[]
            for name,a in initial.items():
                if name in (u.OWNER_FILE,".htaccess"):continue
                if re.fullmatch(r"\.creaid-(?:stage|backup)-[a-f0-9]{32}",name) and stat.S_ISDIR(a.st_mode):
                    with s.open(name+"/.htaccess","rb") as f:require(f.read(len(DENY)+1)==DENY,"Unprotected prior backup. Stop.")
                    continue
                require(name in top or re.fullmatch(r"[a-z0-9-]+\.html",name),"Unknown root file; refusing to touch: "+name)
                require(stat.S_ISDIR(a.st_mode) if name=="assets" else stat.S_ISREG(a.st_mode),"Unsafe existing path: "+name)
                old.append(name)
            previous_hashes=[]
            def audit_assets(path):
                for a in s.listdir_attr(path):
                    require(a.filename not in (".","..") and "/" not in a.filename,"Unsafe asset entry.")
                    p=path+"/"+a.filename
                    if stat.S_ISDIR(a.st_mode):audit_assets(p)
                    else:
                        require(stat.S_ISREG(a.st_mode) and Path(a.filename).suffix.lower() in u.ASSET_SUFFIXES,"Unrecognized existing asset: "+p)
                        if FINGERPRINT.search(p):previous_hashes.append(p)
            if "assets" in old:audit_assets("assets")
            # Both private folders are protected before any files enter them.
            for d in (stage,backup):
                s.mkdir(d)
                with s.open(d+"/.htaccess","wb") as f:f.write(DENY)
            with s.open(".htaccess","rb") as f:old_config=f.read()
            checked_rules(old_config)
            with s.open(backup+"/previous-root-config","wb") as f:f.write(old_config)
            dirs={stage}
            def ensure_dir(p):
                if p in dirs:return
                ensure_dir(posixpath.dirname(p))
                s.mkdir(p);dirs.add(p)
            for local in sorted(files):
                rel=local.relative_to(dist).as_posix()
                remote=stage+("/new-root-config" if rel==".htaccess" else "/"+rel)
                ensure_dir(posixpath.dirname(remote))
                s.put(str(local),remote,confirm=True)
                require(s.lstat(remote).st_size==local.stat().st_size,"Stage size mismatch: "+rel)
            # Retain old immutable URLs across the clean assets-tree replacement.
            # Never restore unrelated or obsolete unversioned resources.
            local_paths={p.relative_to(dist).as_posix() for p in files}
            retained=0
            for path in previous_hashes:
                expected=FINGERPRINT.search(path).group(1)
                attrs=s.lstat(path)
                require(stat.S_ISREG(attrs.st_mode) and attrs.st_size<=MAX_FILE,"Unsafe old fingerprint.")
                if path in local_paths:
                    with s.open(path,"rb") as f:require(digest(f)==expected,"Existing fingerprint differs: "+path)
                    continue
                remote=stage+"/"+path
                ensure_dir(posixpath.dirname(remote))
                h=hashlib.sha256()
                with s.open(path,"rb") as src,s.open(remote,"wx") as dest:
                    while True:
                        chunk=src.read(262144)
                        if not chunk:break
                        h.update(chunk);dest.write(chunk)
                require(h.hexdigest()==expected and s.lstat(remote).st_size==attrs.st_size,"Retired fingerprint integrity mismatch: "+path)
                with s.open(remote,"rb") as f:require(digest(f)==expected,"Staged retired fingerprint differs.")
                retained+=1
            print(f"All {len(files)} fresh files staged and size verified; {retained} retired hashes retained. Old website has not yet been changed.",flush=True)
            # Switch only known site roots; quarantine all obsolete HTML and the entire old assets tree.
            moved=[];installed=[];config_replaced=False
            try:
                for name in sorted(set(old)|top,key=lambda n:(n=="index.html",n)):
                    if name in old:
                        s.rename(name,backup+"/"+name);moved.append(name)
                    if name in top:
                        s.rename(stage+"/"+name,name);installed.append(name)
                s.posix_rename(stage+"/new-root-config",".htaccess")
                config_replaced=True
                for local in files:
                    rel=local.relative_to(dist).as_posix()
                    require(s.lstat(rel).st_size==local.stat().st_size,"Live remote size mismatch: "+rel)
                # Old-only pages are absent from the live document root.
                remaining={a.filename for a in s.listdir_attr(".")}
                require(not (set(old)-top)&remaining,"Obsolete website file still active.")
                if cached:
                    sample=next((p for p in files if FINGERPRINT.search(p.name)),None)
                    require(sample is not None,"No fingerprint to verify.")
                    verify_public("enabled",(dist/"index.html").read_bytes(),("/"+sample.relative_to(dist).as_posix(),sample.read_bytes()))
            except Exception:
                print("Switch failed; restoring previous website.",flush=True)
                if config_replaced:
                    s.posix_rename(backup+"/previous-root-config",".htaccess")
                for name in reversed(installed):s.rename(name,stage+"/"+name)
                for name in reversed(moved):s.rename(backup+"/"+name,name)
                raise
            s.remove(stage+"/.htaccess")
            s.rmdir(stage)
            print(f"CLEAN_REDEPLOY_SUCCESS: {len(files)} fresh files, {len(pages)} pages, old site quarantined in protected backup; no unrelated files touched.",flush=True)
            print("Backup directory: "+backup,flush=True)
    finally:client.close()
if __name__=="__main__":main()
