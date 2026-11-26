"""Check that the existing harmless private-directory marker is not served publicly.
Do not read config.php, change files, send mail, or print response bodies."""
import concurrent.futures
import importlib.util
import os
import ssl
from pathlib import Path
from urllib.request import Request, build_opener, HTTPRedirectHandler, HTTPSHandler
from urllib.error import HTTPError
import paramiko

spec=importlib.util.spec_from_file_location("uploader",Path(__file__).with_name("upload-ionos.py"))
u=importlib.util.module_from_spec(spec)
spec.loader.exec_module(u)
hosts=("creaid-media.com","www.creaid-media.com","creaidmedia.de","www.creaidmedia.de",
       "creaidmedia0231.live-website.com","creaid-media.de","www.creaid-media.de","vorschau.creaid-media.de")
class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self,req,fp,code,msg,headers,newurl):
        return None

def read_marker():
    u.require(os.environ["SFTP_USERNAME"]==u.EXPECTED_USER and os.environ["SFTP_PORT"]=="22" and os.environ["SFTP_HOST"].strip().endswith(".webspace-data.io"),"Unexpected SFTP connection.")
    client=paramiko.SSHClient()
    client.set_missing_host_key_policy(u.PinnedIONOSKey())
    try:
        client.connect(os.environ["SFTP_HOST"].strip(),port=22,username=os.environ["SFTP_USERNAME"],password=os.environ["SFTP_PASSWORD"],look_for_keys=False,allow_agent=False,timeout=20,banner_timeout=20,auth_timeout=20)
        with client.open_sftp() as s:
            u.enter_preview(s)
            import stat
            private="/creaid-contact-private"
            u.require(stat.S_ISDIR(s.lstat(private).st_mode),"Invalid private directory.")
            s.chdir(private)
            for name in (".htaccess","zugriffstest.txt"):
                u.require(stat.S_ISREG(s.lstat(name).st_mode),"Expected regular file missing.")
            with s.open(".htaccess","rb") as f:u.require(f.read(1024).strip()==b"Require all denied","Private deny rule differs.")
            with s.open("zugriffstest.txt","rb") as f:marker=f.read(4097).strip()
            u.require(0<len(marker)<=4096,"Unexpected empty or oversized harmless test marker.")
            return marker
    finally:client.close()

def probe(pair,marker):
    scheme,host=pair
    url=scheme+"://"+host+"/creaid-contact-private/zugriffstest.txt"
    # An invalid certificate is not an access control. Probe only a harmless marker,
    # no auth, cookies or secrets; never use this TLS context for actual SFTP or SMTP.
    opener=build_opener(NoRedirect(),HTTPSHandler(context=ssl._create_unverified_context()))
    req=Request(url,headers={"User-Agent":"CreAid private marker verification","Cache-Control":"no-cache","Accept-Encoding":"identity"})
    try:
        try:
            with opener.open(req,timeout=10) as r:
                code=r.status;body=r.read(65536);location=r.headers.get("Location","")
        except HTTPError as e:
            code=e.code;body=e.read(65536);location=e.headers.get("Location","")
        if body.strip()==marker or (len(marker)>=12 and marker in body):
            status="EXPOSED"
        elif code in (401,403):status="DENIED"
        elif code in (404,410):status="NOT_FOUND"
        elif 300<=code<400:status="REDIRECT"
        else:status="INCONCLUSIVE"
        return (scheme,host,code,status)
    except Exception as e:
        return (scheme,host,None,"UNREACHABLE:"+type(e).__name__)

if __name__=="__main__":
    marker=read_marker()
    print("Private .htaccess deny rule and existing harmless marker verified over SFTP.")
    pairs=[(scheme,host) for host in hosts for scheme in ("http","https")]
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        rows=list(pool.map(lambda pair:probe(pair,marker),pairs))
    for scheme,host,code,status in rows:
        print(f"{scheme}://{host}: {code or '-'} {status}")
    if any(row[3]=="EXPOSED" for row in rows):
        raise SystemExit("PRIVATE_MARKER_EXPOSED: do not provision credentials.")
    if not any(row[3]=="DENIED" for row in rows):
        raise SystemExit("PRIVATE_MARKER_INCONCLUSIVE: no explicit public denial observed; no credentials provisioned.")
    print("PRIVATE_MARKER_NOT_OBSERVED: explicit denial observed on at least one tested URL. Review remaining inconclusive hosts before provisioning.")
