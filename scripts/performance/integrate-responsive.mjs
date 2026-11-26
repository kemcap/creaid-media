// Explicit, layout-reviewed responsive integration. No implicit sizes guesses.
import {parseDocument} from 'htmlparser2';
import {createHash} from 'node:crypto';
import {existsSync,lstatSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const pathOK=p=>typeof p==='string'&&/^[A-Za-z0-9_./-]+$/.test(p)&&!p.startsWith('/')&&!p.split('/').some(x=>!x||x==='.'||x==='..');
const urlOK=p=>typeof p==='string'&&p.startsWith('/assets/')&&pathOK(p.slice(1));
const sha=b=>createHash('sha256').update(b).digest('hex');
const opening=/^<img\b(?:[^>"']|"[^"]*"|'[^']*')*>/i;
// Intentionally narrow subset: a list of optional viewport-width conditions and final px/vw length.
const length='(?:[1-9][0-9]{0,3}px|(?:[1-9][0-9]?|100)vw)';
const condition='\\((?:min|max)-width:\\s*[1-9][0-9]{0,3}px\\)\\s+';
const sizePattern=new RegExp('^(?:'+condition+length+'\\s*,\\s*){0,5}'+length+'$');
export function validSizes(value){return typeof value==='string'&&value.length<=240&&sizePattern.test(value);}
function nodes(root){
 return (root.children??[]).flatMap(n=>[n,...(['template','noscript','svg','math'].includes(n.name)?[]:nodes(n))]);
}
function insidePicture(n){for(let p=n.parent;p;p=p.parent)if(p.name==='picture')return true;return false;}
export function integrateResponsive(site,report,config){
 if(!config||typeof config!=='object'||Array.isArray(config)||Object.keys(config).length>200)throw Error('Invalid responsive integration map');
 const bySource=new Map((report?.rows??[]).map(r=>[r.original,r]));
 const changes=[],planned=[];
 for(const [page,rules] of Object.entries(config)){
  if(!pathOK(page)||!page.endsWith('.html')||!existsSync(join(site,page))||!lstatSync(join(site,page)).isFile())throw Error('Invalid responsive page: '+page);
  if(!rules||typeof rules!=='object'||Array.isArray(rules)||!Object.keys(rules).length||Object.keys(rules).length>50)throw Error('Invalid responsive rules');
  const file=join(site,page),html=readFileSync(file,'utf8');
  const all=nodes(parseDocument(html,{withStartIndices:true,withEndIndices:true,decodeEntities:true}));
  if(all.some(n=>n.name==='base'))throw Error('base element requires manual review');
  const edits=[];
  for(const [url,sizes] of Object.entries(rules)){
   if(!urlOK(url)||!validSizes(sizes))throw Error('Invalid responsive URL or sizes: '+url);
   const row=bySource.get(url);
   if(!row)throw Error('Image missing from responsive generation allowlist: '+url);
   const matches=all.filter(n=>n.name==='img'&&n.attribs?.src===url);
   if(matches.length!==1)throw Error('Expected exactly one matching img: '+url);
   const n=matches[0],a=n.attribs;
   if(insidePicture(n)||Object.keys(a).some(k=>['srcset','sizes','data-src','data-srcset','data-sizes','integrity'].includes(k)))throw Error('Existing responsive or dynamic image requires manual review: '+url);
   if(!/^[1-9]\d*$/.test(a.width??'')||!/^[1-9]\d*$/.test(a.height??'')||Math.abs(Number(a.width)/Number(a.height)-row.width/row.height)>0.01)throw Error('Explicit matching image dimensions required: '+url);
   if(all.some(x=>x.name==='link'&&(x.attribs?.rel??'').toLowerCase().split(/\s+/).includes('preload')&&x.attribs.href===url))throw Error('Existing image preload requires manual review: '+url);
   if(!row.variants?.length){changes.push({page,url,status:'no-variant-preserved'});continue;}
   const variants=[...row.variants].sort((a,b)=>a.width-b.width);
   for(const v of variants){
    if(!urlOK(v.url)||!Number.isSafeInteger(v.width)||v.width>=row.width||v.width<1||!existsSync(join(site,v.url.slice(1)))||sha(readFileSync(join(site,v.url.slice(1))))!==v.sha256)throw Error('Invalid responsive variant: '+v.url);
   }
   const srcset=[...variants.map(v=>v.url+' '+v.width+'w'),url+' '+row.width+'w'].join(', ');
   const tag=html.slice(n.startIndex).match(opening)?.[0];
   if(!tag)throw Error('Cannot locate image start tag');
   const at=n.startIndex+tag.length-(tag.endsWith('/>')?2:1);
   edits.push({at,text:' srcset="'+srcset+'" sizes="'+sizes+'"'});
   changes.push({page,url,status:'integrated',variants:variants.length,sizes});
  }
  let next=html;
  for(const edit of edits.sort((a,b)=>b.at-a.at))next=next.slice(0,edit.at)+edit.text+next.slice(edit.at);
  planned.push({file,next});
 }
 for(const p of planned)writeFileSync(p.file,p.next,'utf8');
 return {integrated:changes.filter(x=>x.status==='integrated').length,changes,limitations:['Only explicit, layout-reviewed image/sizes mappings; originals preserved.','Existing picture/srcset/lazy-loader attributes or preloads require manual handling.','Visual and network validation required; no estimated or guaranteed savings.']};
}
