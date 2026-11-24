import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const b=await chromium.launch();
try{
 for(const viewport of [{width:390,height:844},{width:1440,height:900}]){
  const p=await b.newPage({viewport,reducedMotion:'reduce'});
  await p.goto('http://127.0.0.1:8080/creaid-blog');
  await p.locator('#jNext').click();
  await p.waitForFunction(()=>document.querySelector('#jPageNumber').textContent.startsWith('2 /'));
  assert.equal(await p.evaluate(()=>document.activeElement.id),'journal-results');
  const result=await p.evaluate(()=>({top:document.querySelector('#journal-results').getBoundingClientRect().top,header:document.querySelector('#cm-global-header').getBoundingClientRect().bottom,feature:document.querySelector('#leitartikel').getBoundingClientRect().bottom,visible:[...document.querySelectorAll('.j-card[data-cat]')].filter(e=>!e.hidden).length}));
  assert.ok(result.top>=result.header-2&&result.top<viewport.height/2,'Pagination did not return directly to results: '+JSON.stringify(result));
  assert.ok(result.feature<result.header,'Featured image visible after pagination');
  assert.ok(result.visible>0&&result.visible<=6);
  await p.locator('#jPrev').click();
  await p.waitForFunction(()=>document.querySelector('#jPageNumber').textContent.startsWith('1 /'));
  await p.locator('#jSearch').fill('ZZZ-QA-NO-MATCH-987654');
  assert.equal(await p.locator('.j-card[data-cat]:visible').count(),0);
  await p.locator('#jSearch').fill('');
  assert.ok(await p.locator('.j-card[data-cat]:visible').count()>0);
  await p.close();
  console.log('PASS: Journal pagination, results focus and search at '+viewport.width+'px');
 }
}finally{await b.close();}
