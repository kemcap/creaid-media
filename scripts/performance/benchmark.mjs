// Repeated Lighthouse comparison of two local builds. No hosting requests.
import {existsSync,mkdirSync,readFileSync,writeFileSync,realpathSync} from 'node:fs';
import {join,resolve,relative,dirname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {measureLighthouse} from './measure-lighthouse.mjs';
import {compareLighthouse} from './compare-lighthouse.mjs';
const inside=(a,b)=>{const r=relative(a,b);return r===''||(!r.startsWith('..'+sep)&&r!=='..'&&!r.startsWith(sep));};
const future=p=>existsSync(p)?realpathSync(p):join(future(dirname(p)),relative(dirname(p),p));
export async function benchmarkBuilds({before,after,output,toolRoot,formFactor='mobile',onProgress=()=>{}}){
 const a=realpathSync(before),b=realpathSync(after),out=resolve(output);
 if(inside(a,b)||inside(b,a)||existsSync(out)||inside(a,future(out))||inside(b,future(out)))throw Error('Use separate builds and a fresh report directory outside both builds');
 if(!['mobile','desktop'].includes(formFactor))throw Error('Invalid form factor');
 mkdirSync(out,{recursive:false});
 const groups={before:[],after:[]};
 // Alternate order to reduce systematic machine warmup bias.
 for(let i=0;i<3;i++){
   for(const label of i%2===0?['before','after']:['after','before']){
     const folder=join(out,label+'-'+(i+1));
     onProgress({completed:groups.before.length+groups.after.length,total:6,stage:label,iteration:i+1});
     const measured=await measureLighthouse({source:label==='before'?a:b,output:folder,toolRoot,routes:['/'],runs:1,formFactor});
     groups[label].push(JSON.parse(readFileSync(join(folder,measured.results[0].file),'utf8')));
   }
 }
 const comparison=compareLighthouse(groups.before,groups.after);
 const report={...comparison,route:'/',formFactor,order:'alternating',limitations:[...comparison.limitations,'Local no-store HTML server: does not measure IONOS, CDN, shared cache or actual Apache compression.','Only the homepage is measured. Compare identical content; dynamic or external resources may behave differently.']};
 writeFileSync(join(out,'comparison.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 onProgress({completed:6,total:6,stage:'done'});
 return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [before,after,output,toolRoot,formFactor='mobile',...extra]=process.argv.slice(2);
 if(!before||!after||!output||!toolRoot||extra.length)throw Error('Usage: node scripts/performance/benchmark.mjs <before-site> <after-site> <new-report-dir> <browser-tool-dir> [mobile|desktop]');
 const report=await benchmarkBuilds({before,after,output,toolRoot,formFactor,onProgress:p=>console.log(JSON.stringify(p))});
 console.log(JSON.stringify(report.rows,null,2));
}
