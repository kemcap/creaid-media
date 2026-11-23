
(()=>{
'use strict';
const story=document.querySelector('.service-story');
if(!story)return;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const copies=[...story.querySelectorAll('.scene-copy')];
const steps=[...story.querySelectorAll('.stage-step')];
const assets=[...story.querySelectorAll('.chapter-asset')];
const isWeb=story.classList.contains('webdesign-story');
const laptop=story.querySelector('.device-laptop'),phone=story.querySelector('.device-phone'),card=story.querySelector('.conversion-card'),line=story.querySelector('.conversion-line');
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=(a,b,p)=>{const t=clamp((p-a)/(b-a));return t*t*(3-2*t)};
function ui(p){
 const active=p<.345?0:p<.69?1:2;
 steps.forEach((e,i)=>e.classList.toggle('active',i===active));
 const staticStory=matchMedia('(max-height:620px),(max-width:900px) and (max-height:700px),(prefers-reduced-motion:reduce)').matches;
 copies.forEach((e,i)=>e.setAttribute('aria-hidden',staticStory||i===active?'false':'true'));
 const fill=story.querySelector('.progress-fill'),num=story.querySelector('.progress-number');
 if(fill)fill.style.width=(p*100).toFixed(0)+'%';
 if(num)num.textContent=String(Math.round(p*100)).padStart(2,'0')+'%';
}
if(reduced){document.body.classList.add('reduced-motion');ui(0);copies.forEach(e=>e.setAttribute('aria-hidden','false'));return;}
const set=(el,x,y,sc,rot,opacity)=>{if(!el)return;el.style.transform=`translate(${x}%,${y}%) rotate(${rot}deg) scale(${sc})`;el.style.opacity=opacity;el.style.visibility=opacity<.015?'hidden':'visible';};
let fallbackRequest=null;
function nativeDraw(){
 const rect=story.getBoundingClientRect();
 const target=clamp(-rect.top/Math.max(1,story.offsetHeight-innerHeight));
 const sample=window.CreAidAdaptiveScroll?.progress(story,target) || {value:target,pending:false};
 const scrollProgress=sample.value;
 const p=clamp(scrollProgress/.90); // last 10% is a stable final-scene buffer
 const a=ease(.015,.24,p),b=ease(.32,.57,p),c=ease(.68,.91,p);
 const op=[1-ease(.30,.42,p),ease(.31,.42,p)*(1-ease(.65,.77,p)),ease(.66,.78,p)];
 copies.forEach((e,i)=>set(e,0,19*(1-op[i]),1,0,op[i]));
 if(isWeb){
  set(laptop,9*(1-a)-17*b-13*c,24*(1-a)+5*b+4*c,.76+.24*a-.09*b-.07*c,-9+7*a-3*b-2*c,Math.max(.35,a)*(1-.15*c));
  set(phone,65*(1-b)-24*c,27*(1-b)+10*c,.72+.28*b-.13*c,12-8*b-5*c,b);
  set(card,65*(1-c),21*(1-c)-4*c,.78+.22*c,0,c);
  if(line){line.style.opacity=c;line.style.visibility=c<.015?'hidden':'visible'}
 } else {
  set(assets[0],10*(1-a)-27*b-9*c,20*(1-a)+6*b,.77+.23*a-.18*b-.12*c,-5+5*a-7*b,Math.max(.4,a)*(1-.65*b)*(1-c));
  set(assets[1],45*(1-b)-29*c,22*(1-b)+7*c,.75+.25*b-.2*c,10-10*b-7*c,b*(1-.73*c));
  set(assets[2],45*(1-c),24*(1-c)-3*c,.75+.25*c,6-6*c,c);
 }
 ui(scrollProgress);
 if(sample.pending)fallbackRequest?.();
}
function startGSAP(){
 if(!window.gsap||!window.ScrollTrigger)return false;
 try {
  gsap.registerPlugin(ScrollTrigger);
  const tl=gsap.timeline({defaults:{ease:'none'},scrollTrigger:{trigger:story,start:'top top',end:'bottom bottom',scrub:.55,invalidateOnRefresh:true,onUpdate:self=>ui(self.progress)}});
  if(isWeb){
   gsap.set(laptop,{xPercent:9,yPercent:24,rotation:-9,scale:.76,autoAlpha:.38});
   gsap.set(phone,{xPercent:65,yPercent:27,rotation:12,scale:.72,autoAlpha:0});
   gsap.set(card,{xPercent:65,yPercent:21,scale:.78,autoAlpha:0});gsap.set(line,{autoAlpha:0});
   tl.to(laptop,{autoAlpha:1,xPercent:0,yPercent:0,rotation:-2,scale:1,duration:.85},.05)
   .to(laptop,{xPercent:-17,yPercent:5,rotation:-5,scale:.91,duration:1.05},1.05)
   .to(phone,{autoAlpha:1,xPercent:0,yPercent:0,rotation:4,scale:1,duration:.92},1.1)
   .to(laptop,{xPercent:-30,yPercent:9,rotation:-7,scale:.84,duration:.98},2.35)
   .to(phone,{xPercent:-24,yPercent:10,rotation:-1,scale:.87,duration:.96},2.35)
   .to(line,{autoAlpha:1,duration:.45},2.5)
   .to(card,{autoAlpha:1,xPercent:0,yPercent:0,scale:1,duration:.8},2.54);
  }else{
   gsap.set(assets[0],{autoAlpha:.4,xPercent:10,yPercent:20,rotation:-5,scale:.77});
   gsap.set(assets[1],{autoAlpha:0,xPercent:45,yPercent:22,rotation:10,scale:.75});
   gsap.set(assets[2],{autoAlpha:0,xPercent:45,yPercent:24,rotation:6,scale:.75});
   tl.to(assets[0],{autoAlpha:1,xPercent:0,yPercent:0,rotation:0,scale:1,duration:.85},.05)
   .to(assets[0],{autoAlpha:.37,xPercent:-27,yPercent:6,rotation:-7,scale:.82,duration:.95},1.04)
   .to(assets[1],{autoAlpha:1,xPercent:0,yPercent:0,rotation:0,scale:1,duration:.9},1.1)
   .to(assets[0],{autoAlpha:0,xPercent:-36,scale:.7,duration:.6},2.3)
   .to(assets[1],{autoAlpha:.27,xPercent:-29,yPercent:7,rotation:-7,scale:.80,duration:.89},2.31)
   .to(assets[2],{autoAlpha:1,xPercent:0,yPercent:0,rotation:0,scale:1,duration:.92},2.5);
  }
  gsap.set(copies.slice(1),{y:19,autoAlpha:0});gsap.set(copies[0],{y:0,autoAlpha:1});
  tl.to(copies[0],{y:-19,autoAlpha:0,duration:.20},1.03).to(copies[1],{y:0,autoAlpha:1,duration:.25},1.29)
  .to(copies[1],{y:-19,autoAlpha:0,duration:.20},2.28).to(copies[2],{y:0,autoAlpha:1,duration:.25},2.54);
  // Timeline's visual finale is at 90% of scroll progress, then holds to 100%.
  const activeDuration=tl.duration();
  tl.to({hold:0},{hold:1,duration:activeDuration/9,ease:'none'},activeDuration);
  ui(0);window.addEventListener('load',()=>ScrollTrigger.refresh());ScrollTrigger.refresh();return true;
 } catch(e){console.warn('GSAP unavailable; native fallback',e);return false;}
}
function fallback(){
 document.body.classList.add('native-fallback');let waiting=false;
 function update(){if(waiting)return;waiting=true;requestAnimationFrame(()=>{waiting=false;nativeDraw()})}
 fallbackRequest=update;
 addEventListener('scroll',update,{passive:true});addEventListener('resize',update,{passive:true});update();
}
// Load the pinned local GSAP files. Keep the native fallback if loading fails.
function load(url){return new Promise(done=>{const el=document.createElement('script');el.src=url;el.async=true;el.onload=()=>done(true);el.onerror=()=>done(false);document.head.appendChild(el)})}
(async()=>{
 const ok=await load('/assets/vendor/gsap.min.js');
 const plugin=ok?await load('/assets/vendor/ScrollTrigger.min.js'):false;
 if(!plugin||!startGSAP())fallback();
})();
})();
