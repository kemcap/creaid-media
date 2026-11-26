// Compare repeated Lighthouse JSON laboratory measurements, without running browsers or fetching URLs.
import { readFileSync,writeFileSync,existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const metrics={performance:'score',lcp:'largest-contentful-paint',fcp:'first-contentful-paint',cls:'cumulative-layout-shift',tbt:'total-blocking-time',speedIndex:'speed-index'};
const median=values=>{const s=[...values].sort((a,b)=>a-b);const i=Math.floor(s.length/2);return s.length%2?s[i]:(s[i-1]+s[i])/2;};
function normalize(r){
  if(r.runtimeError)throw Error('Lighthouse runtime error');
  const settings=r.configSettings??{};
  const values={};
  for(const [k,id] of Object.entries(metrics)){
    const value=k==='performance'?r.categories?.performance?.score:r.audits?.[id]?.numericValue;
    if(!Number.isFinite(value)||value<0||(k==='performance'&&value>1))throw Error('Missing or invalid metric: '+k);
    values[k]=k==='performance'?value*100:value;
  }
  const fingerprint=JSON.stringify({version:r.lighthouseVersion,formFactor:settings.formFactor,throttlingMethod:settings.throttlingMethod,throttling:settings.throttling,screenEmulation:settings.screenEmulation,locale:settings.locale});
  if(!r.lighthouseVersion||!settings.formFactor||!settings.throttlingMethod)throw Error('Missing measurement configuration');
  return {values,fingerprint};
}
export function compareLighthouse(before,after){
  if(!Array.isArray(before)||!Array.isArray(after)||before.length<3||before.length!==after.length)throw Error('Provide equally sized groups of at least three runs');
  const a=before.map(normalize),b=after.map(normalize);
  if([...a,...b].some(x=>x.fingerprint!==a[0].fingerprint))throw Error('Lighthouse configurations differ');
  const rows=Object.keys(metrics).map(metric=>{
    const old=a.map(x=>x.values[metric]),next=b.map(x=>x.values[metric]),baseline=median(old),candidate=median(next);
    return {metric,unit:metric==='performance'?'points':metric==='cls'?'unitless':'ms',before:baseline,after:candidate,delta:candidate-baseline,beforeRange:[Math.min(...old),Math.max(...old)],afterRange:[Math.min(...next),Math.max(...next)]};
  });
  return {mode:'lighthouse-lab-comparison',runsPerGroup:a.length,configuration:JSON.parse(a[0].fingerprint),rows,limitations:['Caller must verify same page/content, browser, machine, cache state and test conditions; JSON configuration equality is not proof.','Lab values only; TBT is not INP, no real-user Core Web Vitals or guaranteed score.','Positive score delta is favorable; negative timing/CLS deltas are favorable. Ranges show run variability.']};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const args=process.argv.slice(2),sep=args.indexOf('--after'),out=args.indexOf('--output');
  if(args[0]!=='--before'||sep<0||out<sep||out!==args.length-2||existsSync(args[out+1]))throw Error('Usage: node scripts/performance/compare-lighthouse.mjs --before a.json b.json c.json --after d.json e.json f.json --output new.json');
  const read=paths=>paths.map(p=>JSON.parse(readFileSync(p,'utf8')));
  const report=compareLighthouse(read(args.slice(1,sep)),read(args.slice(sep+1,out)));
  writeFileSync(args[out+1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(report.rows,null,2));
}
