import assert from 'node:assert/strict';
import {chromium,firefox,webkit} from 'playwright';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdirSync,writeFileSync} from 'node:fs';
const url=pathToFileURL(resolve('qa-results/additional-offers-review.html')).href;
const report=[];
for(const [engine,launcher] of Object.entries({chromium,firefox,webkit})){
 const browser=await launcher.launch({headless:true});
 try{
  for(const width of [320,390,768,1440]){
   const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(url);
   assert.equal(await page.locator('.package').count(),14);
   assert.equal(await page.locator('.module').count(),11);
   assert.equal(await page.locator('h1').count(),1);
   assert.equal(await page.locator('meta[name=robots]').getAttribute('content'),'noindex,nofollow,noarchive');
   assert.equal(await page.locator('form').count(),0);
   for(const el of await page.locator('summary').all())await el.click();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,engine+' '+width+' expanded overflow');
   assert.deepEqual(errors,[]);
   await page.screenshot({path:'qa-results/offers-'+engine+'-'+width+'.png',animations:'disabled'});
   report.push({engine,width,packages:14,modules:11,expandedOverflow:false});
   await page.close();
  }
 }finally{await browser.close();}
}
writeFileSync('qa-results/additional-offers-browser.json',JSON.stringify(report,null,2));
console.log('PASS: '+report.length+' browser checks; all details expanded; no page overflow or JS errors');
