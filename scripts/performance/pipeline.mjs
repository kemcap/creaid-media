// Central opt-in preview pipeline. No automatic production release.
import {mkdtempSync,mkdirSync,cpSync,rmSync,existsSync,lstatSync,readdirSync,realpathSync,readFileSync,writeFileSync} from 'node:fs';
import {join,resolve,relative,dirname,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {optimizeInput} from './optimize-input.mjs';
import {responsiveCandidates} from './responsive-images.mjs';
import {integrateResponsive} from './integrate-responsive.mjs';
import {applyHints} from './resource-hints.mjs';
import {buildPerformance} from './engine.mjs';
import {writeAudit} from './audit.mjs';
const inside=(a,b)=>{const r=relative(a,b);return r===''||(!r.startsWith('..'+sep)&&r!=='..'&&!r.startsWith(sep));};
const future=p=>existsSync(p)?realpathSync(p):join(future(dirname(p)),relative(dirname(p),p));
function validateTree(root){
  for(const e of readdirSync(root,{withFileTypes:true})){
    const p=join(root,e.name);if(e.isSymbolicLink())throw Error('Symlink not allowed: '+p);
    if(e.isDirectory())validateTree(p);else if(!e.isFile())throw Error('Unsupported file: '+p);
  }
}
export async function runPipeline({source,output,config={},toolRoot}){
  source=resolve(source);output=resolve(output);
  if(!config||typeof config!=='object'||Array.isArray(config)||Object.keys(config).some(k=>!['schemaVersion','optimize','responsive','hints','auditBudgets'].includes(k))||config.schemaVersion!==1)throw Error('Invalid pipeline configuration (schemaVersion 1)');
  if(!existsSync(join(source,'index.html'))||lstatSync(source).isSymbolicLink()||existsSync(output)||inside(realpathSync(source),future(output))||inside(future(output),realpathSync(source)))throw Error('Expected isolated static input and new output');
  validateTree(source);
  const work=mkdtempSync(join(tmpdir(),'creaid-pipeline-'));
  let current=source,created=false;
  const steps={};
  try{
    if(config.optimize){const out=join(work,'optimized');steps.optimize=await optimizeInput({source:current,output:out,config:config.optimize,toolRoot});current=join(out,'site');}
    if(config.responsive){const out=join(work,'responsive');steps.responsive=await responsiveCandidates({source:current,output:out,config:config.responsive,toolRoot});current=join(out,'site');if(config.responsive.integrate!==undefined)steps.responsiveIntegration=integrateResponsive(current,steps.responsive,config.responsive.integrate);}
    if(config.hints&&Object.keys(config.hints).length){
      if(current===source){current=join(work,'hints');cpSync(source,current,{recursive:true,errorOnExist:true,force:false});}
      steps.hints=applyHints(current,config.hints);
    }
    mkdirSync(output,{recursive:false});created=true;
    const packaged=join(output,'package');
    const report=buildPerformance({source:current,output:packaged,profile:'preview'});
    const audit=writeAudit({source:join(packaged,'site'),output:join(output,'audit'),limits:config.auditBudgets});
    const summary={schemaVersion:1,profile:'preview',steps,packaging:{pages:report.pages,verifiedAssets:report.verifiedAssets},audit:audit.summary,deployment:'not performed'};
    writeFileSync(join(output,'pipeline-report.json'),JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
    return summary;
  }catch(error){if(created)rmSync(output,{recursive:true,force:true});throw error;}
  finally{rmSync(work,{recursive:true,force:true});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const [source,output,configFile,toolRoot,...extra]=process.argv.slice(2);
  if(!source||!output||!configFile||extra.length)throw Error('Usage: node scripts/performance/pipeline.mjs <build> <new-output> <config.json> [tool-dir]');
  const result=await runPipeline({source,output,config:JSON.parse(readFileSync(configFile,'utf8')),toolRoot});
  console.log(JSON.stringify({packaging:result.packaging,audit:result.audit,deployment:result.deployment},null,2));
}
