import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync,statSync} from 'node:fs';
import {routeFiles,redirects} from './routes.mjs';
const read=p=>readFileSync(p,'utf8');
const data=JSON.parse(read('src/_data/pages.json'));
const aliases=new Map(redirects);
const routes=new Map(Object.entries(routeFiles));
const load=key=>read('dist/'+key);
const htmlByRoute=new Map([...routes].map(([url,file])=>[url,load(file)]));
const assets=readdirSync('public/assets').filter(f=>/\.(?:css|js)$/.test(f));
for(const name of assets)assert.equal(load('assets/'+name),read('public/assets/'+name),'Build modified source asset '+name);
assert.equal(routes.size,Object.keys(data).length,'Route/metadata coverage mismatch');
let linkCount=0,assetCount=0;
const issues=[];
for(const [url,html] of htmlByRoute){
 const key=routes.get(url).replace(/\.html$/,'');
 const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
 if(new Set(ids).size!==ids.length)issues.push(url+': duplicate IDs');
 if(!html.includes('rel="canonical" href="https://creaid-media.de'+url+'"'))issues.push(url+': canonical mismatch');
 if(!html.includes('name="robots" content="noindex,nofollow,noarchive"'))issues.push(url+': preview indexation');
 for(const match of html.matchAll(/<(?:img|script|link|source)\b[^>]*>/gi)){
  const loc=match[0].match(/\b(?:src|href)="(\/assets\/[^"#?]+)"/i)?.[1];
  if(loc){assetCount++;if(!existsSync('dist'+loc))issues.push(url+': missing asset '+loc);}
  if(/^<img\b/i.test(match[0])&&!/\balt=/.test(match[0]))issues.push(url+': img without alt');
 }
 for(const m of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/gi)){
  const href=m[1].replaceAll('&amp;','&');
  if(!href.startsWith('/')&&!href.startsWith('#'))continue;
  if(href.startsWith('//')||href==='#')continue;
  const target=new URL(href,'https://creaid-media.de'+url);
  if(target.pathname.startsWith('/assets/'))continue;
  const path=aliases.get(target.pathname)||target.pathname;
  linkCount++;
  const dest=htmlByRoute.get(path);
  if(!dest){issues.push(url+': unresolved internal link '+href);continue;}
  if(target.hash){let id;try{id=decodeURIComponent(target.hash.slice(1));}catch{id=target.hash.slice(1);}
    if(![...dest.matchAll(/\sid="([^"]+)"/g)].some(m=>m[1]===id))issues.push(url+': unresolved anchor '+href);
  }
 }
}
const report={pages:routes.size,assets:assetCount,internalLinks:linkCount,sourceAssets:assets.length,cssBytes:assets.filter(f=>f.endsWith('.css')).reduce((n,f)=>n+statSync('dist/assets/'+f).size,0),jsBytes:assets.filter(f=>f.endsWith('.js')).reduce((n,f)=>n+statSync('dist/assets/'+f).size,0),issues:[...new Set(issues)]};
console.log(JSON.stringify(report,null,2));
assert.equal(report.issues.length,0,'Quality gate: unresolved page issues');
