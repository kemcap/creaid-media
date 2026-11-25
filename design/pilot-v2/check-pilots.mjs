import assert from 'node:assert/strict';import{chromium}from'playwright';import{readFileSync}from'node:fs';import{execFileSync}from'node:child_process';
const keys=['webdesign-fuer-handwerksbetriebe','warum-bringt-meine-website-keine-kunden','google-maps-auffindbarkeit-verbessern'];
const expected=['.creaid-editorial-checklist','.creaid-editorial-comparison','.creaid-editorial-faq'];
const old='9b299da278701a6cafac28bfd37338b5f10b34ee';
for(const key of keys){
 const path='src/posts/'+key+'.njk';
 const imageTags=s=>[...s.matchAll(/<img\b[^>]*>/gi)].map(m=>m[0]);
 assert.deepEqual(imageTags(readFileSync(path,'utf8')),imageTags(execFileSync('git',['show',old+':'+path],{encoding:'utf8'})),key+' image markup changed');
}
const b=await chromium.launch();
try{for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:360,height:640}]){
 for(let i=0;i<keys.length;i++){
 const p=await b.newPage({viewport,reducedMotion:'reduce'});const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url())});
 await p.goto('http://127.0.0.1:8080/'+keys[i]);await p.evaluate(async()=>{for(const im of document.querySelectorAll('main img')){im.loading='eager';await im.decode()}});
 assert.equal(await p.locator('h1').count(),1);assert.equal(await p.locator('main .creaid-editorial-v2').count(),1);
 assert.equal(await p.locator(expected[i]).count(),1);
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth<=2));
 assert.deepEqual(errors,[]);
 const details=p.locator('.creaid-editorial-faq details').first();if(await details.count()){await details.locator('summary').click();assert.equal(await details.getAttribute('open'),'');}
 await p.screenshot({path:'pilot-'+i+'-'+viewport.width+'.png',fullPage:true,animations:'disabled'});await p.close();
 }
 const p=await b.newPage({viewport,reducedMotion:'reduce'});await p.goto('http://127.0.0.1:8080/');
 const hero=p.locator('.cm-home-hero-image img');assert.match(await hero.getAttribute('src'),/creative-media-nurse/);await hero.evaluate(i=>i.decode());assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth<=2));await p.screenshot({path:'pilot-hero-'+viewport.width+'.png',fullPage:false,animations:'disabled'});await p.close();
 console.log('PILOT PASS '+viewport.width+'px');
}}finally{await b.close()}
