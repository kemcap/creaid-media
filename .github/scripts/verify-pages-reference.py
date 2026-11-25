"""Compare complete rendered HTML and served asset bytes without changing either live site."""
import concurrent.futures
import hashlib
import json
import os
import re
import time
import urllib.request
from pathlib import Path
from urllib.parse import quote, urlsplit

root=Path(os.environ["REFERENCE_DIR"])
is_ionos=os.environ.get("VERIFY_IONOS")=="true"
origin="https://vorschau.creaid-media.de" if is_ionos else "https://kemcap.github.io/creaid-media"
routes=json.loads((root/"src/_data/routes.json").read_text())
cached=is_ionos and os.environ.get("CREAID_PREVIEW_CACHE_MODE")=="auto"
staged=root/("preview-cache-package/site" if cached else "dist" if is_ionos else "_site")
expected={}
for key,route in routes.items():
    if is_ionos:
        local=staged/(key+".html")
        url=route
    else:
        local=staged/route.lstrip("/")/"index.html"
        url=route if route.endswith("/") else route+"/"
    expected[url]=local
# The complete served asset tree, including CSS, JS, fonts, all images and lazy-load resources.
for f in (staged/"assets").rglob("*"):
    if f.is_file() and f.suffix.lower() not in {".txt"}:
        expected["/"+f.relative_to(staged).as_posix()]=f
def compare(item):
    path,local=item
    data=local.read_bytes()
    digest=hashlib.sha256(data).hexdigest()
    url=origin+quote(path,safe="/-_.~")
    for attempt in range(3):
        try:
            req=urllib.request.Request(url,headers={"User-Agent":"CreAid-Media approved preview verification","Accept-Encoding":"identity","Cache-Control":"no-cache"})
            with urllib.request.urlopen(req,timeout=25) as res:
                body=res.read()
                actual=hashlib.sha256(body).hexdigest()
                policy=res.headers.get("Cache-Control","").lower()
                robots=res.headers.get("X-Robots-Tag","").lower()
                policy_ok=True
                if cached:
                    fingerprinted=bool(re.search(r"\.sha256-[0-9a-f]{64}\.[a-z0-9]+$",path)) and path.startswith("/assets/")
                    policy_ok="noindex" in robots and (("private" in policy and "max-age=3600" in policy and "immutable" in policy and "no-store" not in policy) if fingerprinted else "no-store" in policy)
                return {"path":path,"status":res.status,"expected":digest,"actual":actual,"expected_bytes":len(data),"actual_bytes":len(body),"cache_control":policy,"cache_policy_ok":policy_ok,"equal":res.status==200 and digest==actual and policy_ok}
        except Exception as e:
            if attempt==2:return {"path":path,"error":str(e),"equal":False}
            time.sleep(attempt+1)
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    rows=list(pool.map(compare,expected.items()))
failures=[r for r in rows if not r["equal"]]
summary={"reference_sha":os.environ["REFERENCE_SHA"],"reference_run":os.environ["REFERENCE_RUN"],"origin":origin,"pages":len(routes),"assets":len(expected)-len(routes),"verified":len(rows)-len(failures),"failures":failures}
Path("ionos-reference-verification.json" if is_ionos else "pages-reference-verification.json").write_text(json.dumps({"summary":summary,"files":rows},indent=2))
print(json.dumps(summary,indent=2))
if failures:
    raise SystemExit("Reference mismatch: "+str(len(failures))+" files. "+("IONOS upload requires investigation." if is_ionos else "No upload performed."))
print("All "+str(len(rows))+" canonical pages and assets match exactly.")
