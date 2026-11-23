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
console.log('PASS: '+files.length+' pages, responsive hero rules, looping service ticker, accessible crosshair, adaptive motion behavior.');
