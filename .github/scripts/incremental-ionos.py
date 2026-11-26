"""Incremental IONOS preview deployment. No deletion of live content or PHP changes.
The protected state accelerates subsequent runs; a missing/changed state entry is
verified against actual bytes. Only the dedicated preview is writable.
"""
import concurrent.futures
import hashlib
import json
import os
import posixpath
import re
import stat
from time import perf_counter
import uuid
from pathlib import Path
from urllib.request import Request,build_opener,HTTPRedirectHandler
from urllib.error import HTTPError
from urllib.parse import quote

STATE='.creaid-deploy-state.json'
ORIGIN='https://vorschau.creaid-media.de'
MAX_STATE=2*1024*1024
CACHE_MARKERS=(b'BEGIN CREAID PERFORMANCE ENGINE',b'BEGIN CREAID PREVIEW HOST CACHE')
FINGERPRINTED_ASSET=re.compile(r'\.sha256-[a-f0-9]{64}\.(?:css|js|mjs|webp|avif|png|jpg|jpeg|gif|svg|woff2|woff|ico)$')
class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):return None
def require(ok,msg):
    if not ok:raise RuntimeError(msg)
def cache_enabled(rules):
    engine,hosting=(marker in rules for marker in CACHE_MARKERS)
    require(engine==hosting,'Incomplete preview cache policy; no changes.')
    return engine
def sha(data):return hashlib.sha256(data).hexdigest()
def safe_path(path):
    require(isinstance(path,str) and not path.startswith('/') and all(p not in ('','.','..') and not p.startswith('.') for p in path.split('/')),'Invalid managed path.')
    require(path in ('robots.txt','index.html') or re.fullmatch(r'[a-z0-9-]+\.html',path) or path.startswith('assets/'),'Unmanaged path.')
    return path
def fingerprint(a):
    return {'size':a.st_size,'mtime':a.st_mtime}
def state_matches(row,attrs,digest):
    return isinstance(row,dict) and row.get('sha256')==digest and row.get('size')==attrs.st_size and row.get('mtime')==attrs.st_mtime
def read(sftp,path,limit=None):
    a=sftp.lstat(path)
    require(stat.S_ISREG(a.st_mode),'Unsafe remote file: '+path)
    if limit is not None:require(a.st_size<=limit,'Remote file too large: '+path)
    with sftp.open(path,'rb') as f:
        if a.st_size>32768:
            try:f.prefetch(a.st_size, max_concurrent_requests=32)
            except TypeError:f.prefetch(a.st_size)
        data=f.read(a.st_size+1)
    require(len(data)==a.st_size,'Remote file changed during read: '+path)
    return data
def load_state(sftp,root):
    if STATE not in root:return {}
    require(stat.S_ISREG(root[STATE].st_mode),'Unsafe deployment state.')
    try:
        obj=json.loads(read(sftp,STATE,MAX_STATE))
        if obj.get('version')==1 and isinstance(obj.get('files'),dict):return obj['files']
    except (ValueError,AttributeError):pass
    return {}
def get(url):
    req=Request(url,headers={'Accept-Encoding':'identity','Cache-Control':'no-cache','User-Agent':'CreAid-Incremental-Verification/1.0'})
    try:r=build_opener(NoRedirect).open(req,timeout=25)
    except HTTPError as e:r=e
    with r:return r.status,r.headers,r.read()
def public_path(path,route_urls):
    return route_urls.get(path,'/'+quote(path,safe='/-_.~'))
def public_matches(path,digest,route_urls):
    try:
        code,headers,body=get(ORIGIN+public_path(path,route_urls))
        return code==200 and 'noindex' in headers.get('X-Robots-Tag','').lower() and sha(body)==digest
    except Exception:return False
def verify_cache_policy(expected):
    asset=next((name for name in expected if name.startswith('assets/') and FINGERPRINTED_ASSET.search(name)),None)
    require(asset is not None,'Missing fingerprinted preview asset.')
    code,headers,body=get(ORIGIN+public_path(asset,{}))
    policy={part.strip().lower() for part in headers.get('Cache-Control','').split(',')}
    require(code==200 and sha(body)==sha(expected[asset].read_bytes()) and 'noindex' in headers.get('X-Robots-Tag','').lower()
            and {'private','max-age=3600','immutable'}<=policy and not {'no-store','public'}&policy,
            'Preview fingerprint or private cache policy verification failed.')
    code,headers,_=get(ORIGIN+'/')
    require(code==200 and 'no-store' in headers.get('Cache-Control','').lower(),'Preview HTML lost no-store.')
def ensure_dirs(sftp,relative,dirs):
    if relative in dirs:return
    ensure_dirs(sftp,posixpath.dirname(relative) or '.',dirs)
    try:a=sftp.lstat(relative)
    except FileNotFoundError:sftp.mkdir(relative);a=sftp.lstat(relative)
    require(stat.S_ISDIR(a.st_mode),'Unsafe remote directory: '+relative)
    dirs.add(relative)
def put(sftp,path,data,exists,mode=None):
    temp=posixpath.join(posixpath.dirname(path),'.creaid-upload-'+uuid.uuid4().hex)
    renamed=False
    try:
        with sftp.open(temp,'wx') as f:
            if mode is not None:sftp.chmod(temp,mode)
            if hasattr(f,'set_pipelined'):f.set_pipelined(True)
            f.write(data);f.flush()
        require(sha(read(sftp,temp))==sha(data),'Temporary upload content differs: '+path)
        if exists:sftp.posix_rename(temp,path)
        else:sftp.rename(temp,path)
        renamed=True
        require(sha(read(sftp,path))==sha(data),'Installed bytes differ: '+path)
    finally:
        if not renamed:
            try:sftp.remove(temp)
            except OSError:pass
def deploy(sftp,files,dist,manifest,mode='apply'):
    started=perf_counter()
    require(mode in ('apply','audit'),'Invalid incremental mode.')
    expected={p.relative_to(dist).as_posix():p for p in files}
    for rel in expected:
        if rel!='.htaccess':safe_path(rel)
    require('kontakt.html' in expected and 'assets/agency-pages.js' in expected,'Contact files missing.')
    # Keep the deployed spam protection intact even if an old build is selected.
    require(b'data-sitekey="0x4AAAAAAGUfI4b2efonPTdb"' in expected['kontakt.html'].read_bytes() and b'turnstile_token' in expected['assets/agency-pages.js'].read_bytes(),'Build would remove Turnstile.')
    root={a.filename:a for a in sftp.listdir_attr('.')}
    require(not any(x in root for x in ('wp-admin','wp-content','wp-includes','wp-config.php')),'WordPress detected.')
    require('api' in root and stat.S_ISDIR(root['api'].st_mode),'Contact API directory missing.')
    api=sftp.listdir_attr('api')
    require(len(api)==1 and api[0].filename=='contact.php' and stat.S_ISREG(api[0].st_mode),'Unexpected API contents.')
    old_pages={n for n in root if re.fullmatch(r'[a-z0-9-]+\.html',n)}
    require(not old_pages-set(manifest['pages']),'Obsolete HTML routes: explicit clean release required.')
    rules=read(sftp,'.htaccess',1024*1024)
    cached=cache_enabled(rules)
    require(cached==cache_enabled(expected['.htaccess'].read_bytes()),'Candidate would change the active preview cache mode; no changes.')
    require(rules.startswith(b'# Generated from scripts/routes.mjs; preview only') and b'AuthType' not in rules and b'AuthUserFile' not in rules,'Unexpected existing routing policy; no changes.')
    rows={}
    dirs={'.'}
    parents={posixpath.dirname(p) or '.' for p in expected}
    for parent in list(parents):
        while parent!='.':
            parent=posixpath.dirname(parent) or '.';parents.add(parent)
    for parent in sorted(parents,key=lambda p:(p.count('/'),p)):
        if parent=='.':listing=root
        else:
            ancestor=posixpath.dirname(parent) or '.'
            if ancestor not in dirs:continue
            a=rows.get(parent)
            if a is None:continue
            require(stat.S_ISDIR(a.st_mode),'Unsafe remote asset directory: '+parent)
            dirs.add(parent)
            listing={a.filename:a for a in sftp.listdir_attr(parent)}
        for name,a in listing.items():rows[posixpath.join(parent,name) if parent!='.' else name]=a
    prior=load_state(sftp,root)
    digests={rel:sha(p.read_bytes()) for rel,p in expected.items()}
    # Always verify security-critical files against actual bytes.
    critical={'.htaccess','kontakt.html','assets/agency-pages.js','datenschutz.html','index.html'}
    route_data=json.loads(Path('src/_data/routes.json').read_text())
    route_urls={k+'.html':v for k,v in route_data.items()}
    changed=[];uncertain=[];trusted=0
    for rel,p in expected.items():
        a=rows.get(rel)
        if a is None:changed.append(rel);continue
        require(stat.S_ISREG(a.st_mode),'Unsafe managed target: '+rel)
        if a.st_size!=p.stat().st_size:changed.append(rel);continue
        if rel=='.htaccess':
            if sha(rules)!=digests[rel]:changed.append(rel)
        elif rel not in critical and state_matches(prior.get(rel),a,digests[rel]):
            trusted+=1
        else:uncertain.append(rel)
    # First-run bootstrap reads existing served bytes in parallel, not a full SFTP re-upload.
    # SFTP is the fallback for non-served files or any uncertain/mismatching HTTPS result.
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        checks=dict(zip(uncertain,pool.map(lambda p:public_matches(p,digests[p],route_urls),uncertain)))
    for rel in uncertain:
        if not checks[rel] and sha(read(sftp,rel))!=digests[rel]:changed.append(rel)
    immutable_assets={rel for rel in expected if cached and rel.startswith('assets/') and FINGERPRINTED_ASSET.search(rel)}
    require(not immutable_assets.intersection(rows,changed),'Existing fingerprint differs; no changes.')
    changed.sort(key=lambda p:(2 if p=='.htaccess' else 1 if p.endswith('.html') else 0,p=='index.html',p))
    total_bytes=sum(expected[p].stat().st_size for p in expected)
    changed_bytes=sum(expected[p].stat().st_size for p in changed)
    summary={'totalFiles':len(expected),'changedFiles':len(changed),'unchangedFiles':len(expected)-len(changed),'manifestFastPath':trusted,'totalBytes':total_bytes,'uploadBytes':changed_bytes,'mode':mode}
    print('INCREMENTAL_PLAN '+json.dumps(summary),flush=True)
    for p in changed:print('CHANGED '+p,flush=True)
    if mode=='audit' and changed:
        raise RuntimeError('Audit found differences; no site files modified.')
    # Protect manifest before ever storing it; current routing denies dot-prefixed deployment files.
    if STATE in root:
        code,_,_=get(ORIGIN+'/'+STATE)
        require(code==403,'Deployment state not denied over HTTPS.')
    backup={}
    applied=[]
    verified_new_assets=set()
    planning_done=perf_counter()
    try:
        for rel in changed:
            path=expected[rel]
            ensure_dirs(sftp,posixpath.dirname(rel) or '.',dirs)
            a=rows.get(rel)
            backup[rel]=(read(sftp,rel),stat.S_IMODE(a.st_mode)) if a is not None else None
            applied.append(rel)
            put(sftp,rel,path.read_bytes(),a is not None,backup[rel][1] if a is not None else 0o644)
            if rel in immutable_assets:verified_new_assets.add(rel)
        writes_done=perf_counter()
        # Check every changed public URL plus security-critical contact/home/privacy files.
        verify_paths=set(changed).union(critical)-{'.htaccess'}
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            results=list(pool.map(lambda p:(p,public_matches(p,digests[p],route_urls)),sorted(verify_paths)))
        require(all(ok for _,ok in results),'HTTPS mismatch: '+', '.join(p for p,ok in results if not ok))
        if cached:verify_cache_policy(expected)
        code,headers,body=get(ORIGIN+'/api/contact.php')
        require(code==405 and json.loads(body)=={'ok':False,'status':'method'} and 'no-store' in headers.get('Cache-Control',''),'Contact endpoint or cache policy changed.')
        if changed:
            for rel in changed:rows[rel]=sftp.lstat(rel)
        current={p:{**fingerprint(rows[p]),'sha256':digests[p]} for p in expected}
        state=json.dumps({'version':1,'files':current},sort_keys=True,separators=(',',':')).encode()
        require(len(state)<MAX_STATE,'State too large.')
        if STATE not in root or current!=prior:
            put(sftp,STATE,state,STATE in root,0o600)
        code,_,_=get(ORIGIN+'/'+STATE)
        require(code==403,'Deployment state not denied.')
    except Exception:
        for rel in reversed(applied):
            old=backup[rel]
            if rel in verified_new_assets:continue
            if old is None:
                try:sftp.remove(rel)
                except FileNotFoundError:pass
            else:put(sftp,rel,old[0],True,old[1])
        print('INCREMENTAL_ROLLBACK_COMPLETE',flush=True)
        raise
    print('INCREMENTAL_TIMING '+json.dumps({'planningSeconds':round(planning_done-started,2),'writeSeconds':round(writes_done-planning_done,2),'verificationSeconds':round(perf_counter()-writes_done,2),'totalSeconds':round(perf_counter()-started,2)}),flush=True)
    print('INCREMENTAL_SUCCESS '+json.dumps({**summary,'httpsVerified':True,'contactEndpointPreserved':True,'previewCacheEnabled':cached,'productionChanged':False}),flush=True)
