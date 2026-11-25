// Explicit per-page resource hints, preserving untouched HTML bytes.
import {parseDocument} from 'htmlparser2';
import {existsSync,lstatSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const asset=/^\/assets\/[A-Za-z0-9_./-]+$/;
const pagePath=/^[A-Za-z0-9_./-]+\.html$/;
const safe=p=>typeof p==='string'&&!p.split('/').some(x=>x==='.'||x==='..');
const own=(o,k)=>Object.hasOwn(o,k);
const opening=/^<[a-z][a-z0-9:-]*(?:[^>"']|"[^"]*"|'[^']*')*>/i;
function nodes(root){
  return (root.children??[]).flatMap(n=>[n,...(['template','noscript','svg','math'].includes(n.name)?[]:nodes(n))]);
}
function checkAsset(site,url,pattern){
  if(!safe(url)||!asset.test(url)||!pattern.test(url)||!existsSync(join(site,url.slice(1)))||!lstatSync(join(site,url.slice(1))).isFile())throw Error('Invalid/missing hint asset: '+url);
}
export function applyHints(site,config={}){
  if(!config||typeof config!=='object'||Array.isArray(config))throw Error('Invalid hints');
  const rows=[];
  const planned=[];
  for(const [file,rule] of Object.entries(config)){
    if(!safe(file)||!pagePath.test(file)||file.startsWith('/')||!existsSync(join(site,file)))throw Error('Invalid hint page: '+file);
    if(!rule||Array.isArray(rule)||typeof rule!=='object'||Object.keys(rule).some(k=>!['deferScripts','preloadFonts','preloadImages'].includes(k)))throw Error('Unknown hint option');
    for(const k of ['deferScripts','preloadFonts','preloadImages'])if(rule[k]!==undefined&&(!Array.isArray(rule[k])||rule[k].length>20||new Set(rule[k]).size!==rule[k].length))throw Error('Invalid hint list: '+k);
    const p=join(site,file),html=readFileSync(p,'utf8');
    const all=nodes(parseDocument(html,{withStartIndices:true,withEndIndices:true,decodeEntities:true}));
    const head=all.find(n=>n.name==='head');
    if(!head||all.some(n=>n.name==='base'))throw Error('Explicit head and no base required: '+file);
    const changes=[],added=[];
    for(const url of rule.deferScripts??[]){
      checkAsset(site,url,/\.(?:js|mjs)$/);
      const matches=all.filter(n=>n.name==='script'&&n.attribs?.src===url);
      if(matches.length!==1)throw Error('Expected one script: '+url);
      const n=matches[0],a=n.attribs;
      if(a.type&&!/^(?:text|application)\/(?:java|ecma)script$/i.test(a.type)||['async','defer','nomodule'].some(k=>own(a,k)))throw Error('Script already optimized or not classic: '+url);
      if(n.children?.some(x=>x.data?.trim()))throw Error('Script body present: '+url);
      const tag=html.slice(n.startIndex).match(opening)?.[0];
      if(!tag||!/^<script\b/i.test(tag))throw Error('Cannot locate script tag');
      changes.push({at:n.startIndex+tag.length-1,text:' defer'});
      rows.push({file,kind:'defer',url});
    }
    for(const [key,as,ext] of [['preloadFonts','font',/\.woff2$/],['preloadImages','image',/\.(?:webp|avif|png|jpe?g)$/]]){
      for(const url of rule[key]??[]){
        checkAsset(site,url,ext);
        if(all.some(n=>n.name==='link'&&n.attribs?.href===url&&(n.attribs.rel??'').toLowerCase().split(/\s+/).includes('preload')))throw Error('Duplicate preload: '+url);
        if(as==='image'){
          const images=all.filter(n=>n.name==='img'&&n.attribs?.src===url);
          if(images.length!==1||['srcset','sizes'].some(k=>own(images[0].attribs,k))||images[0].parent?.name==='picture'||images[0].attribs.loading==='lazy')throw Error('Image preload requires one non-responsive eager img: '+url);
        }
        added.push('<link rel="preload" as="'+as+'" href="'+url+'"'+(as==='font'?' type="font/woff2" crossorigin':'')+'>');
        rows.push({file,kind:'preload-'+as,url});
      }
    }
    if(added.length){
      const tag=html.slice(head.startIndex).match(opening)?.[0];
      if(!tag||!/^<head\b/i.test(tag))throw Error('Cannot locate head');
      // Insert immediately before closing head, after charset and any CSP meta.
      const end=head.endIndex;
      const close=html.slice(0,end+1).match(/<\/head\s*>$/i);
      if(!close)throw Error('Explicit closing head required');
      changes.push({at:end+1-close[0].length,text:'\n'+added.join('\n')+'\n'});
    }
    let updated=html;
    for(const change of changes.sort((a,b)=>b.at-a.at))updated=updated.slice(0,change.at)+change.text+updated.slice(change.at);
    planned.push({p,updated});
  }
  for(const {p,updated} of planned)writeFileSync(p,updated,'utf8');
  return rows;
}
