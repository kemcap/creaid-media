// CreAid Performance Engine 1.2 — static audit, no network or source changes.
import { parseDocument } from 'htmlparser2';
import { existsSync, lstatSync, realpathSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, relative, dirname, extname, join, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import { prioritizeAudit } from './prioritize-audit.mjs';

const origin='https://audit.invalid';
const KB=1024;
const IMAGE=/\.(?:png|jpe?g|webp|avif|gif|svg|ico)$/i;
const JS=/\.(?:m?js)$/i;
const CSS=/\.css$/i;
const inside=(a,b)=>{const r=relative(a,b);return r===''||(!r.startsWith('..'+sep)&&r!=='..'&&!r.startsWith(sep));};
const future=p=>existsSync(p)?realpathSync(p):join(future(dirname(p)),relative(dirname(p),p));
function walk(root){
  const out=[];
  for(const e of readdirSync(root,{withFileTypes:true})){
    const p=join(root,e.name);
    if(e.isSymbolicLink())throw Error('Symlink not allowed: '+p);
    if(e.isDirectory())out.push(...walk(p));
    else if(e.isFile())out.push(p);
    else throw Error('Unsupported file: '+p);
  }
  return out.sort();
}
function tags(node){
  const out=[];
  for(const child of node.children??[]){
    if(child.name)out.push(child);
    if(child.name!=='template'&&child.name!=='noscript')out.push(...tags(child));
  }
  return out;
}
const positive=v=>/^\d+$/.test(v??'')&&Number(v)>0;
const type=p=>CSS.test(p)?'css':JS.test(p)?'js':IMAGE.test(p)?'image':/\.(?:woff2?|ttf|otf)$/i.test(p)?'font':'other';
export function auditBuild(source, limits={}){
  source=resolve(source);
  if(lstatSync(source).isSymbolicLink()||!existsSync(join(source,'index.html')))throw Error('Expected static build with index.html');
  const budget={html:150*KB,css:200*KB,js:300*KB,image:400*KB,...limits};
  for(const k of ['html','css','js','image'])if(!Number.isSafeInteger(budget[k])||budget[k]<=0)throw Error('Invalid byte budget: '+k);
  const files=walk(source);
  const sizes=new Map(files.map(p=>['/'+relative(source,p).split(sep).join('/'),lstatSync(p).size]));
  const assets=new Map();
  const pages=[];
  for(const file of files.filter(p=>/\.html?$/i.test(p))){
    const path='/'+relative(source,file).split(sep).join('/');
    const html=readFileSync(file,'utf8');
    const nodes=tags(parseDocument(html,{decodeEntities:true}));
    const findings=[];const refs=new Set();const external=new Set();const missing=new Set();
    const add=(id,detail,priority='medium')=>findings.push({id,detail,priority});
    let base=origin+path;
    const baseTag=nodes.find(n=>n.name==='base'&&n.attribs?.href);
    if(baseTag){try{base=new URL(baseTag.attribs.href,base).href;}catch{add('invalid-base','Ungültiges base-Element');}}
    function asset(raw){
      if(!raw||/^(?:data:|blob:|#|javascript:)/i.test(raw.trim()))return null;
      let u;try{u=new URL(raw,base);}catch{return null;}
      if(!['http:','https:'].includes(u.protocol))return null;
      if(u.origin!==origin){external.add(u.origin);return null;}
      let p;try{p=decodeURIComponent(u.pathname);}catch{return null;}
      if(!sizes.has(p)){missing.add(p);return null;}
      if(!refs.has(p)){
        refs.add(p);
        const entry=assets.get(p)??{path:p,bytes:sizes.get(p),type:type(p),pages:0};
        entry.pages++;assets.set(p,entry);
      }
      return p;
    }
    let eagerImages=0,blockingScripts=0,styles=0;
    for(const n of nodes){
      const a=n.attribs??{};
      if(n.name==='img'){
        const p=asset(a.src);
        if(!positive(a.width)||!positive(a.height))add('image-dimensions',a.src??'(ohne src)');
        if(a.loading!=='lazy')eagerImages++;
        if(a.loading==='lazy'&&a.fetchpriority==='high')add('priority-conflict',a.src??'(ohne src)','high');
        if(p&&sizes.get(p)>budget.image&&!a.srcset)add('responsive-image',p+' — '+sizes.get(p)+' B','high');
        // srcset is counted separately as optional alternatives, not summed into page bytes.
      }else if(n.name==='script'&&a.src){
        asset(a.src);
        const mime=(a.type??'').toLowerCase();
        if((!mime||/^(?:text|application)\/(?:java|ecma)script$/.test(mime))&&!('async'in a)&&!('defer'in a)&&!('nomodule'in a)){
          blockingScripts++;add('script-review',a.src+' — klassisches Skript ohne async/defer');
        }
      }else if(n.name==='link'){
        const rel=(a.rel??'').toLowerCase().split(/\s+/);
        if(rel.includes('stylesheet')&&!('disabled'in a)){
          asset(a.href);styles++;
          if(!a.media||a.media==='all'||a.media==='screen')add('css-review',a.href??'(ohne href)','low');
        }else if(rel.includes('preload')||rel.includes('modulepreload'))asset(a.href);
      }else if(n.name==='source'&&a.src)asset(a.src);
      else if(n.name==='video'||n.name==='audio'){asset(a.src);asset(a.poster);}
      else if(n.name==='iframe'&&a.src){try{const u=new URL(a.src,base);if(u.origin!==origin&&['http:','https:'].includes(u.protocol))external.add(u.origin);}catch{}}
    }
    const totals={css:0,js:0,image:0,font:0,other:0};
    for(const p of refs)totals[type(p)]+=sizes.get(p);
    if(sizes.get(path)>budget.html)add('html-budget',sizes.get(path)+' B HTML','high');
    for(const k of ['css','js'])if(totals[k]>budget[k])add(k+'-budget',totals[k]+' B direkte '+k.toUpperCase()+'-Dateien','high');
    for(const p of missing)add('missing-local-asset',p,'high');
    if(external.size)add('third-party-review',external.size+' externe Origins','low');
    pages.push({path,htmlBytes:sizes.get(path),directBytes:totals,directAssets:refs.size,externalOrigins:[...external].sort(),eagerImages,blockingScripts,styles,findings});
  }
  const counts={};for(const p of pages)for(const f of p.findings)counts[f.id]=(counts[f.id]??0)+1;
  return {schemaVersion:1,mode:'static-build-audit',budgets:budget,summary:{pages:pages.length,files:files.length,uniqueReferencedAssets:assets.size,findings:Object.values(counts).reduce((a,b)=>a+b,0),counts},pages,assets:[...assets.values()].sort((a,b)=>b.bytes-a.bytes||a.path.localeCompare(b.path)),limitations:['Statische Inventur, keine Lighthouse- oder Core-Web-Vitals-Messung.','Direkte lokale Ressourcen in HTML, ohne srcset-Alternativen, CSS-Unterabhängigkeiten, dynamische Imports, Inline-Bytes (bereits im HTML) oder HTTP-Kompression. Keine tatsächlichen Transfergrößen.','CSS-/Skript-Hinweise sind Prüfaufträge, keine automatisch sicheren Änderungen. Bilddimensionen sind ein Hinweis, nicht der Nachweis von CLS.','Berichte enthalten interne Pfade; nicht öffentlich bereitstellen.']};
}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number.isFinite(n)?(n/1024).toLocaleString('de-DE',{maximumFractionDigits:1})+' KiB':'—';
export function dashboard(report,comparison=null){
  const s=report.summary;
  const review=prioritizeAudit(report);
  const taskRows=review.items.slice(0,50).map(i=>'<tr><td>'+esc(i.priority)+'</td><td><strong>'+esc(i.title)+'</strong><br>'+esc(i.detail)+'<br><small>'+esc(i.action)+'</small></td><td>'+i.affectedPages+'</td><td>'+i.occurrences+'</td></tr>').join('');
  const metrics=[['Seiten',s.pages],['Dateien',s.files],['Referenzierte Assets',s.uniqueReferencedAssets],['Prüfhinweise',s.findings]];
  const rows=report.pages.slice().sort((a,b)=>b.findings.filter(f=>f.priority==='high').length-a.findings.filter(f=>f.priority==='high').length||b.htmlBytes-a.htmlBytes);
  const chart=Object.entries(s.counts).sort((a,b)=>b[1]-a[1]);const max=Math.max(1,...chart.map(x=>x[1]));
  const tableRows=rows.map(p=>'<tr><td><details><summary>'+esc(p.path)+'</summary><ul>'+p.findings.map(f=>'<li><strong>'+esc(f.id)+'</strong> · '+esc(f.detail)+'</li>').join('')+'</ul></details></td><td>'+fmt(p.htmlBytes)+'</td><td>'+fmt(p.directBytes.css)+'</td><td>'+fmt(p.directBytes.js)+'</td><td>'+fmt(p.directBytes.image)+'</td><td>'+p.findings.length+'</td></tr>').join('');
  return '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'"><title>CreAid Performance Engine · Audit</title><style>*{box-sizing:border-box}body{margin:0;background:#1a1a1b;color:#f7f5f5;font:16px/1.55 system-ui,sans-serif}main{max-width:1160px;margin:auto;padding:clamp(20px,5vw,64px)}header{border-bottom:2px solid #FA225B;padding-bottom:28px}h1{font-size:clamp(32px,6vw,64px);line-height:1.05;margin:10px 0}h2{margin-top:48px}small,.muted{color:#c9c3c6}.accent{color:#ff7499;font-weight:700;letter-spacing:.12em}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:16px;margin-top:24px}.metric{border-top:1px solid #82737b;padding:14px 0}.metric strong{display:block;font-size:2rem}.scroll{overflow:auto}table{border-collapse:collapse;width:100%;min-width:680px}th,td{text-align:left;padding:12px;border-bottom:1px solid #4c4448;vertical-align:top}td:first-child{overflow-wrap:anywhere}td:not(:first-child){white-space:nowrap}summary{cursor:pointer}summary:focus-visible{outline:2px solid #ff7499}.barrow{display:grid;grid-template-columns:minmax(120px,240px) 1fr 44px;gap:12px;align-items:center;margin:12px 0}.bar{height:12px;background:#FA225B}ul{padding-left:20px}footer{border-top:1px solid #4c4448;margin-top:48px;padding-top:20px}</style></head><body><main><header><div class="accent">CREAID · PERFORMANCE ENGINE / 1.4</div><h1>Performance Audit.</h1><p class="muted">Private Build-Analyse · keine Live-Messung · keine automatische Veröffentlichung</p></header><section class="metrics">'+metrics.map(([k,v])=>'<div class="metric"><strong>'+esc(v)+'</strong>'+esc(k)+'</div>').join('')+'</section><h2>Prioritäten</h2>'+chart.map(([k,v])=>'<div class="barrow"><span>'+esc(k)+'</span><div class="bar" style="width:'+Math.round(v/max*100)+'%"></div><span>'+v+'</span></div>').join('')+'<h2>Priorisierte Aufgaben</h2><p class="muted">'+review.uniqueItems+' unterschiedliche Prüfaufgaben aus '+review.occurrences+' Hinweisen. Top 50; vollständige Liste in priorities.json. Keine gemessenen Ladezeitgewinne.</p><div class="scroll" tabindex="0" role="region" aria-label="Prüfaufgaben"><table><thead><tr><th>Priorität</th><th>Aufgabe</th><th>Seiten</th><th>Hinweise</th></tr></thead><tbody>'+taskRows+'</tbody></table></div><h2>Seiteninventar</h2><p class="muted">Unkomprimierte direkte HTML-Ressourcen, keine gemessenen Transfergrößen. Zeile öffnen für Hinweise.</p><div class="scroll" tabindex="0" role="region" aria-label="Seiteninventar"><table><thead><tr><th>Seite</th><th>HTML</th><th>CSS</th><th>JS</th><th>Bilder</th><th>Hinweise</th></tr></thead><tbody>'+tableRows+'</tbody></table></div><h2>Größte direkt referenzierte Assets</h2><div class="scroll" tabindex="0" role="region" aria-label="Asset-Inventar"><table><thead><tr><th>Datei</th><th>Typ</th><th>Größe</th><th>Seiten</th></tr></thead><tbody>'+report.assets.slice(0,50).map(a=>'<tr><td>'+esc(a.path)+'</td><td>'+esc(a.type)+'</td><td>'+fmt(a.bytes)+'</td><td>'+a.pages+'</td></tr>').join('')+'</tbody></table></div>'+(comparison?'<h2>Lighthouse-Labordaten</h2><p class="muted">Vergleich bereitgestellter Messungen, keine Felddaten.</p><pre>'+esc(JSON.stringify(comparison,null,2))+'</pre>':'')+'<footer><h2>Messgrenzen</h2><ul>'+report.limitations.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></footer></main></body></html>';
}
export function writeAudit({source,output,limits}){
  source=resolve(source);output=resolve(output);
  if(existsSync(output)||inside(realpathSync(source),future(output))||inside(future(output),realpathSync(source)))throw Error('Audit output must be a new directory outside build');
  const report=auditBuild(source,limits);
  mkdirSync(output,{recursive:true});
  writeFileSync(join(output,'audit.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  writeFileSync(join(output,'priorities.json'),JSON.stringify(prioritizeAudit(report),null,2)+'\n',{flag:'wx'});
  writeFileSync(join(output,'dashboard.html'),dashboard(report),{flag:'wx'});
  return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const [source,output,...extra]=process.argv.slice(2);
  if(!source||!output||extra.length)throw Error('Usage: node scripts/performance/audit.mjs <build> <new-report-directory>');
  console.log(JSON.stringify(writeAudit({source,output}).summary,null,2));
}
