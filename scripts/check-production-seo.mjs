import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {routeFiles,redirects} from './routes.mjs';
const origin='https://creaid-media.de';
const read=p=>readFileSync(p,'utf8');
const candidate=read('docs/sitemap-kandidat-nach-freigabe.xml');
const posts=JSON.parse(read('src/_data/postsIndex.json'));
const indexable=new Set([...candidate.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>new URL(m[1]).pathname).concat(posts.map(p=>p.url)));
const aliases=new Map(redirects);
const legacy=JSON.parse(read('docs/seo/legacy-sitemap-paths.json')).paths;
const expected=[...indexable].map(p=>origin+p).sort();
const notice='Designvorschau · Nicht die veröffentlichte Unternehmenswebsite';
function checkPage(html,path,strict=true){
 assert.ok(html.includes('rel="canonical" href="'+origin+path+'"'),'Canonical: '+path);
 const policy=indexable.has(path)?'index,follow':'noindex,nofollow,noarchive';
 assert.ok(html.includes('name="robots" content="'+policy+'"'),'Robots: '+path);
 if(strict){
  assert.ok(!html.includes(notice),'Preview label: '+path);
  assert.ok(html.includes('<span data-creaid-preview-notice hidden></span>'),'Production marker: '+path);
  const footer=html.match(/<footer class="cm-footer"[\s\S]*?<\/footer>/)?.[0]||'';
  assert.ok(footer&&!/href="\/leistungen\/(?:webdesign|marketing|branding|ki-automatisierung)"/.test(footer),'Noncanonical footer: '+path);
 }
}
function checkSitemap(xml){
 const urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]).sort();
 assert.deepEqual(urls,expected,'Production sitemap URL set');
}
function checkRobots(txt){
 assert.match(txt,/^Sitemap: https:\/\/creaid-media\.de\/sitemap\.xml\s*$/m);
 assert.ok(!/^Disallow:\s*\/\s*$/m.test(txt),'Global robots block');
}
assert.equal(legacy.length,87);
assert.equal(new Set(legacy).size,legacy.length);
for(const p of legacy)assert.ok(Object.hasOwn(routeFiles,p)||Object.hasOwn(routeFiles,aliases.get(p)), 'Unmapped old URL: '+p);
if(process.argv.includes('--live')||process.argv.includes('--baseline')){
 const strict=!process.argv.includes('--baseline');
 const request=async(url)=>fetch(url,{redirect:'manual',headers:{'User-Agent':'CreAid-SEO-QA/1.0'},signal:AbortSignal.timeout(20000)});
 const errors=[];
 const jobs=[];
 const job=(name,fn)=>jobs.push(async()=>{try{await fn()}catch(e){errors.push(name+': '+e.message)}});
 job('robots',async()=>{const r=await request(origin+'/robots.txt');assert.equal(r.status,200);checkRobots(await r.text())});
 job('sitemap',async()=>{const r=await request(origin+'/sitemap.xml');assert.equal(r.status,200);checkSitemap(await r.text())});
 for(const path of Object.keys(routeFiles))job(path,async()=>{
   const r=await request(origin+path);assert.equal(r.status,200);
   if(indexable.has(path))assert.ok(!/noindex/i.test(r.headers.get('x-robots-tag')||''),'Unexpected X-Robots-Tag');
   checkPage(await r.text(),path,strict);
 });
 for(const p of ['/cookie-richtlinie','/cookie-richtlinie/',...['webdesign','marketing','branding','ki-automatisierung'].map(s=>'/leistungen/'+s)])job('redirect '+p,async()=>{
   const r=await request(origin+p+'?qa=1');assert.equal(r.status,301);
   const u=new URL(r.headers.get('location'),origin);assert.equal(u.origin,origin);assert.equal(u.pathname,aliases.get(p));assert.equal(u.search,'?qa=1');
 });
 job('contact parameters',async()=>{const r=await request(origin+'/kontakt?service=Webdesign');assert.equal(r.status,200);checkPage(await r.text(),'/kontakt',strict)});
 job('preview host',async()=>{
   const r=await request('https://vorschau.creaid-media.de/');
   if([401,403].includes(r.status))return;
   if([301,308].includes(r.status)){const u=new URL(r.headers.get('location'),'https://vorschau.creaid-media.de/');assert.equal(u.origin,origin);return}
   assert.equal(r.status,200);
   const html=await r.text();assert.ok(/noindex/i.test(r.headers.get('x-robots-tag')||'')||/name="robots" content="[^"]*noindex/.test(html),'Preview is indexable');
 });
 // Conservative concurrency; no POST or changes to public services.
 for(let i=0;i<jobs.length;i+=4)await Promise.all(jobs.slice(i,i+4).map(f=>f()));
 console.log(JSON.stringify({checks:jobs.length,canonicalRoutes:Object.keys(routeFiles).length,historicalMappings:legacy.length,errors},null,2));
 assert.equal(errors.length,0,'Live SEO verification failed');
}else{
 for(const dir of ['dist','preview-cache-package/site']){
   for(const [p,file] of Object.entries(routeFiles))checkPage(read(join(dir,file)),p);
   checkSitemap(read(join(dir,'sitemap.xml')));checkRobots(read(join(dir,'robots.txt')));
   const rules=read(join(dir,'.htaccess'));
   assert.ok(rules.includes("expr=%{HTTP_HOST} != 'creaid-media.de'"),'Missing non-production header protection');
 }
 console.log('Production candidate SEO checks passed: '+Object.keys(routeFiles).length+' routes, '+expected.length+' sitemap URLs, '+legacy.length+' historical mappings, both build modes.');
}
