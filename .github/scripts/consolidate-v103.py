"""Deterministic, reviewable V10.3 integration; never publishes or modifies main."""
import json, pathlib, re, subprocess
from pathlib import Path
MAIN="86c95b144341d259d75155b3e67bc04a0812285a"
V102="f30fd12242d21760a55ccede4c9cf328507584b8"
PERF="a35a3367d7987faaa0eda4f0603b9c34255c9d3d"
def git(*args): return subprocess.check_output(["git",*args],text=True)
def read(ref,path): return git("show",ref+":"+path)
def data(ref,path): return json.loads(read(ref,path))
def write(path,content):
 p=Path(path);p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content,encoding="utf-8")
def save(path,obj):write(path,json.dumps(obj,ensure_ascii=False,indent=2)+"\n")
def restore(ref,path):write(path,read(ref,path))
def listfiles(ref,prefix):return git("ls-tree","-r","--name-only",ref,prefix).splitlines()
def remove(path):Path(path).unlink(missing_ok=True)
rpath="src/_data/routes.json"; apath="src/_data/aliases.json"; mpath="src/_data/pages.json"
old=data(MAIN,rpath);new=data(V102,rpath);aliases=data(V102,apath);oldaliases=data(MAIN,apath)
canon=set(new.values())
def resolve(s):
 seen=set()
 while s not in canon and s in aliases and s not in seen:
  seen.add(s);s=aliases[s]
 return s if s in canon else None
for k,v in old.items():
 target=new.get(k) or resolve(v)
 if not target:raise ValueError("No V10.2 destination for "+k+" "+v)
 for source in (v,v.rstrip("/")+"/","/"+k,"/"+k+".html"):
  if source not in canon:aliases.setdefault(source,target)
for source,target in oldaliases.items():
 dest=resolve(target)
 if dest and source not in canon:aliases.setdefault(source,dest)
aliases={k:resolve(v) for k,v in aliases.items() if k not in canon}
assert all(aliases.values()),"Unresolved alias destination"
def remap(s):
 # Only complete literal URL paths, not CSS selectors or path prefixes.
 pat=r'(?P<base>https://creaid-media\.de)?(?P<path>/[a-z0-9][a-z0-9/_\-.]*)(?=[?#"\'\s<>,]|$)'
 def sub(m):
  p=m["path"]; d=aliases.get(p)
  return (m["base"] or "")+d if d else m[0]
 return re.sub(pat,sub,s)
# V10.2 provides canonical architecture and structural data, not its older global shell.
for path in listfiles(V102,"src/_data"):
 if pathlib.PurePosixPath(path).name in {"routes.json","aliases.json","pages.json","site.json"}:continue
 if pathlib.PurePosixPath(path).name in {"services.json","serviceGroups.json","serviceDetailPages.js","journalCategories.json","postsIndex.json","pillars.json","editorialLinks.json"}:
  restore(V102,path)
save(rpath,new);save(apath,aliases)
services=data(V102,"src/_data/services.json")
meta=data(V102,mpath);mainmeta=data(MAIN,mpath)
plans=data(MAIN,"src/_data/headingPlan.json")
mainfiles=set(listfiles(MAIN,"src/pages")+listfiles(MAIN,"src/posts"))
# Preserve the newer bespoke industry pages and their visual treatment where available.
for k in ("webdesign-aerzte","webdesign-immobilienmakler","animation"):
 if "src/pages/"+k+".njk" in mainfiles:services[k]["generated"]=False
save("src/_data/services.json",services)
# Remove only source templates retired by the V10.2 route map.
for path in mainfiles:
 if Path(path).stem not in new and path.endswith((".njk",".md")):remove(path)
for path in listfiles(V102,"src/_includes/partials"):
 if Path(path).name in ("journal-categories.njk","service-breadcrumbs.njk","service-children.njk","service-faq.njk","service-links.njk"):restore(V102,path)
for path in ("src/pages/service-detail.njk","src/pages/journal-category.njk","src/pages/leistungen.njk"):
 restore(V102,path)
# Keep the V10.2 service index; other existing main templates retain the newer visual work.
selected={}
for key in new:
 generated=services.get(key,{}).get("generated",False) or key.startswith("journal-")
 candidates=["src/pages/"+key+".njk","src/posts/"+key+".njk","src/posts/"+key+".md"]
 if generated:
  for p in candidates:remove(p)
  selected[key]="v10.2 generated"
  continue
 if key=="leistungen":
  selected[key]="v10.2 service index";continue
 mainpath=next((p for p in candidates if p in mainfiles),None)
 if mainpath and mainmeta.get(key,{}).get("isPost")==meta[key].get("isPost"):
  selected[key]="main enhanced"
  main=mainmeta[key]
  # Keep the V10.2 URL and its new content taxonomy; retain main's compatible visual metadata.
  for field in ("extraHead","bodyAttrs","themeColor"):
   if field in main:meta[key][field]=main[field]
  for field in ("title","description","structuredData"):
   if field in main:meta[key][field]=main[field]
  s=read(MAIN,mainpath)
  if key in services:
   block='{% set service = services[pageKey] %}<div class="cm-v103-structure">{% include "partials/service-breadcrumbs.njk" %}{% include "partials/service-links.njk" %}{% include "partials/service-faq.njk" %}</div>'
   assert "</main>" in s,key
   s=s.replace("</main>","<!-- V103-STRUCTURE -->"+block+"</main>",1)
  if key=="blog":
   s,n=re.subn(r'<nav class="cm-archive-links"[\s\S]*?</nav>','{% include "partials/journal-categories.njk" %}',s,count=1)
   if not n:s=s.replace("</main>",'{% include "partials/journal-categories.njk" %}</main>',1)
  write(mainpath,remap(s))
 else:
  for p in candidates:
   try:restore(V102,p);selected[key]="v10.2 template";break
   except subprocess.CalledProcessError:continue
  else:raise ValueError("Missing template "+key)
for k,p in meta.items():
 p["canonical"]="https://creaid-media.de"+new[k];p["robots"]="noindex,nofollow,noarchive"
 if p.get("structuredData"):p["structuredData"]=remap(p["structuredData"])
save(mpath,meta)
# Updated taxonomy, links and shared global navigation.
site=data(MAIN,"src/_data/site.json")
site["navigation"]=data(V102,"src/_data/site.json")["navigation"]
site["specialtyServices"]=[{"label":v["label"],"href":new[k],"pageKey":k} for k,v in services.items() if k not in ("webdesign","marketing","branding","ki-automatisierung")]
for it in site["footerServices"]:
 if it.get("pageKey") in new:it["href"]=new[it["pageKey"]]
save("src/_data/site.json",site)
for path in ("src/_data/serviceDepth.json","src/_data/legacySitemapCoverage.json"):
 obj=data(MAIN,path)
 if isinstance(obj,dict):obj={k:v for k,v in obj.items() if k in new and selected.get(k)=="main enhanced"}
 else:
  for row in obj:
   target=resolve(row["target"]) or resolve(row["url"])
   if not target:raise ValueError("Unmapped original sitemap URL "+row["url"])
   row["target"]=target
 save(path,obj)
# The old page-specific plans only apply to unchanged enhanced templates, not newly generated pages.
save("src/_data/headingPlan.json",{k:v for k,v in plans.items() if selected.get(k)=="main enhanced" and k!="blog"})
p="scripts/heading-semantics.mjs";s=read(MAIN,p)
s=s.replace("let section=main[0].replace(", "const marker='<!-- V103-STRUCTURE -->'; const [core,addition]=main[0].split(marker); let section=core.replace(")
s=s.replace("return html.replace(main[0],section);","return html.replace(main[0],section+(addition===undefined?'':marker+addition));")
write(p,s)
# Copy only the later V10.2-specific CSS tail, retaining all of main's shared fixes.
base=read("8fc08390c4c05a6700340f695fb5a5ba9c90dd1c","public/assets/audit.css")
v=read(V102,"public/assets/audit.css")
main=read(MAIN,"public/assets/audit.css")
if v.startswith(base):extra=v[len(base):]
else:
 # Explicitly preserve V10.2 rules by extracting added lines from the branch diff.
 diff=git("diff","8fc08390c4c05a6700340f695fb5a5ba9c90dd1c",V102,"--","public/assets/audit.css")
 extra="\n".join(l[1:] for l in diff.splitlines() if l.startswith("+") and not l.startswith("+++"))
write("public/assets/audit.css",main+"\n/* V10.2 structural additions */\n"+extra+"\n")
restore(PERF,"public/assets/home-motion-v5.js")
# Remap links in existing partials/data, not route definitions themselves.
for p in Path("src/_includes").rglob("*.njk"):write(str(p),remap(p.read_text()))
for p in Path("src/_data").glob("*.json"):
 if p.name not in ("routes.json","aliases.json","pages.json","legacySitemapCoverage.json"):
  write(str(p),remap(p.read_text()))
# Generated pages use shared header/footer via main's existing wrappers.
# Apache needs explicit root substitutions for nested URL routes (V10.2 IONOS fix).
p=".github/scripts/prepare-ionos.mjs";s=read(MAIN,p)
s=s.replace("'DirectoryIndex index.html'","'Options -MultiViews','DirectoryIndex index.html'").replace("'RewriteEngine On'","'RewriteEngine On','RewriteBase /'")
s=s.replace("'$ '+file+' [END]'","'$ /'+file+' [END]'")
write(p,s)
pkg=data(MAIN,"package.json");pkg["version"]="10.3.0";pkg["description"]="CreAid-Media V10.3 – konsolidierte Leistungsstruktur und UX-Stabilisierung"
pkg["scripts"]["test:structure"]="node scripts/check-v103-structure.mjs"
save("package.json",pkg)
lock=data(MAIN,"package-lock.json");lock["version"]="10.3.0";lock["packages"][""]["version"]="10.3.0";save("package-lock.json",lock)
# Browser assertions keep the same functional coverage; route names follow V10.2.
p="scripts/check-browser.mjs";s=remap(read(MAIN,p))
s=s.replace("p.locator('.j-card:visible').count()>0","p.locator('.audit-panel:visible').count()>0")
s=s.replace("const representative=[","const representative=[")
write(p,s)
# Keep the old regression script as a historical test; replace outdated route/count assumptions
# with V10.3-specific checks without declaring new visual differences to be regressions.
p="scripts/check-v103-structure.mjs"
write(p,r"""import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {routeFiles,redirects} from './routes.mjs';
const load=p=>readFileSync(p,'utf8');
const data=n=>JSON.parse(load('src/_data/'+n+'.json'));
const routes=data('routes'),pages=data('pages'),services=data('services'),categories=data('journalCategories');
assert.equal(Object.keys(routes).length,76);assert.equal(Object.keys(services).length,24);
assert.equal(Object.keys(categories).length,4);assert.equal(data('postsIndex').length,38);
assert.equal(readdirSync('dist').filter(f=>f.endsWith('.html')).length,76);
const names=new Set(),descriptions=new Set();
for(const [key,url] of Object.entries(routes)){
 const p=pages[key],h=load('dist/'+key+'.html');
 assert.ok(p.title&&p.description&&!names.has(p.title)&&!descriptions.has(p.description),'Duplicate/missing metadata: '+key);
 names.add(p.title);descriptions.add(p.description);
 assert.equal(p.canonical,'https://creaid-media.de'+url);
 assert.equal(p.robots,'noindex,nofollow,noarchive');
 for(const id of ['cm-global-header','cm-global-footer'])assert.equal((h.match(new RegExp('id="'+id+'"','g'))||[]).length,1,key+' '+id);
 assert.equal((h.match(/<h1\b/g)||[]).length,1,key+' H1 count');
 assert.ok(h.includes('/assets/global-shell.css')&&h.includes('/assets/ux-phase1.css')&&h.includes('/assets/adaptive-scroll.js'),key+' shared assets');
 if(p.structuredData)JSON.parse(p.structuredData);
 for(const tag of h.matchAll(/<(?:script|img|iframe|video|audio|source)\b[^>]*\bsrc=["']([^"']+)/gi))assert.ok(!/^(?:https?:)?\/\//i.test(tag[1]),key+' external resource');
}
for(const [k,v] of Object.entries(services)){
 const h=load('dist/'+k+'.html');
 assert.ok(h.includes('Häufige Fragen'),k+' missing FAQ');
 for(const child of v.children||[])assert.ok(h.includes('href="'+routes[child]+'"'),k+' missing child '+child);
}
const blog=load('dist/blog.html');
for(const k of Object.keys(categories))assert.ok(blog.includes('href="'+routes[k]+'"'),k+' missing journal navigation');
const index=load('dist/index.html');
assert.equal((index.match(/class="cm-hero-ticker__group"/g)||[]).length,2);
assert.ok(index.includes('class="axes"')&&index.includes('href="/kontakt#anfrage">Projekt besprechen'));
assert.ok(load('dist/assets/journal.js').includes("const tocLinks=$$('.j-toc"));
assert.ok(load('dist/impressum.html').includes('ENTWURF'));
assert.ok(!load('dist/assets/legal-pages.js').includes('localStorage.setItem'));
const alias=new Map(redirects);
for(const row of data('legacySitemapCoverage'))assert.ok(row.url===row.target||alias.get(row.url)===row.target,'Legacy URL missing '+row.url);
for(const [from,to] of redirects){assert.ok(!Object.hasOwn(routeFiles,from)&&Object.hasOwn(routeFiles,to),'Redirect conflict '+from);}
console.log('PASS: 76 pages, 24 services, 4 journal categories, 38 articles, shell, metadata, FAQ and legacy URLs.');
""")
save("docs/v10.3-integration-map.json",{"base":MAIN,"structure":V102,"performance":PERF,"templates":selected,"canonicalPages":len(new),"services":len(services)})
write("docs/V10.3-INTEGRATION.md","# V10.3 Integrationskandidat\n\nV10.2 URL- und Leistungsstruktur; bewährte main-Templates und gemeinsame UI-Assets; spätere Pointer-Optimierung. Bewusst neue URLs und zusammengeführte Archive. Keine Produktionsfreigabe; rechtliche Entwürfe und noindex bleiben. Die Integration ist erst nach den tatsächlichen Build- und Browserprüfungen validiert.\n")
print("Prepared integration map for",len(new),"canonical pages.")
