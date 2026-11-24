import assert from 'node:assert/strict';import {chromium} from 'playwright';
const b=await chromium.launch();
try{for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:360,height:600}]){
 const p=await b.newPage({viewport,reducedMotion:'reduce'});const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url())});
 await p.goto('http://127.0.0.1:8080/',{waitUntil:'load'});
 await p.locator('#kontakt-abschluss').scrollIntoViewIfNeeded();
 await p.evaluate(async()=>{for(const i of document.querySelectorAll('main img')){i.loading='eager';await i.decode();}});
 assert.equal(await p.locator('main h1').count(),1);
 assert.equal(await p.locator('main > section').count(),8);
 assert.equal(await p.locator('main img[src^="/assets/portfolio/"]').count(),6);
 assert.equal(await p.locator('.cm-home-article-grid article').count(),3);
 assert.equal(await p.locator('.cm-home-questions details').count(),3);
 assert.equal(await p.locator('#kontakt-abschluss .button-primary').isVisible(),true);
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth<=2));
 assert.deepEqual(errors,[]);
 await p.locator('.cm-home-questions summary').first().click();assert.equal(await p.locator('.cm-home-questions details[open]').count(),1);
 await p.evaluate(()=>window.scrollTo(0,0));await p.screenshot({path:'phase3-home-'+viewport.width+'.png',fullPage:true,animations:'disabled'});
 await p.close();console.log('PASS editorial homepage '+viewport.width+'px');
}}finally{await b.close();}
