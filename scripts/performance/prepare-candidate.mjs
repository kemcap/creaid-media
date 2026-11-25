// CreAid Performance Engine: isolated asset fingerprinting and dry-run report.
// Never edits source build or deployment configuration. Node 22, no dependencies.
import { createHash } from 'node:crypto';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { existsSync, lstatSync, readdirSync, readFileSync, mkdirSync, cpSync, writeFileSync } from 'node:fs';
import { resolve, relative, dirname, extname, basename, join, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const types = new Set(['.css','.js','.mjs','.webp','.avif','.png','.jpg','.jpeg','.gif','.svg','.woff2','.woff','.ico']);
const compressible = new Set(['.html','.css','.js','.mjs','.svg','.json']);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const posix = value => value.split(sep).join('/');
const inside = (parent, child) => { const r=relative(parent,child);return r===''||(!r.startsWith('..'+sep)&&r!=='..'&&!r.startsWith(sep)); };
const hashedName = (name, sha) => name.slice(0,-extname(name).length)+'.sha256-'+sha+extname(name);
function files(root) {
  const out=[];
  for(const ent of readdirSync(root,{withFileTypes:true})){
    const p=join(root,ent.name);
    if(ent.isSymbolicLink())throw Error('Symlinks are not allowed: '+p);
    if(ent.isDirectory())out.push(...files(p));
    else if(ent.isFile())out.push(p);
  }
  return out.sort();
}
export function cachePolicy(profile='preview') {
  const preview = '# Preview: retain no-store everywhere. Existing X-Robots-Tag rules remain unchanged.\n<IfModule mod_headers.c>\nHeader onsuccess unset Cache-Control\nHeader always set Cache-Control "no-store, no-cache, must-revalidate, max-age=0"\n</IfModule>\n';
  if(profile==='preview')return preview;
  if(profile!=='production-candidate')throw Error('Unknown cache profile');
  return '# Production candidate only; replace old Cache-Control rules after explicit release approval.\n<IfModule mod_headers.c>\nHeader onsuccess unset Cache-Control\nHeader always set Cache-Control "no-store, no-cache, must-revalidate, max-age=0"\n<FilesMatch "\\.html$">\nHeader always set Cache-Control "no-cache"\n</FilesMatch>\n<FilesMatch "\\.sha256-[0-9a-f]{64}\\.(css|js|mjs|webp|avif|png|jpg|jpeg|gif|svg|woff2|woff|ico)$">\nHeader always set Cache-Control "public, max-age=31536000, immutable"\n</FilesMatch>\n</IfModule>\n';
}
export function prepareCandidate({source,output}) {
  source=resolve(source);output=resolve(output);
  if(!existsSync(join(source,'index.html'))||!existsSync(join(source,'assets')))throw Error('Expected an Eleventy root build');
  if(lstatSync(source).isSymbolicLink()||inside(source,output)||inside(output,source)||existsSync(output))throw Error('Use a new isolated output directory outside source');
  const original=files(source); // validates symlinks before copying
  for(const p of original){
    const existing=basename(p).match(/\.sha256-([0-9a-f]{64})\./);
    if(existing&&digest(readFileSync(p))!==existing[1])throw Error('Invalid existing fingerprint: '+p);
  }
  mkdirSync(output,{recursive:true});
  const staged=join(output,'site');
  cpSync(source,staged,{recursive:true,errorOnExist:true,force:false});
  const manifest=new Map();
  function fingerprint(url){
    const m=url.match(/^(\/assets\/[A-Za-z0-9._/-]+)([?#][^\s"'<>]*)?$/);
    if(!m||m[1].split('/').some(part=>part==='..'||part==='.')||!types.has(extname(m[1])))return url;
    const p=resolve(source,'.'+m[1]);
    if(!inside(join(source,'assets'),p)||!existsSync(p)||!lstatSync(p).isFile())throw Error('Missing asset: '+url);
    if(!manifest.has(m[1])){
      const bytes=readFileSync(p),sha=digest(bytes),name=hashedName(m[1],sha),dest=resolve(staged,'.'+name);
      if(!inside(join(staged,'assets'),dest))throw Error('Unsafe destination');
      mkdirSync(dirname(dest),{recursive:true});
      if(existsSync(dest)&&digest(readFileSync(dest))!==sha)throw Error('Fingerprint collision: '+dest);
      if(!existsSync(dest))writeFileSync(dest,bytes,{flag:'wx'});
      manifest.set(m[1],{original:m[1],fingerprinted:name,sha256:sha,bytes:bytes.length});
    }
    return manifest.get(m[1]).fingerprinted+(m[2]||'');
  }
  let pages=0;
  for(const path of original.filter(p=>extname(p)==='.html')){
    const html=readFileSync(path,'utf8');
    // Only static resource attributes in known HTML tags. No dynamic JS or CSS rewrites.
    const updated=html.replace(/<(?:link|script|img|source|video|audio|a)\b[^>]*>/gi,tag=>tag
      .replace(/(\s(?:href|src|poster|data-src)\s*=\s*)(["'])(\/assets\/[^"']+)\2/g,(_,prefix,q,url)=>prefix+q+fingerprint(url)+q)
      .replace(/(\ssrcset\s*=\s*)(["'])([^"']+)\2/g,(_,prefix,q,value)=>prefix+q+value.replace(/(^|,\s*)(\/assets\/[^\s,]+)/g,(_x,lead,url)=>lead+fingerprint(url))+q));
    writeFileSync(join(staged,relative(source,path)),updated,'utf8');
    pages++;
  }
  const metrics=original.map(path=>{
    const bytes=readFileSync(path),ext=extname(path);
    return {path:posix(relative(source,path)),bytes:bytes.length,...(compressible.has(ext)?{gzipBytes:gzipSync(bytes).length,brotliBytes:brotliCompressSync(bytes).length}:{})};
  });
  const report={profile:'isolated-preview-candidate',pages,assets:manifest.size,originalFiles:original.length,
    originalBytes:metrics.reduce((n,x)=>n+x.bytes,0),manifest:[...manifest.values()],metrics,
    limitations:['Original assets retained for CSS/JS dependencies and lazy loads','No CSS/JS minification or image resampling','Cache policies are proposals outside served site; existing server rules unchanged','Compression sizes are estimates, not measured HTTP responses','Production and preview approval remain separate']};
  writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  writeFileSync(join(output,'cache-policy.preview.conf'),cachePolicy());
  writeFileSync(join(output,'cache-policy.production-candidate.conf'),cachePolicy('production-candidate'));
  return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  if(process.argv.length!==4)throw Error('Usage: node scripts/performance/prepare-candidate.mjs <root-build> <new-output-dir>');
  const result=prepareCandidate({source:process.argv[2],output:process.argv[3]});
  console.log(JSON.stringify({pages:result.pages,assets:result.assets,originalBytes:result.originalBytes},null,2));
}
