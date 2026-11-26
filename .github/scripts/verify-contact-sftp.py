"""Read-only connection verification; never read the private configuration or credentials."""
import importlib.util
import os
import stat
from pathlib import Path
import paramiko
spec=importlib.util.spec_from_file_location("preview_uploader",Path(__file__).with_name("upload-ionos.py"))
u=importlib.util.module_from_spec(spec)
spec.loader.exec_module(u)
def main():
    names=("SFTP_HOST","SFTP_USERNAME","SFTP_PASSWORD","SFTP_PORT")
    missing=[k for k in names if not os.environ.get(k)]
    if missing:
        print("Missing GitHub secret names: "+", ".join(missing))
        return 1
    host=os.environ[names[0]].strip()
    user=os.environ[names[1]]
    if not host.endswith(".webspace-data.io") or os.environ[names[3]]!="22" or user!=u.EXPECTED_USER:
        print("Connection settings do not match the confirmed IONOS SFTP account.")
        return 1
    client=paramiko.SSHClient()
    client.set_missing_host_key_policy(u.PinnedIONOSKey())
    try:
        client.connect(host,port=22,username=user,password=os.environ[names[2]],look_for_keys=False,allow_agent=False,timeout=20,banner_timeout=20,auth_timeout=20)
        with client.open_sftp() as s:
            s.get_channel().settimeout(30)
            u.enter_preview(s)
            print("PREVIEW_TARGET_VERIFIED: /creaid-v11 ownership marker confirmed.")
            target="/creaid-contact-private"
            if not stat.S_ISDIR(s.lstat(target).st_mode):
                print("Private backend path is not a real directory.")
                return 1
            s.chdir(target)
            if s.normalize(".")!=s.normalize(target):
                print("Unexpected private backend directory.")
                return 1
            entries={a.filename:a for a in s.listdir_attr(".")}
            if {"wp-admin","wp-content","wp-includes","wp-config.php","creaid-v11","clickandbuilds","index.html"}.intersection(entries):
                print("Unexpected website files in login root. No changes made.")
                return 1
            print("SFTP login successful.")
            ok=True
            for name in (".htaccess","core.php","config.example.php","config.php","zugriffstest.txt","vendor"):
                found=name in entries and (stat.S_ISDIR(entries[name].st_mode) if name=="vendor" else stat.S_ISREG(entries[name].st_mode))
                print(name+": "+("present" if found else "missing or unexpected type"))
                if name!="zugriffstest.txt":ok=ok and found
            if not ok:return 1
            with s.open(".htaccess","rb") as f:
                if f.read(1024).strip()!=b"Require all denied":
                    print("Access protection directive differs from expected.")
                    return 1
            if not stat.S_ISREG(s.lstat("vendor/autoload.php").st_mode):
                print("Composer autoloader missing or unsafe.")
                return 1
            print("PRIVATE_SFTP_VERIFIED: expected files present; deny directive confirmed on disk. No configuration or passwords read, no writes.")
            return 0
    except Exception as e:
        print("Connection or validation failed: "+type(e).__name__)
        return 1
    finally:client.close()
if __name__=="__main__":raise SystemExit(main())
