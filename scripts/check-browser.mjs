import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {chromium,firefox,webkit} from 'playwright';
import pixelmatch from 'pixelmatch';
import {PNG} from 'pngjs';
import {routeFiles} from './routes.mjs';

const base=process.env.CREAID_QA_URL||'http://127.0.0.1:8080';
const reference=process.env.CREAID_QA_BASELINE||'';
const out=process.env.CREAID_QA_OUTPUT||'qa-results';
const all=Object.keys(routeFiles);
const representative=['/','/webdesign','/grafikdesign-2','/digitales-marketing','/ki-automatisierung','/leistungen','/online-shop-entwicklung','/webdesign/webdesign-fuer-aerzte','/kontakt','/referenzen','/ueber-uns','/creaid-blog','/google-ads-aber-keine-anfragen','/category/seo','/impressum','/performance-audit-3'].filter(r=>all.includes(r));
const errors=[],results=[],differences=[];
mkdirSync(out,{recursive:true});
const sizes=[{width:390,height:844},{width:768,height:1024},{width:1440,height:900}];
const breakpoints=[{width:320,height:568},{width:530,height:700},{width:531,height:700},{width:780,height:900},{width:781,height:900},{width:860,height:900},{width:861,height:900},{width:1080,height:800},{width:1081,height:800},{width:1920,height:1080},{width:933,height:420}];
const safe=r=>r==='/'?'index':r.slice(1).replace(/[^a-z0-9_-]/gi,'_');
async function settle(page,url){
 const response=await page.goto(url,{waitUntil:'load',timeout:30000});
 if(!response?.ok())throw Error('HTTP '+response?.status()+' '+url);
 await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
}
// Decode all images actually visible in the captured viewport before comparing pixels.
// Native lazy loading may otherwise complete on a different frame on either server.
async function readyForScreenshot(page){
 await page.evaluate(async()=>{
  await document.fonts.ready;
  const visible=[...document.images].filter(img=>{
   const r=img.getBoundingClientRect();
   return r.width>0&&r.height>0&&r.top<innerHeight&&r.bottom>0&&r.left<innerWidth&&r.right>0;
  });
  for(const img of visible)img.loading='eager';
  await Promise.all(visible.map(async img=>{try{await img.decode();}catch{/* broken images are checked separately */}}));
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 });
}
async function inspect(page,route,viewport,engine,compare){
 const localErrors=[];
 const onError=e=>localErrors.push('JS: '+e.message);
 const onResponse=r=>{if(r.status()>=400&&r.url().startsWith(base))localErrors.push('HTTP '+r.status()+' '+r.url());};
 const onRequestFailed=r=>{if(r.url().startsWith(base)&&r.failure()?.errorText!=='net::ERR_ABORTED')localErrors.push('Request: '+r.url());};
 const onRequest=r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(base+'/'))localErrors.push('Unexpected external request: '+r.url());};
 page.on('pageerror',onError);page.on('response',onResponse);page.on('requestfailed',onRequestFailed);page.on('request',onRequest);
 const id=engine+'-'+viewport.width+'x'+viewport.height+'-'+safe(route);
 try{
  await settle(page,base+route);
  const info=await page.evaluate(()=>{
    const h=document.querySelector('main h1');const nav=performance.getEntriesByType('navigation')[0];
    const r=performance.getEntriesByType('resource');
    return {h1:document.querySelectorAll('h1').length,header:document.querySelectorAll('#cm-global-header').length,footer:document.querySelectorAll('#cm-global-footer').length,h1Visible:!!h&&h.getBoundingClientRect().height>0&&getComputedStyle(h).visibility!=='hidden'&&getComputedStyle(h).display!=='none',
      width:document.documentElement.scrollWidth,viewport:innerWidth,canonical:document.querySelector('link[rel=canonical]')?.href,robots:document.querySelector('meta[name=robots]')?.content,
      badImages:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.currentSrc||i.src),
      transferBytes:r.reduce((n,e)=>n+(e.transferSize||0),0),decodedBytes:r.reduce((n,e)=>n+(e.decodedBodySize||0),0),resources:r.length,
      domContentLoadedMs:nav?.domContentLoadedEventEnd,loadMs:nav?.loadEventEnd,
      lcpMs:window.__qaMetrics?.lcp??null,cls:window.__qaMetrics?.cls??null};
  });
  results.push({id,route,engine,viewport,...info});
  if(info.h1!==1||info.header!==1||info.footer!==1||!info.h1Visible)localErrors.push('Invalid shared shell or H1');
  if(info.width>info.viewport+2)localErrors.push('Horizontal overflow '+(info.width-info.viewport)+' px');
  if(info.canonical!=='https://creaid-media.de'+route||info.robots!=='noindex,nofollow,noarchive')localErrors.push('SEO metadata mismatch');
  if(info.badImages.length)localErrors.push('Broken images: '+info.badImages.join(', '));
  if(compare){
   await readyForScreenshot(page);
   const actual=await page.screenshot({animations:'disabled',caret:'hide',path:join(out,id+'-current.png')});
   const refPage=await page.context().newPage();
   try{
    await settle(refPage,reference+route);
    await readyForScreenshot(refPage);
    const expected=await refPage.screenshot({animations:'disabled',caret:'hide',path:join(out,id+'-baseline.png')});
    const a=PNG.sync.read(actual),b=PNG.sync.read(expected);const diff=new PNG({width:a.width,height:a.height});
    const changed=pixelmatch(a.data,b.data,diff.data,a.width,a.height,{threshold:.15});const fraction=changed/(a.width*a.height);
    if(fraction>.005){differences.push({id,changedFraction:fraction});writeFileSync(join(out,id+'-diff.png'),PNG.sync.write(diff));}
   }finally{await refPage.close();}
  }
 }catch(e){localErrors.push(String(e.message||e));}
 finally{page.off('pageerror',onError);page.off('response',onResponse);page.off('requestfailed',onRequestFailed);page.off('request',onRequest);}
 if(localErrors.length)errors.push({id,issues:[...new Set(localErrors)]});
}
async function seedConsent(context){
 await context.addInitScript(()=>{try{if(!localStorage.getItem('creaid-consent-v1'))localStorage.setItem('creaid-consent-v1',JSON.stringify({version:1,analytics:false,time:Date.now()}));}catch{}});
}
async function consentTests(browser){
 const context=await browser.newContext({viewport:{width:390,height:844}});
 const page=await context.newPage();const external=[];
 await context.route('**/*',async route=>{if(/google-analytics|googletagmanager|doubleclick/.test(route.request().url())){external.push(route.request().url());await route.abort();}else await route.continue();});
 try{
  await settle(page,base+'/');const panel=page.locator('#creaid-consent-host #panel');
  await panel.waitFor({state:'visible'});
  await panel.getByRole('button',{name:'Akzeptieren und weiter'}).click();await panel.waitFor({state:'hidden'});
  assert.deepEqual(await page.evaluate(()=>window.CreAidTracking.getConsent()),{analytics:true,decided:true,live:false});
  await page.reload();await panel.waitFor({state:'hidden'});
  await settle(page,base+'/cookie-einstellungen');await page.locator('[data-creaid-consent-open]').click();
  await panel.getByRole('button',{name:'Nur notwendige',exact:true}).click();await panel.waitFor({state:'hidden'});
  assert.equal(await page.evaluate(()=>window.CreAidTracking.getConsent().analytics),false);
  assert.equal(external.length,0,'Preview must never contact Google tracking services');
 }catch(e){errors.push({id:'consent',issues:[String(e.message||e)]});}finally{await context.close();}
}
async function interactionTests(browser){
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await seedConsent(context);
 const p=await context.newPage();
 try{
  await settle(p,base+'/');
  for(const width of [320,390,1440]){
   await p.setViewportSize({width,height:844});
   await p.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
   const strip=p.locator('#cm-contactbar');
   assert.equal(await strip.locator('a').count(),4,'Four direct contact links required');
   const initial=await strip.boundingBox();
   assert.ok(initial && initial.height>=28 && initial.height<=36 && initial.y>=-1,'Slim contact strip at page top');
   assert.ok(await strip.evaluate(e=>[...e.querySelectorAll('a')].every(a=>{const r=a.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1;})),'Contact links overflow');
   await p.evaluate(()=>window.scrollTo({top:200,behavior:'instant'}));
   await p.waitForFunction(()=>{const bar=document.querySelector('#cm-contactbar').getBoundingClientRect();const header=document.querySelector('#cm-global-header').getBoundingClientRect();return bar.bottom<=1&&Math.abs(header.top)<=2;});
   await p.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
   await p.waitForFunction(()=>document.querySelector('#cm-contactbar').getBoundingClientRect().top>=-1);
  }
  await p.setViewportSize({width:390,height:844});
  const toggle=p.locator('#cm-menu-toggle');await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');await p.keyboard.press('Escape');assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert.equal(await p.evaluate(()=>document.activeElement.id),'cm-menu-toggle');
  await p.setViewportSize({width:1440,height:900});const summary=p.locator('.cm-header__services summary');await summary.click();assert.equal(await p.locator('.cm-header__services').getAttribute('open'),'');await p.keyboard.press('Escape');assert.equal(await p.locator('.cm-header__services').getAttribute('open'),null);assert.ok(await summary.evaluate(e=>document.activeElement===e));
  await settle(p,base+'/kontakt?service=Webdesign%20%26%20Entwicklung');assert.equal(await p.locator('#agencyEnquiry [name=service]').inputValue(),'Webdesign & Entwicklung');
  assert.ok(await p.locator('#agencyEnquiry').isVisible()); // do not submit any enquiry
  // Signature dot shares the homepage timing; reduced-motion disables it.
  for(const route of ['/', '/webdesign','/webdesign/webdesign-fuer-aerzte','/creaid-blog','/kontakt','/google-ads-aber-keine-anfragen']){
   await settle(p,base+route);
   const dot=p.locator('main .hero-heading .pink-dot, main .cm-claim-h1 .cm-heading-dot, main h1 .cm-heading-dot').first();
   assert.ok(await dot.count(),route+' missing signature dot');
   assert.equal(await dot.evaluate(e=>getComputedStyle(e).animationName),'none',route+' reduced motion');
   assert.equal(await dot.getAttribute('aria-hidden'),'true');
  }
  await p.emulateMedia({reducedMotion:'no-preference'});
  await settle(p,base+'/webdesign');
  assert.equal(await p.locator('main .cm-claim-h1 .cm-heading-dot').first().evaluate(e=>getComputedStyle(e).animationName),'cm-hero-ball-hop');
  await p.emulateMedia({reducedMotion:'reduce'});
  await settle(p,base+'/creaid-blog');
  const search=p.locator('#jSearch');await search.fill('ZZZ-QA-NO-MATCH-987654');assert.equal(await p.locator('.j-card[data-cat]:visible').count(),0);await search.fill('');assert.ok(await p.locator('.j-card[data-cat]:visible').count()>0);
  await settle(p,base+'/google-ads-aber-keine-anfragen');
  const faq=p.locator('.j-prose h3[id]').filter({hasNotText:'QA-NONEXISTENT'});
  const faqId=await faq.first().getAttribute('id');
  assert.ok(faqId,'Expected FAQ H3');
  await faq.first().scrollIntoViewIfNeeded();
  await p.evaluate(id=>{const h=document.getElementById(id);window.scrollTo(0,window.scrollY+h.getBoundingClientRect().top-innerHeight*.25);},faqId);
  await p.waitForFunction(id=>[...document.querySelectorAll('.j-toc a,.j-toc-mobile a')].some(a=>a.getAttribute('href')==='#'+id&&a.getAttribute('aria-current')==='location'),faqId);
  await settle(p,base+'/category/seo');
  assert.ok(await p.locator('.j-card:visible').count()>0);
  await p.setViewportSize({width:390,height:600});
  await settle(p,base+'/online-shop-entwicklung');
  assert.equal(await p.locator('.sp-story .sp-art-panel:visible').count(),3);
  await p.screenshot({animations:'disabled',path:join(out,'mobile-story.png'),fullPage:true});
 }catch(e){errors.push({id:'interactions',issues:[String(e.message||e)]});}finally{await context.close();}
}
for(const [engine,launcher] of Object.entries({chromium,firefox,webkit})){
 const browser=await launcher.launch({headless:true});
 try{
  const widths=engine==='chromium'?sizes:[sizes[0],sizes[2]];
  for(const viewport of widths){
   const context=await browser.newContext({viewport,reducedMotion:'reduce',deviceScaleFactor:1});
   await seedConsent(context);
   await context.addInitScript(()=>{
    window.__qaMetrics={lcp:null,cls:0};try{new PerformanceObserver(l=>{const e=l.getEntries().at(-1);if(e)window.__qaMetrics.lcp=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});}catch{}
    try{new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__qaMetrics.cls+=e.value;}).observe({type:'layout-shift',buffered:true});}catch{}
   });
   const page=await context.newPage();
   for(const route of engine==='chromium'?all:representative)await inspect(page,route,viewport,engine,engine==='chromium'&&!!reference);
   await context.close();
  }
  if(engine==='chromium'){
   for(const viewport of breakpoints){
    const c=await browser.newContext({viewport,reducedMotion:'no-preference',deviceScaleFactor:1});await seedConsent(c);const p=await c.newPage();
    for(const route of ['/', '/webdesign','/creaid-blog','/online-shop-entwicklung'])await inspect(p,route,viewport,engine,false);
    await c.close();
   }
   await interactionTests(browser);
   await consentTests(browser);
  }
 }finally{await browser.close();}
}
const report={routeCount:all.length,representativeCount:representative.length,renderings:results.length,errors,visualDifferences:differences,results};
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({routeCount:all.length,renderings:results.length,errors,visualDifferences:differences},null,2));
assert.equal(errors.length,0,'Browser QA found functional or layout errors');
assert.equal(differences.length,0,'Visual differences require review; see screenshots');
