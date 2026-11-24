import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base='http://127.0.0.1:8080/creaid-blog';
const browser=await chromium.launch();
try{
 for(const viewport of [{width:390,height:844},{width:1440,height:900}]){
  const p=await browser.newPage({viewport,reducedMotion:'reduce'});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base);await p.locator('#jNext').click();
  await p.waitForFunction(()=>document.querySelector('#jPageNumber').textContent.startsWith('Seite 2 von'));
  assert.equal(await p.evaluate(()=>document.activeElement.id),'journal-results');
  assert.match(p.url(),/seite=2/);
  const geo=await p.evaluate(()=>({top:document.querySelector('#journal-results').getBoundingClientRect().top,header:document.querySelector('#cm-global-header').getBoundingClientRect().bottom,feature:document.querySelector('#leitartikel').getBoundingClientRect().bottom,overflow:document.documentElement.scrollWidth-innerWidth}));
  assert.ok(geo.top>=geo.header-2&&geo.top<viewport.height/2,JSON.stringify(geo));assert.ok(geo.feature<geo.header);assert.ok(geo.overflow<=2);
  await p.reload();assert.match(await p.locator('#jPageNumber').innerText(),/Seite 2 von/);
  assert.equal(await p.locator('#jArticles .j-card:visible').count(),6);
  await p.locator('#jPrev').click();assert.match(await p.locator('#jPageNumber').innerText(),/Seite 1 von/);
  await p.goBack();assert.match(await p.locator('#jPageNumber').innerText(),/Seite 2 von/);
  await p.locator('[data-filter="ecommerce"]').click();
  assert.match(p.url(),/thema=ecommerce/);
  assert.ok(await p.locator('#jArticles .j-card:visible').count()>0);
  assert.equal(await p.locator('#jArticles .j-card:visible:not([data-cat~="ecommerce"])').count(),0);
  await p.locator('#jSearch').fill('ZZZ-QA-NO-MATCH-987654');
  assert.equal(await p.locator('#jArticles .j-card:visible').count(),0);
  assert.ok(await p.locator('#jEmpty').isVisible());
  await p.locator('#jSearch').fill('');
  assert.ok(await p.locator('#jArticles .j-card:visible').count()>0);
  assert.equal(await p.locator('.j-topic-archive a').count(),19);
  assert.equal(await p.locator('.j-topic-archive').getAttribute('open'),null);
  assert.deepEqual(errors,[]);
  await p.screenshot({path:'journal-'+viewport.width+'.png',fullPage:true,animations:'disabled'});
  await p.close();console.log('PASS: journal paging, focus, URL state, filter, search and archives at '+viewport.width+'px');
 }
 const ctx=await browser.newContext({javaScriptEnabled:false});const p=await ctx.newPage();await p.goto(base);
 assert.equal(await p.locator('#jArticles .j-card:visible').count(),39);
 assert.equal(await p.locator('.j-filterbar').isVisible(),false);
 await ctx.close();console.log('PASS: all 39 articles remain available without JavaScript');
}finally{await browser.close();}
