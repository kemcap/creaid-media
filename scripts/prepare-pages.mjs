/* Build a GitHub Pages-only output. The normal Eleventy dist/ stays untouched.
   GitHub Pages project sites live under /creaid-media/, not the origin root. */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { routeFiles, redirects } from './routes.mjs';

const project = 'creaid-media';
const base = '/' + project;
const origin = 'https://kemcap.github.io';
const output = '_site';
const source = 'dist';
if (!existsSync(join(source,'index.html'))) throw new Error('Build dist/ first');
rmSync(output,{recursive:true,force:true});
cpSync(source,output,{recursive:true});

const routes = new Set(Object.keys(routeFiles).map(s=>s.replace(/\/$/,'')));
for(const [from] of redirects) routes.add(from.replace(/\/$/,''));
const files = new Set(readdirSync(source).filter(s=>s.endsWith('.html')));
const shouldPrefix = path =>
  path.startsWith('assets/') || path === 'robots.txt' ||
  files.has(path) || routes.has('/'+path.replace(/\/$/,''));

function prefixQuotedUrls(text){
  // Only rewrite known internal routes and assets; leave regex literals and external URLs alone.
  text=text.replace(/(['"\x60])\/(?!\/)([A-Za-z0-9_.-][A-Za-z0-9_./-]*)(?=[?#'"\x60])/g,(whole,quote,path)=>
    shouldPrefix(path) ? quote+base+'/'+path : whole);
  // Standalone slash and slash-hash links.
  text=text.replace(/(['"\x60])\/(?=['"\x60#])/g,(_,quote)=>quote+base+'/');
  return text;
}

function rewrite(text,extension){
  if(extension==='.html'){
    // HTML links and image references, including query strings and fragment-only roots.
    text=text.replace(/\b(href|src|poster|action|data-src)=(["'])\/(?!\/)/g,
      (_,attr,quote)=>attr+'='+quote+base+'/');
    text=text.replace(/\bsrcset=(["'])([^"']*)\1/g,(_,quote,value)=>{
      const rewritten=value.replace(/(^|,\s*)\/(?!\/)/g,(m,lead)=>lead+base+'/');
      return 'srcset='+quote+rewritten+quote;
    });
    // Rewrite metadata only; editorial links to the existing production site stay intact.
    const previewUrl = value => {
      if(typeof value!=='string'||!value.startsWith('https://creaid-media.de'))return value;
      const url = new URL(value);
      if(url.hostname!=='creaid-media.de')return value;
      const path=url.pathname;
      return origin+base+path+(routeFiles[path]&&!path.endsWith('/')?'/':'')+url.search+url.hash;
    };
    text=text.replace(/(<link\b[^>]*\brel="canonical"[^>]*\bhref=")([^"]+)(")/g,(_,a,url,b)=>a+previewUrl(url)+b);
    text=text.replace(/(<meta\b[^>]*\bproperty="og:(?:url|image)"[^>]*\bcontent=")([^"]+)(")/g,(_,a,url,b)=>a+previewUrl(url)+b);
    const previewSchema = value => Array.isArray(value) ? value.map(previewSchema) :
      value && typeof value==='object' ? Object.fromEntries(Object.entries(value).map(([k,v])=>[k,previewSchema(v)])) : previewUrl(value);
    text=text.replace(/(<script\b[^>]*type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/g,
      (_,a,json,b)=>a+JSON.stringify(previewSchema(JSON.parse(json))).replace(/</g,'\\u003c')+b);
    text=text.replace(/(<meta\b[^>]*name="robots"[^>]*content=")[^"]*(")/g,'$1noindex,nofollow,noarchive$2');
  }
  if(extension==='.css'){
    text=text.replace(/url\(\s*(["']?)\/(?!\/)(?=[A-Za-z0-9_.-])/g,
      (_,quote)=>'url('+quote+base+'/');
  }
  return prefixQuotedUrls(text);
}

function walk(dir){
  for(const entry of readdirSync(dir,{withFileTypes:true})){
    const path=join(dir,entry.name);
    if(entry.isDirectory()){
      if(relative(output,path)==='assets/vendor')continue;
      walk(path);
    }else if(entry.isFile()){
      const extension=extname(path);
      if(!['.html','.css','.js'].includes(extension))continue;
      const original=readFileSync(path,'utf8');
      const adjusted=rewrite(original,extension);
      if(original!==adjusted)writeFileSync(path,adjusted,'utf8');
    }
  }
}
walk(output);
function save(path,text){mkdirSync(dirname(path),{recursive:true});writeFileSync(path,text,'utf8')}
function alias(from,to){
  if(from==='/'||from.endsWith('.html'))return;
  const relativeFrom=from.replace(/^\/|\/$/g,'');
  if(!relativeFrom || relativeFrom.includes('..'))throw new Error('Invalid route '+from);
  const index=join(output,relativeFrom,'index.html');
  if(existsSync(index))return;
  const target=base+to+(to.endsWith('/')?'':'/');
  const safe=target.replaceAll('&','&amp;').replaceAll('"','&quot;');
  save(index,'<!doctype html><html lang="de"><head><meta charset="utf-8">'+
    '<meta name="robots" content="noindex,nofollow"><meta http-equiv="refresh" content="0;url='+safe+'">'+
    '<title>Weiterleitung · CreAid-Media</title></head><body><a href="'+safe+'">Zur Vorschau</a></body></html>');
}
for(const [route,file] of Object.entries(routeFiles)){
  if(route==='/')continue;
  if(!files.has(file))throw new Error('Route references missing source '+file);
  const page=join(output,route.slice(1),'index.html');
  save(page,readFileSync(join(output,file),'utf8'));
}
for(const [from,to] of redirects){
  if(from.endsWith('.html'))continue;
  alias(from,to);
}
save(join(output,'robots.txt'),'User-agent: *\nDisallow:\n');
save(join(output,'.nojekyll'),'');
save(join(output,'404.html'),'<!doctype html><html lang="de"><meta charset="utf-8">'+
 '<meta name="robots" content="noindex,nofollow"><title>CreAid-Media Vorschau</title>'+
 '<body><h1>Seite nicht gefunden</h1><p><a href="'+base+'/">Zur Startseite</a></p></body></html>');

const home=readFileSync(join(output,'index.html'),'utf8');
const sample=readFileSync(join(output,'webdesign','index.html'),'utf8');
for(const [ok,why] of [
 [home.includes('href="'+base+'/assets/'),'Homepage styles must use project path'],
 [home.includes('src="'+base+'/assets/'),'Homepage scripts must use project path'],
 [home.includes('href="'+base+'/kontakt"'),'Links must stay inside project site'],
 [sample.includes('href="'+base+'/assets/'),'Service page styles must use project path'],
 [existsSync(join(output,'leistungen','webdesign','index.html')),'Service aliases must exist'],
 [existsSync(join(output,'creaid-blog','index.html')),'Journal clean URL must exist'],
 [existsSync(join(output,'assets','home-motion-v5.js')),'Source JS is missing'],
 [readFileSync(join(output,'assets','scrollstory.js'),'utf8').includes(base+'/assets/vendor/gsap.min.js'),
   'Lazy GSAP script URL must use project path']
])if(!ok)throw new Error(why);
console.log('Pages preview staged: '+files.size+' HTML files, '+Object.keys(routeFiles).length+
 ' clean URLs, assets and redirect routes at '+origin+base+'/');

for(const file of files){
  const html=readFileSync(join(output,file),'utf8');
  if(!html.includes('name="robots" content="noindex,nofollow,noarchive"'))throw new Error('Preview index guard missing: '+file);
  const canon=html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  const og=html.match(/<meta property="og:url" content="([^"]+)"/)?.[1];
  const image=html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
  if(!canon?.startsWith(origin+base+'/')||canon!==og||!image?.startsWith(origin+base+'/assets/'))throw new Error('Preview metadata inconsistent: '+file);
  if(!existsSync(join(output,decodeURIComponent(new URL(image).pathname.slice(base.length+1)))))throw new Error('Share image missing: '+file);
  for(const m of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)){
    JSON.parse(m[1]);
    if(m[1].includes('https://creaid-media.de/'))throw new Error('Production schema URL leaked: '+file);
  }
}
console.log('PASS: Preview canonical, Open Graph, structured data, local image targets and noindex guard for '+files.size+' pages.');
