import {chromium} from 'playwright';
import pixelmatch from 'pixelmatch';
import {PNG} from 'pngjs';
import {mkdirSync,writeFileSync} from 'node:fs';
const out='live-visual-report';mkdirSync(out,{recursive:true});
const hosts=['https://kemcap.github.io/creaid-media','https://vorschau.creaid-media.de'];
const routes=['/','/webdesign','/digitales-marketing','/grafikdesign-2','/ki-automatisierung','/leistungen','/online-shop-entwicklung','/creaid-blog','/kontakt','/webdesign/webdesign-fuer-aerzte','/webdesign/webdesign-fuer-handwerker-mehr-anfragen-statt-nur-empfehlungen'];
const browser=await chromium.launch({headless:true});
const results=[];
try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  for(const route of routes){
   const id=viewport.width+'-'+(route==='/'?'home':route.slice(1).replaceAll('/','_'));
   const captures=[];
   for(const [index,host] of hosts.entries()){
    const context=await browser.newContext({viewport,reducedMotion:'reduce',deviceScaleFactor:1,serviceWorkers:'block'});
    const page=await context.newPage();const errors=[];const resources=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
    page.on('requestfailed',r=>errors.push(r.failure()?.errorText+' '+r.url()));
    try{
     const url=host+route+(index===0&&!route.endsWith('/')?'/':'')+'?creaid_visual_qa='+process.env.GITHUB_RUN_ID;
     const response=await page.goto(url,{waitUntil:'load',timeout:30000});
     await page.evaluate(async()=>{await document.fonts.ready;for(const im of document.images){const r=im.getBoundingClientRect();if(r.top<innerHeight&&r.bottom>0)im.loading='eager';}await Promise.all([...document.images].filter(i=>i.loading!=='lazy').map(i=>i.decode().catch(()=>{})));});
     const frames=[];
     const fractions=route==='/'?[0,.18,.38,.63,.85,1]:[0,.45,1];
     for(const fraction of fractions){
      await page.evaluate(f=>window.scrollTo(0,Math.round((document.documentElement.scrollHeight-innerHeight)*f)),fraction);
      await page.evaluate(async()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
      await page.waitForTimeout(400);
      const metrics=await page.evaluate(()=>{
       const rect=s=>{const e=document.querySelector(s);if(!e)return null;const b=e.getBoundingClientRect();const c=getComputedStyle(e);return {width:b.width,height:b.height,left:b.left,top:b.top,display:c.display,font:c.fontFamily,opacity:c.opacity};};
       return {scrollHeight:document.documentElement.scrollHeight,width:document.documentElement.scrollWidth,scrollY:window.scrollY,header:rect('#cm-global-header'),logo:rect('.cm-header__brand img'),hero:rect('.hero-heading,.service-hero-inner,.sp-hero,.j-hero'),headline:rect('main h1'),footer:rect('#cm-global-footer')};
      });
      const png=await page.screenshot({animations:'disabled',caret:'hide',path:out+'/'+id+'-'+index+'-'+fraction+'.png'});
      frames.push({fraction,png,metrics});
     }
     captures.push({index,status:response?.status(),headers:await response?.allHeaders(),errors,frames});
    }catch(e){captures.push({index,errors:[...errors,String(e)],frames:[]});}
    finally{await context.close();}
   }
   const comparisons=[];
   for(let i=0;i<Math.min(captures[0].frames.length,captures[1].frames.length);i++){
    const a=captures[0].frames[i],b=captures[1].frames[i],p=PNG.sync.read(a.png),q=PNG.sync.read(b.png);
    const diff=new PNG({width:p.width,height:p.height});
    const delta=pixelmatch(p.data,q.data,diff.data,p.width,p.height,{threshold:.15})/(p.width*p.height);
    if(delta>.005)writeFileSync(out+'/'+id+'-diff-'+a.fraction+'.png',PNG.sync.write(diff));
    comparisons.push({fraction:a.fraction,changedFraction:delta,github:a.metrics,ionos:b.metrics});
   }
   const row={route,viewport:viewport.width,github:{status:captures[0].status,cache:captures[0].headers?.['cache-control'],errors:captures[0].errors},ionos:{status:captures[1].status,cache:captures[1].headers?.['cache-control'],errors:captures[1].errors},comparisons};
   results.push(row);
   console.log(JSON.stringify({route,viewport:viewport.width,github:row.github,ionos:row.ionos,pixelDifferences:comparisons.map(c=>[c.fraction,c.changedFraction])}));
  }
 }
}finally{await browser.close();}
writeFileSync(out+'/report.json',JSON.stringify(results,null,2));
const failures=results.filter(r=>r.github.status!==200||r.ionos.status!==200||r.github.errors.length||r.ionos.errors.length||r.comparisons.some(c=>c.changedFraction>.005));
console.log('VISUAL_COMPARISON: '+results.length+' views, '+failures.length+' with discrepancies requiring review. Details in report.json.');
