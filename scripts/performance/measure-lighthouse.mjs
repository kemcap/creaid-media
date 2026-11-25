// Automated Lighthouse lab runs against a trusted local build, never a public URL.
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {existsSync,mkdirSync,readFileSync,writeFileSync,realpathSync} from 'node:fs';
import {join,resolve,relative,sep,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {localBuildServer} from './browser-coverage.mjs';
const validRoute=p=>typeof p==='string'&&/^\/[A-Za-z0-9_./-]*$/.test(p)&&!p.split('/').some(x=>x.startsWith('.'));
const future=p=>existsSync(p)?realpathSync(p):join(future(dirname(p)),relative(dirname(p),p));
function exec(file,args,env){
  return new Promise((done,fail)=>{
    const proc=spawn(file,args,{env,stdio:['ignore','ignore','ignore'],shell:false,windowsHide:true});
    const timeout=setTimeout(()=>{proc.kill();fail(Error('Lighthouse timed out'));},150000);
    proc.once('error',e=>{clearTimeout(timeout);fail(e);});
    proc.once('exit',code=>{clearTimeout(timeout);if(code===0)done();else fail(Error('Lighthouse exited '+code));});
  });
}
export async function measureLighthouse({source,output,toolRoot,routes=['/'],runs=3,formFactor='mobile'}){
  if(!Array.isArray(routes)||!routes.length||routes.length>10||new Set(routes).size!==routes.length||routes.some(p=>!validRoute(p))||!Number.isInteger(runs)||runs<1||runs>5||!['mobile','desktop'].includes(formFactor))throw Error('Invalid Lighthouse configuration');
  source=realpathSync(source);output=resolve(output);toolRoot=resolve(toolRoot);
  const r=relative(source,future(output));if(existsSync(output)||r===''||(!r.startsWith('..'+sep)&&r!=='..'&&!r.startsWith(sep)))throw Error('Keep new Lighthouse reports outside build');
  const require=createRequire(join(toolRoot,'package.json'));
  if(require('playwright/package.json').version!=='1.56.1')throw Error('Expected Playwright 1.56.1');
  const lighthouseRoot=join(toolRoot,'node_modules','lighthouse');
  const packageInfo=JSON.parse(readFileSync(join(lighthouseRoot,'package.json'),'utf8'));
  if(packageInfo.version!=='12.8.2')throw Error('Expected Lighthouse 12.8.2');
  const cli=join(lighthouseRoot,'cli','index.js');
  const chromePath=require('playwright').chromium.executablePath();
  if(!existsSync(cli)||!existsSync(chromePath))throw Error('Install Lighthouse CLI and Playwright Chromium first');
  const server=await localBuildServer(source);
  try{
    mkdirSync(output,{recursive:false});
    const results=[];
    for(let i=0;i<routes.length;i++)for(let run=1;run<=runs;run++){
      const file='route-'+(i+1)+'-run-'+run+'.json',dest=join(output,file),url=server.origin+routes[i];
      const flags='--headless --disable-background-networking --proxy-server=http://127.0.0.1:1 --proxy-bypass-list=127.0.0.1';
      const args=[cli,url,'--quiet','--only-categories=performance','--output=json','--output-path='+dest,'--chrome-flags='+flags];
      if(formFactor==='desktop')args.push('--preset=desktop');
      await exec(process.execPath,args,{...process.env,CHROME_PATH:chromePath});
      const lhr=JSON.parse(readFileSync(dest,'utf8'));
      if(lhr.runtimeError||!Number.isFinite(lhr.categories?.performance?.score)||!lhr.finalDisplayedUrl?.startsWith(server.origin+'/'))throw Error('Invalid Lighthouse result');
      results.push({route:routes[i],run,file,score:lhr.categories.performance.score*100});
    }
    const report={mode:'local-lighthouse-lab',runs,formFactor,results,limitations:['Fresh Lighthouse sessions against a local no-store server; not a hosting or warm-cache benchmark.','External HTTP(S) requests are intentionally impeded by a dead proxy; this is not a full network sandbox. Run only trusted builds in an isolated environment without credentials.','Results contain internal URLs and screenshots: never publish them automatically. One/two runs are smoke tests, not suitable for the repeated comparison.']};
    writeFileSync(join(output,'measurement-summary.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});return report;
  }finally{await server.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const [source,output,toolRoot,configFile]=process.argv.slice(2);
  if(!source||!output||!toolRoot||!configFile||process.argv.length!==6)throw Error('Usage: node scripts/performance/measure-lighthouse.mjs <build> <new-report-dir> <tool-dir> <config.json>');
  const config=JSON.parse(readFileSync(configFile,'utf8'));
  if(Object.keys(config).some(k=>!['routes','runs','formFactor'].includes(k)))throw Error('Unknown Lighthouse config key');
  const result=await measureLighthouse({source,output,toolRoot,...config});
  console.log(JSON.stringify({measurements:result.results.length,formFactor:result.formFactor},null,2));
}
