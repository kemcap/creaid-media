/* Deterministic cache-busting of a fully built and image-optimized preview.
   Same optimized source tree -> same URLs across both hosts.
   Do not run on source files; run once after static validation, before host-specific rewriting. */
import {createHash} from 'node:crypto';
import {existsSync,readdirSync,readFileSync,writeFileSync,statSync} from 'node:fs';
import {resolve,join,relative,dirname,extname,sep} from 'node:path';
const root=resolve(process.argv[2]||'dist'), assets=join(root,'assets');
if(!existsSync(join(root,'index.html'))||!existsSync(assets))throw Error('Build first');
function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):e.isFile()?[join(dir,e.name)]:[]);}
const files=walk(assets).sort((a,b)=>a<b?-1:a>b?1:0);
const tag='cmv';
const hash=createHash('sha256');
for(const f of files){
 const bytes=readFileSync(f);
 hash.update(relative(assets,f).split(sep).join('/')+'\0'+bytes.length+'\0');hash.update(bytes);
}
const version=hash.digest('hex').slice(0,20);
const local=(raw,from)=>{
 if(!raw||raw.startsWith('//')||/^[a-z]+:/i.test(raw)||raw.startsWith('#'))return raw;
 const [path,fragment]=raw.split('#',2), [pathname,query]=path.split('?',2);
 if(query&&new URLSearchParams(query).has(tag))throw Error('Already fingerprinted: '+raw);
 const target=pathname.startsWith('/assets/')?resolve(root,'.'+pathname):pathname.startsWith('/')?null:resolve(dirname(from),pathname);
 if(!target||!target.startsWith(assets+sep)||!existsSync(target)||!statSync(target).isFile())return raw;
 return path+(query?'&':'?')+tag+'='+version+(fragment===undefined?'':'#'+fragment);
};
let refs=0;
function rewrite(raw,file){const next=local(raw,file);if(next!==raw)refs++;return next;}
const htmlFiles=readdirSync(root).filter(f=>f.endsWith('.html')).map(f=>join(root,f));
for(const file of htmlFiles){
 let s=readFileSync(file,'utf8');
 s=s.replace(/(\b(?:src|href|poster|data-src)=)(["'])(\/assets\/[^"']+)\2/g,(_,a,q,url)=>a+q+rewrite(url,file)+q);
 s=s.replace(/(\bsrcset=)(["'])([^"']+)\2/g,(_,a,q,values)=>a+q+values.split(',').map(v=>v.replace(/^(\s*)(\/assets\/[^\s,]+)(.*)$/,(m,space,url,end)=>space+rewrite(url,file)+end)).join(',')+q);
 writeFileSync(file,s);
}
for(const file of files){
 const ext=extname(file);if(!['.css','.js'].includes(ext)||file.startsWith(join(assets,'vendor')+sep))continue;
 let s=readFileSync(file,'utf8'),out=s;
 if(ext==='.css')out=out.replace(/url\(\s*(["']?)([^"'()\s]+)\1\s*\)/g,(m,q,url)=>{const v=rewrite(url,file);return v===url?m:'url('+q+v+q+')';});
 if(ext==='.js')out=out.replace(/(["'])(\/assets\/[A-Za-z0-9_./-]+(?:\?[^"']*)?)\1/g,(_,q,url)=>q+rewrite(url,file)+q);
 if(s!==out)writeFileSync(file,out);
}
if(!refs)throw Error('No asset references fingerprinted');
console.log('ASSET_FINGERPRINT '+JSON.stringify({version,assets:files.length,pages:htmlFiles.length,references:refs}));
