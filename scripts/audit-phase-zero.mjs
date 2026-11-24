import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const routes=Object.entries(JSON.parse(readFileSync('src/_data/routes.json','utf8')));
const origin='https://vorschau.creaid-media.de';
const out='phase-zero-report';mkdirSync(out,{recursive:true});
const b=await chromium.launch();
const rows=[];
try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const context=await b.newContext({viewport,reducedMotion:'reduce',serviceWorkers:'block'});
  for(const [key,path] of routes){
   const page=await context.newPage();const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
   try{
    const r=await page.goto(origin+path,{waitUntil:'load',timeout:25000});
    await page.evaluate(()=>document.fonts.ready);
    const data=await page.evaluate(()=>{
      const visible=e=>e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';
      const rgb=s=>{const m=s.match(/rgba?\(([^)]+)\)/);if(!m)return null;return m[1].split(',').map(Number)};
      const dark=e=>{const c=rgb(getComputedStyle(e).backgroundColor);return c&&c.length>=3&&(c[3]??1)>.9&&.2126*c[0]+.7152*c[1]+.0722*c[2]<70};
      const section=[...document.querySelectorAll('main > section')].map(e=>{
        const stage=e.querySelector(':scope > .motion-stage,:scope > .a-stage,:scope > .detail-pin,:scope > .j-feature-stage,:scope > .closing-pin');
        const surface=stage||e;
        return {id:e.id,classes:e.className,stage:surface.className,heading:e.querySelector('h1,h2')?.textContent.trim(),background:getComputedStyle(surface).backgroundColor,dark:!!dark(surface),crosshair:!!e.querySelector('.axes,.cm-service-crosshair,.a-grid-cross'),height:Math.round(e.getBoundingClientRect().height)};
      });
      const meta=name=>document.querySelector('meta[name="'+name+'"]')?.content??null;
      const headings=[...document.querySelectorAll('main h1,main h2,main h3')].map(e=>({tag:e.tagName,text:e.textContent.trim(),visible:visible(e)}));
      const images=[...document.querySelectorAll('main img')].map(i=>({src:i.getAttribute('src'),alt:i.getAttribute('alt'),width:i.getAttribute('width'),height:i.getAttribute('height'),loading:i.loading}));
      return {title:document.title,description:meta('description'),robots:meta('robots'),canonical:document.querySelector('link[rel=canonical]')?.href,headings,images,sections:section,overflow:document.documentElement.scrollWidth-innerWidth,wordCount:document.querySelector('main')?.innerText.trim().split(/\s+/).length,headerCount:document.querySelectorAll('#cm-global-header').length,footerCount:document.querySelectorAll('#cm-global-footer').length};
    });
    rows.push({key,path,viewport:viewport.width,status:r?.status(),errors,...data});
   }catch(e){rows.push({key,path,viewport:viewport.width,errors:[...errors,String(e)]});}
   finally{await page.close();}
  }
  await context.close();
 }
}finally{await b.close();}
writeFileSync(out+'/browser-inventory.json',JSON.stringify(rows,null,2));
const summary={views:rows.length,httpErrors:rows.filter(r=>r.status!==200).length,errors:rows.filter(r=>r.errors.length).length,overflow:rows.filter(r=>r.overflow>2).length,darkSections:rows.reduce((n,r)=>n+(r.sections||[]).filter(s=>s.dark).length,0),darkSectionsWithoutCrosshair:rows.flatMap(r=>(r.sections||[]).filter(s=>s.dark&&!s.crosshair).map(s=>({path:r.path,viewport:r.viewport,...s}))),missingAltAttributes:rows.flatMap(r=>(r.images||[]).filter(i=>i.alt===null).map(i=>({path:r.path,viewport:r.viewport,...i})))};
writeFileSync(out+'/summary.json',JSON.stringify(summary,null,2));console.log(JSON.stringify({...summary,darkSectionsWithoutCrosshair:summary.darkSectionsWithoutCrosshair.length,missingAltAttributes:summary.missingAltAttributes.length}));
