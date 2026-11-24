import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { routeFiles } from './routes.mjs';

// Cold-cache Chromium lab measurements, not field Core Web Vitals or Lighthouse scores.
const base=process.env.CREAID_QA_URL||'http://127.0.0.1:8080';
const reference=process.env.CREAID_PERF_BASELINE||'';
const output=process.env.CREAID_QA_OUTPUT||'qa-results';
const routes=['/','/webdesign','/grafikdesign-2','/digitales-marketing','/ki-automatisierung','/online-shop-entwicklung','/creaid-blog','/google-ads-aber-keine-anfragen','/category/seo','/kontakt'];
for(const r of routes)assert.ok(Object.hasOwn(routeFiles,r),'Missing canonical route '+r);
const profiles=[
 {name:'mobile',viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,cpu:4,latency:150,down:1600000/8,up:750000/8},
 {name:'desktop',viewport:{width:1440,height:900},deviceScaleFactor:1,isMobile:false,hasTouch:false,cpu:1,latency:40,down:10000000/8,up:5000000/8}
];
const round=n=>Number.isFinite(n)?Math.round(n):null;
const median=a=>{const v=a.filter(Number.isFinite).sort((x,y)=>x-y);return v.length?(v[Math.floor((v.length-1)/2)]+v[Math.floor(v.length/2)])/2:null;};
const browser=await chromium.launch({headless:true});
const samples=[],errors=[];
async function measure(origin,route,profile,variant,iteration){
 const {name,cpu,latency,down,up,...options}=profile;
 const ctx=await browser.newContext({...options,reducedMotion:'no-preference',serviceWorkers:'block'});
 try{
  await ctx.addInitScript(()=>{
   const state=window.__perf={lcp:null,lcpElement:null,cls:0,session:0,first:0,last:0,longTasks:[],supported:PerformanceObserver.supportedEntryTypes};
   if(state.supported.includes('largest-contentful-paint'))new PerformanceObserver(list=>{for(const e of list.getEntries()){state.lcp=e.startTime;state.lcpElement=e.element?.tagName+(e.element?.id?'#'+e.element.id:'');}}).observe({type:'largest-contentful-paint',buffered:true});
   if(state.supported.includes('layout-shift'))new PerformanceObserver(list=>{for(const e of list.getEntries()){if(e.hadRecentInput)continue;if(state.session&&e.startTime-state.last<1000&&e.startTime-state.first<5000)state.session+=e.value;else{state.session=e.value;state.first=e.startTime;}state.last=e.startTime;state.cls=Math.max(state.cls,state.session);}}).observe({type:'layout-shift',buffered:true});
   if(state.supported.includes('longtask'))new PerformanceObserver(list=>{for(const e of list.getEntries())state.longTasks.push({start:e.startTime,duration:e.duration});}).observe({type:'longtask',buffered:true});
  });
  const page=await ctx.newPage();const cdp=await ctx.newCDPSession(page);
  await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency,downloadThroughput:down,uploadThroughput:up});
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpu});
  const res=await page.goto(origin+route,{waitUntil:'load',timeout:90000});
  if(!res?.ok())throw Error('HTTP '+res?.status());
  await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1200);
  const result=await page.evaluate(()=>{
   const nav=performance.getEntriesByType('navigation')[0],rs=performance.getEntriesByType('resource'),p=window.__perf;
   return {lcp:p.lcp,lcpElement:p.lcpElement,cls:p.cls,load:nav.loadEventEnd,ttfb:nav.responseStart,requests:rs.length+1,transferBytes:nav.transferSize+rs.reduce((n,e)=>n+e.transferSize,0),decodedBytes:nav.decodedBodySize+rs.reduce((n,e)=>n+e.decodedBodySize,0),blockingProxy:p.longTasks.reduce((n,t)=>n+Math.max(0,t.duration-50),0),largestResources:rs.sort((a,b)=>b.transferSize-a.transferSize).slice(0,5).map(e=>({path:new URL(e.name).pathname,bytes:e.transferSize}))};
  });
  samples.push({route,profile:name,variant,iteration,...result});
 }catch(e){errors.push({route,profile:name,variant,iteration,error:String(e.message||e)});}
 finally{await ctx.close();}
}
try{
 for(const profile of profiles)for(const route of routes)for(let i=0;i<2;i++){
  const variants=reference?(i===0?[[reference,'baseline'],[base,'candidate']]:[[base,'candidate'],[reference,'baseline']]):[[base,'candidate']];
  for(const [origin,variant] of variants)await measure(origin,route,profile,variant,i+1);
 }
}finally{await browser.close();}
const summary=[];
for(const profile of profiles)for(const route of routes){
 const aggregate=variant=>{const group=samples.filter(s=>s.route===route&&s.profile===profile.name&&s.variant===variant);return {samples:group.length,lcpMs:round(median(group.map(s=>s.lcp))),cls:median(group.map(s=>s.cls)),loadMs:round(median(group.map(s=>s.load))),requests:median(group.map(s=>s.requests)),transferBytes:round(median(group.map(s=>s.transferBytes))),blockingProxyMs:round(median(group.map(s=>s.blockingProxy)))};};
 const candidate=aggregate('candidate'),baseline=reference?aggregate('baseline'):null;
 summary.push({profile:profile.name,route,candidate,baseline,lcpAbove2500:candidate.lcpMs===null?null:candidate.lcpMs>2500,clsAbove01:candidate.cls===null?null:candidate.cls>0.1});
}
mkdirSync(output,{recursive:true});writeFileSync(output+'/performance.json',JSON.stringify({method:'Cold cache, two samples per profile and route; lab only. Blocking proxy is not INP or Lighthouse TBT.',profiles,routes,summary,samples,errors},null,2));
console.log(JSON.stringify({samples:samples.length,summary,errors},null,2));
assert.equal(errors.length,0,'Performance audit incomplete');
