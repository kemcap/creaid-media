import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync} from 'node:fs';
const browser=await chromium.launch({headless:true});mkdirSync('qa-results',{recursive:true});
try{
 for(const width of [320,390,768,1440]){
  const p=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(r.url()+' '+r.status());});
  await p.goto('http://127.0.0.1:8080/referenzen');
  const cards=p.locator('.cm-portfolio__item');
  assert.equal(await cards.count(),16);
  await p.locator('#arbeitsproben').scrollIntoViewIfNeeded();
  await p.evaluate(async()=>{const images=[...document.querySelectorAll('.cm-portfolio__image img')];for(const im of images)im.loading='eager';await Promise.all(images.map(im=>im.decode()));});
  assert.equal(await p.locator('.cm-portfolio__image img').evaluateAll(imgs=>imgs.every(i=>i.naturalWidth>0)),true);
  for(const [cat,n] of [['webdesign',4],['editorial',2],['branding',1],['fotografie',3],['werbung',6],['all',16]]){
   await p.locator('[data-filter="'+cat+'"]').click();assert.equal(await p.locator('.cm-portfolio__item:visible').count(),n);
  }
  const first=cards.first().locator('a');await first.click();
  assert.ok(await p.locator('.cm-portfolio__dialog').isVisible());
  await p.locator('.cm-portfolio__dialog-image').evaluate(im=>im.decode());
  const old=await p.locator('#portfolio-dialog-title').innerText();await p.keyboard.press('ArrowRight');assert.notEqual(await p.locator('#portfolio-dialog-title').innerText(),old);
  await p.keyboard.press('Escape');await p.locator('.cm-portfolio__dialog').waitFor({state:'hidden'});await p.waitForFunction(()=>document.activeElement?.closest('.cm-portfolio__item')!==null);
  assert.ok(await first.evaluate(e=>document.activeElement===e));
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
  await p.locator('#arbeitsproben').scrollIntoViewIfNeeded();
  await p.screenshot({path:'qa-results/portfolio-'+width+'.png',animations:'disabled'});
  await p.goto('http://127.0.0.1:8080/');assert.equal(await p.locator('.cm-home-portfolio img').count(),2);
  await p.locator('.cm-home-portfolio').scrollIntoViewIfNeeded();await p.evaluate(async()=>{await Promise.all([...document.querySelectorAll('.cm-home-portfolio img')].map(i=>{i.loading='eager';return i.decode();}));});
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
  assert.deepEqual(errors,[]);
  await p.close();
 }
}finally{await browser.close();}
console.log('PASS: portfolio 320/390/768/1440, 5 filters, original images, lightbox keyboard and focus, homepage images');
