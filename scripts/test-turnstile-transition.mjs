// All requests are intercepted; this is a local UI simulation, never a live challenge or mail submission.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true});
const root=resolve('dist');
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
try{
 for(const width of [1440,390,320]){
  const page=await browser.newPage({viewport:{width,height:900}});
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.hostname==='challenges.cloudflare.com'){
    await route.fulfill({contentType:'application/javascript',body:"window.turnstile={render:(selector,opts)=>{window.mockChallenge=opts;const el=document.querySelector(selector);const frame=document.createElement('iframe');frame.title='Mock local challenge';frame.style.cssText='border:0;width:'+(opts.size==='compact'?'150px':'100%')+';height:'+(opts.size==='compact'?'140px':'65px');el.append(frame);return 'mock-local-widget';},reset:()=>{}};window.creaidTurnstileLoaded();"});return;
   }
   if(u.origin!=='https://vorschau.creaid-media.de'||route.request().method()!=='GET'){await route.abort();return;}
   const path=resolve(root,u.pathname==='/kontakt'?'kontakt.html':'.'+decodeURIComponent(u.pathname));
   if(!path.startsWith(root+'/')){await route.abort();return;}
   try{await route.fulfill({body:await readFile(path),contentType:types[extname(path)]||'application/octet-stream'});}catch{await route.fulfill({status:404,body:''});}
  });
  await page.goto('https://vorschau.creaid-media.de/kontakt',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.mockChallenge);
  const slot=page.locator('#aSubmitSlot'),btn=slot.locator('button'),widget=slot.locator('#aTurnstile');
  await slot.scrollIntoViewIfNeeded();
  const before=await slot.boundingBox();
  assert.ok(before.width>=150&&before.height>=65,'Challenge must fit');
  assert.ok(await btn.isDisabled());
  assert.ok(await widget.isVisible());
  const frame=await widget.locator('iframe').boundingBox();
  assert.ok(frame.width<=before.width+.1&&frame.height<=before.height+.1,'Widget clipped');
  await page.evaluate(()=>window.mockChallenge.callback('local-ui-mock-token'));
  await page.waitForTimeout(450);
  assert.equal(await btn.isDisabled(),false);
  assert.equal(await widget.isVisible(),false);
  assert.deepEqual(await slot.boundingBox(),before,'Slot moved after verification');
  await page.evaluate(()=>window.mockChallenge['expired-callback']());
  await page.waitForTimeout(450);
  assert.ok(await btn.isDisabled());
  assert.ok(await widget.isVisible());
  assert.deepEqual(await slot.boundingBox(),before,'Slot moved after expiry');
  await page.evaluate(()=>window.mockChallenge['error-callback']('local-mock-error'));
  assert.ok(await page.locator('#aFormFallback').isVisible(),'Error fallback unavailable');
  console.log('TRANSITION_OK '+width+'px '+JSON.stringify(before));
  await page.close();
 }
}finally{await browser.close();}
