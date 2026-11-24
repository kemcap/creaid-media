import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const b=await chromium.launch();const base='http://127.0.0.1:8080';
try{
 for(const route of ['/','/creaid-blog']){
  const p=await b.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await p.addInitScript(()=>{window.__shiftLog=[];try{new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__shiftLog.push({value:e.value,sources:e.sources?.map(s=>({node:s.node?.nodeName,id:s.node?.id,cls:s.node?.className,previous:s.previousRect?.toJSON(),current:s.currentRect?.toJSON()}))})}).observe({type:'layout-shift',buffered:true})}catch{}});
  let release;const gate=new Promise(r=>{release=r});
  await p.route('**/assets/global-shell.js*',async r=>{await gate;await r.continue()});
  try{
   await p.goto(base+route,{waitUntil:'commit'});
   await p.locator('#cm-global-header').waitFor();
   await p.waitForFunction(()=>document.querySelector('#cm-primary-nav')&&getComputedStyle(document.querySelector('#cm-primary-nav')).display==='none');
   const pre=await p.locator('#cm-global-header').boundingBox();
   release();await p.waitForLoadState('load');await p.evaluate(()=>document.fonts.ready);
   const post=await p.locator('#cm-global-header').boundingBox();
   assert.ok(Math.abs(pre.height-post.height)<=2,'Header changed height: '+JSON.stringify({pre,post}));
   await p.locator('#cm-menu-toggle').click();assert.equal(await p.locator('#cm-primary-nav').isVisible(),true);
   await p.keyboard.press('Escape');assert.equal(await p.locator('#cm-primary-nav').isVisible(),false);
   console.log('HEADER_STABILITY '+JSON.stringify({route,before:pre.height,after:post.height,shifts:await p.evaluate(()=>window.__shiftLog)}));
  }finally{release();await p.close()}
  const no=await b.newPage({viewport:{width:390,height:844},javaScriptEnabled:false});
  await no.goto(base+route);assert.equal(await no.locator('#cm-primary-nav').isVisible(),true);assert.equal(await no.locator('#cm-menu-toggle').isVisible(),false);await no.close();
  const fail=await b.newPage({viewport:{width:390,height:844}});await fail.route('**/assets/global-shell.js*',r=>r.abort());await fail.goto(base+route);assert.equal(await fail.locator('#cm-primary-nav').isVisible(),true);await fail.close();
 }
}finally{await b.close()}
