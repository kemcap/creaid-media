import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const load=path=>readFileSync(path,'utf8');
const files=readdirSync('dist').filter(name=>name.endsWith('.html'));
assert.ok(files.length>=50, 'Expected complete HTML preview');
for(const name of files) {
  const html=load('dist/'+name);
  assert.ok(html.includes('href="/assets/hero-balance.css"'),name+' missing hero layout');
  assert.ok(html.includes('src="/assets/adaptive-scroll.js"'),name+' missing adaptive input helper');
}
const index=load('dist/index.html');
assert.equal((index.match(/class="cm-hero-ticker__group"/g)||[]).length,2,'Ticker needs identical seamless sequences');
assert.equal((index.match(/class="cm-hero-ticker__item"/g)||[]).length,8,'Four services duplicated in ticker');
for(const phrase of ['Webdesign &amp; Entwicklung','Digitales Marketing','Branding &amp; Grafikdesign','KI &amp; Automatisierung']) {
  assert.ok(index.includes(phrase),'Ticker missing '+phrase);
}
assert.ok(!index.includes('ANALYSE / KONZEPT / UMSETZUNG</span></div>'),'Old static hero floor still present');
assert.ok(index.includes('class="axes"'),'Original crosshair removed');
assert.ok(index.includes('class="motion-track track-statement-contact"'),'Mask scroll scene must stay intact');
assert.equal((index.match(/id="cm-global-footer"/g)||[]).length,1,'Only one global footer is allowed');
const balance=load('dist/assets/hero-balance.css');
for(const selector of [
  '.hero-stage .hero-content',
  'main > .a-normal:first-of-type > .a-shell.a-l',
  '.page-top .service-hero-inner',
  '.j-hero .j-shell',
  '.l-hero .l-hero-in',
  '.cm-hero-ticker__track',
  '.hero-stage .axes b'
])assert.ok(balance.includes(selector),'Missing layout or interaction style: '+selector);
assert.ok(balance.includes('justify-content:center'),'Desktop centering missing');
assert.ok(balance.includes('position:relative;height:auto;min-height:700px;overflow:visible'),'Short desktop viewports must not clip hero CTAs');
assert.ok(balance.includes('min(10.05vw,13vh)'),'Viewport-height responsive typography missing');
assert.ok(balance.includes('31s linear infinite'),'Ticker must run smoothly');
assert.ok(balance.includes('translate3d(-50%,0,0)'),'Ticker loop incomplete');
assert.ok(balance.includes('@media (prefers-reduced-motion:reduce)'),'Ticker needs reduced-motion fallback');
assert.ok(balance.includes('cm-cross-touch-active'),'Mobile crosshair visual state missing');
const homeJS=load('dist/assets/home-motion-v5.js');
assert.ok(homeJS.includes('adaptive.progress(t,target)'),'Home animations must use adaptive progress');
assert.ok(homeJS.includes('pointerdown')&&homeJS.includes('pointermove')&&homeJS.includes('pointercancel'),'Crosshair needs mouse/touch handling');
assert.ok(homeJS.includes("const timers=[0,233,467,700]"),'Keep existing service card timing');
assert.ok(homeJS.includes('contact.style.clipPath'),'Keep existing statement/contact wipe');
for(const file of ['agency-pages.js','specialty-pages.js','journal.js','motion-v4.js','scrollstory.js']){
  assert.ok(load('dist/assets/'+file).includes('CreAidAdaptiveScroll?.progress'),file+' not using shared input smoothing');
}
const events={};
let clock=0;
const media={matches:false};
const fakeWindow={
  innerHeight:900,
  matchMedia:()=>media,
  addEventListener:(name,handler,options)=>(events[name]??=[]).push({handler,options})
};
runInNewContext(load('dist/assets/adaptive-scroll.js'),{window:fakeWindow,performance:{now:()=>clock}});
const controller=fakeWindow.CreAidAdaptiveScroll;
assert.equal(typeof controller.progress,'function','Adaptive progress API missing');
const node={};
assert.equal(controller.progress(node,0).value,0,'First paint should never animate from zero unnecessarily');
clock=20;
events.wheel[0].handler({deltaMode:1,deltaY:3});
clock=36;
const step=controller.progress(node,1);
assert.ok(step.pending && step.value>0 && step.value<1,'Wheel steps should ease animation progress');
clock=72;
const step2=controller.progress(node,1);
assert.ok(step2.value>step.value && step2.value<1,'Wheel easing must converge smoothly');
clock=700;
assert.equal(controller.progress(node,1).value,1,'Controller must catch up when wheel becomes idle');
clock=800;
events.keydown[0].handler({key:'PageDown'});
assert.equal(controller.progress(node,.15).value,.15,'Keyboard input must not be delayed');
clock=1600;
events.pointerdown[0].handler({pointerType:'touch'});
assert.equal(controller.progress(node,.8).value,.8,'Touch interaction must use native progress');
media.matches=true;
assert.equal(controller.progress(node,.2).value,.2,'Reduced motion must bypass smoothing');
assert.ok(events.wheel[0].options.passive,'Wheel events must not be intercepted');

// Shared compact tracks and interactive service hero coverage.
for(const filename of ['webdesign.html','branding.html','marketing.html','ki-automatisierung.html']){
  const page=load('dist/'+filename);
  for(const part of ['class="page-top"','service-story','service-detail','service-closing','/assets/service-crosshair.js'])
    assert.ok(page.includes(part),filename+' missing '+part);
}
for(const filename of ['leistungen.html','onlineshops-ecommerce.html','google-ads-social-media.html','printdesign-editorial.html','seo-content-marketing.html','ki-workflows-crm.html','webdesign-handwerker.html']){
  const page=load('dist/'+filename);
  assert.ok(page.includes('sp-hero')&&page.includes('/assets/service-crosshair.js'),filename+' missing shared hero crosshair');
  assert.ok(page.includes('sp-track'),filename+' missing specialty chapters');
}
for(const expected of [
  'main > .service-story.web-story {height:235svh}',
  'main > .service-detail {height:205svh}',
  'main > .service-closing {height:170svh}',
  'main > .a-track {height:175vh',
  'main > .a-track.sp-story {height:235vh',
  'main > .sp-track#leistungen-im-detail {height:205vh',
  'main > .sp-track#ablauf {height:185vh',
  'main > .j-feature-track {height:155vh',
  'main > .service-story.web-story {height:265svh}',
  '@media(max-width:900px) and (max-height:610px)',
  '@media(prefers-reduced-motion:reduce)',
  '.sp-hero.cm-crosshair-ready > .a-grid-cross {display:none}'
])assert.ok(balance.includes(expected),'Missing shared motion rule: '+expected);
const crossJS=load('dist/assets/service-crosshair.js');
const pointerHandlers={}, props={}, classes=new Set();
const fakeHero={
 querySelector:()=>null, prepend(el){this.cross=el},
 classList:{add:s=>classes.add(s)},
 getBoundingClientRect:()=>({left:0,top:0,width:1000,height:500}),
 addEventListener:(name,fn,opts)=>pointerHandlers[name]={fn,opts}
};
const crossClasses=new Set();
const fakeCross={setAttribute(k,v){this[k]=v},append(){},
 style:{setProperty:(k,v)=>props[k]=v},
 classList:{add:x=>crossClasses.add(x),remove:x=>crossClasses.delete(x)}};
let nextFrame, touchTimer;
const noMotion={matches:false,addEventListener(){}};
runInNewContext(crossJS,{
 document:{querySelectorAll:()=>[fakeHero],createElement:tag=>tag==='div'?fakeCross:{}},
 window:{matchMedia:q=>q.includes('reduced-motion')?noMotion:{matches:true}},
 requestAnimationFrame:fn=>{nextFrame=fn;return 1},cancelAnimationFrame:()=>{nextFrame=null},
 setTimeout:fn=>{touchTimer=fn;return 1},clearTimeout:()=>{touchTimer=null}
});
assert.ok(classes.has('cm-crosshair-ready')&&fakeCross['aria-hidden']==='true');
assert.ok(pointerHandlers.pointermove.opts.passive,'Do not intercept native scroll');
pointerHandlers.pointermove.fn({pointerType:'mouse',clientX:900,clientY:100});
assert.ok(nextFrame);nextFrame();
assert.ok(parseFloat(props['--cm-cross-x'])>60,'Mouse follow failed');
pointerHandlers.pointerdown.fn({pointerType:'touch',pointerId:1,clientX:250,clientY:125});
assert.equal(props['--cm-cross-x'],'25.000%');
assert.ok(crossClasses.has('cm-cross-touch-active'));
pointerHandlers.pointercancel.fn({pointerType:'touch',pointerId:1});
assert.ok(touchTimer);touchTimer();
assert.ok(!crossClasses.has('cm-cross-touch-active'),'Touch effect did not fade');
console.log('PASS: '+files.length+' pages, responsive hero rules, looping service ticker, accessible crosshair, adaptive motion behavior.');
