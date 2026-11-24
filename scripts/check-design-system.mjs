import {chromium} from 'playwright';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const routes=Object.values(JSON.parse(readFileSync('src/_data/routes.json','utf8')));
const b=await chromium.launch();const rows=[];const out='design-system-report';mkdirSync(out,{recursive:true});
try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const ctx=await b.newContext({viewport,reducedMotion:'reduce'});
  for(const path of routes){
   const p=await ctx.newPage();const errors=[];
   p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
   try{
    const r=await p.goto('http://127.0.0.1:8080'+path,{waitUntil:'load',timeout:25000});await p.evaluate(()=>document.fonts.ready);
    const d=await p.evaluate(()=>{
     const dark=e=>{const m=getComputedStyle(e).backgroundColor.match(/^rgba?\(([^)]+)\)$/);if(!m)return false;const c=m[1].split(',').map(Number);return c.length>=3&&(c[3]??1)>.9&&.2126*c[0]+.7152*c[1]+.0722*c[2]<70;};
     const surfaces=new Set();
     document.querySelectorAll('main section').forEach(e=>{const stage=e.querySelector(':scope > .motion-stage,:scope > .a-stage,:scope > .detail-pin,:scope > .j-feature-stage,:scope > .closing-pin');if(stage&&dark(stage))surfaces.add(stage);else if(dark(e))surfaces.add(e);});
     const panels=[...surfaces].map(e=>{
      const marks=[...e.querySelectorAll(':scope > .cm-service-crosshair,:scope > .axes,:scope > .a-grid-cross')].filter(n=>getComputedStyle(n).display!=='none'&&getComputedStyle(n).visibility!=='hidden');
      return {id:e.id,classes:e.className,marks:marks.length,decorative:marks.every(n=>n.getAttribute('aria-hidden')==='true'),nonBlocking:marks.every(n=>getComputedStyle(n).pointerEvents==='none'),positiveSize:marks.every(n=>n.getBoundingClientRect().width>0&&n.getBoundingClientRect().height>0)};
     });
     return {panels,overflow:document.documentElement.scrollWidth-innerWidth,headers:document.querySelectorAll('#cm-global-header').length,footers:document.querySelectorAll('#cm-global-footer').length};
    });
    rows.push({path,viewport:viewport.width,status:r?.status(),errors,...d});
    if(['/','/creaid-blog','/webdesign','/kontakt','/referenzen','/category/seo'].includes(path))await p.screenshot({path:out+'/'+viewport.width+'-'+(path==='/'?'home':path.slice(1).replaceAll('/','_'))+'.png',fullPage:true,animations:'disabled'});
   }catch(e){rows.push({path,viewport:viewport.width,errors:[...errors,String(e)]});}finally{await p.close();}
  }
  await ctx.close();
 }
}finally{await b.close();}
const failures=rows.filter(r=>r.status!==200||r.errors.length||r.overflow>2||r.headers!==1||r.footers!==1||r.panels?.some(s=>s.marks!==1||!s.decorative||!s.nonBlocking||!s.positiveSize));
const report={views:rows.length,darkSections:rows.reduce((n,r)=>n+(r.panels?.length||0),0),missingOrDuplicate:rows.flatMap(r=>(r.panels||[]).filter(s=>s.marks!==1||!s.decorative||!s.nonBlocking||!s.positiveSize).map(s=>({path:r.path,viewport:r.viewport,...s}))),failureViews:failures.length};
writeFileSync(out+'/inventory.json',JSON.stringify(rows,null,2));writeFileSync(out+'/summary.json',JSON.stringify(report,null,2));console.log('DESIGN_SYSTEM '+JSON.stringify(report));if(failures.length)process.exitCode=1;
