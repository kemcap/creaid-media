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
     const visible=e=>{const b=e.getBoundingClientRect(),c=getComputedStyle(e);return b.width>0&&b.height>0&&c.display!=='none'&&c.visibility!=='hidden'};
     const controls=[...document.querySelectorAll('main .a-form .a-field input,main .a-form .a-field select,main .a-form .a-field textarea,main .j-index-editorial .j-search input')].filter(visible).map(e=>({name:e.name,height:e.getBoundingClientRect().height,font:parseFloat(getComputedStyle(e).fontSize)}));
     const buttonSelector='.cm-header__cta,.cm-footer__lead-cta,.button-primary,.a-btn,.j-button,.l-button,.cta,.cm-depth-primary';
     const buttons=[...document.querySelectorAll(buttonSelector)].filter(visible).map(e=>({text:e.textContent.trim().slice(0,80),minHeight:parseFloat(getComputedStyle(e).minHeight),font:parseFloat(getComputedStyle(e).fontSize),radius:parseFloat(getComputedStyle(e).borderTopLeftRadius)}));
     const shells=[...document.querySelectorAll('main :is(.shell,.a-shell,.j-shell):not(.j-prose *):not(.j-reading-sidebar *)')].filter(visible).map(e=>({class:e.className,width:e.getBoundingClientRect().width,maxAllowed:innerWidth}));
     return {panels,controls,buttons,shells,overflow:document.documentElement.scrollWidth-innerWidth,headers:document.querySelectorAll('#cm-global-header').length,footers:document.querySelectorAll('#cm-global-footer').length};
    });
    rows.push({path,viewport:viewport.width,status:r?.status(),errors,...d});
    if(['/','/creaid-blog','/webdesign','/kontakt','/referenzen','/category/seo'].includes(path))await p.screenshot({path:out+'/'+viewport.width+'-'+(path==='/'?'home':path.slice(1).replaceAll('/','_'))+'.png',fullPage:true,animations:'disabled'});
   }catch(e){rows.push({path,viewport:viewport.width,errors:[...errors,String(e)]});}finally{await p.close();}
  }
  await ctx.close();
 }
}finally{await b.close();}
const failures=rows.filter(r=>r.status!==200||r.errors.length||r.overflow>2||r.headers!==1||r.footers!==1||r.panels?.some(s=>s.marks!==1||!s.decorative||!s.nonBlocking||!s.positiveSize)||r.controls?.some(c=>c.height<43.5||c.font<16)||r.buttons?.some(c=>c.minHeight<44||c.font!==13||c.radius!==3)||r.shells?.some(c=>c.width>c.maxAllowed+2));
const report={views:rows.length,darkSections:rows.reduce((n,r)=>n+(r.panels?.length||0),0),missingOrDuplicate:rows.flatMap(r=>(r.panels||[]).filter(s=>s.marks!==1||!s.decorative||!s.nonBlocking||!s.positiveSize).map(s=>({path:r.path,viewport:r.viewport,...s}))),componentFailures:rows.flatMap(r=>[...(r.controls||[]).filter(c=>c.height<43.5||c.font<16),...(r.buttons||[]).filter(c=>c.minHeight<44||c.font!==13||c.radius!==3),...(r.shells||[]).filter(c=>c.width>c.maxAllowed+2)].map(c=>({path:r.path,viewport:r.viewport,...c}))),failureViews:failures.length};
writeFileSync(out+'/inventory.json',JSON.stringify(rows,null,2));writeFileSync(out+'/summary.json',JSON.stringify(report,null,2));console.log('DESIGN_SYSTEM '+JSON.stringify(report));if(failures.length)process.exitCode=1;
