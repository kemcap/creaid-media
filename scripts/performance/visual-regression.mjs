// Compare two trusted static builds on isolated loopback origins.
import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync,realpathSync,rmSync} from 'node:fs';
import {resolve,join,relative,sep,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {localBuildServer} from './browser-coverage.mjs';
const inside=(a,b)=>{const r=relative(a,b);return r===''||(!r.startsWith('..'+sep)&&r!=='..'&&!r.startsWith(sep));};
const future=p=>existsSync(p)?realpathSync(p):join(future(dirname(p)),relative(dirname(p),p));
const validRoute=p=>typeof p==='string'&&/^\/[A-Za-z0-9_./-]*$/.test(p)&&!p.split('/').some(x=>x.startsWith('.'));
export async function compareVisual({before,after,output,toolRoot,routes=['/'],viewports=[390,1440],maxDiffRatio=0.005}){
  before=realpathSync(before);after=realpathSync(after);output=resolve(output);toolRoot=resolve(toolRoot);
  if(existsSync(output)||[before,after].some(root=>inside(root,future(output))||inside(future(output),root)))throw Error('Use new isolated output');
  if(!Array.isArray(routes)||!routes.length||routes.length>20||new Set(routes).size!==routes.length||routes.some(p=>!validRoute(p))||!Array.isArray(viewports)||!viewports.length||viewports.length>5||new Set(viewports).size!==viewports.length||viewports.some(w=>!Number.isInteger(w)||w<320||w>2560)||!Number.isFinite(maxDiffRatio)||maxDiffRatio<0||maxDiffRatio>0.1)throw Error('Invalid comparison configuration');
  const require=createRequire(join(toolRoot,'package.json'));
  if(require('playwright/package.json').version!=='1.56.1'||require('pngjs/package.json').version!=='7.0.0')throw Error('Unsupported browser or PNG tool version');
  const {chromium}=require('playwright'),{PNG}=require('pngjs');
  const pixelmatch=(await import(pathToFileURL(require.resolve('pixelmatch')).href)).default;
  let a,b,browser,created=false;
  const rows=[];
  try{
    a=await localBuildServer(before);b=await localBuildServer(after);
    browser=await chromium.launch({headless:true});
    mkdirSync(output,{recursive:false});created=true;
    async function capture(server,route,width,position){
      const context=await browser.newContext({viewport:{width,height:width<600?844:900},deviceScaleFactor:1,reducedMotion:'reduce',serviceWorkers:'block',locale:'de-DE',timezoneId:'UTC',colorScheme:'light'});
      try{
        const failures=new Set(),blocked=new Set();
        await context.route('**/*',async r=>{
          const url=new URL(r.request().url());
          if(url.origin!==server.origin||!['GET','HEAD'].includes(r.request().method())){blocked.add(url.origin);await r.abort();}else await r.continue();
        });
        await context.routeWebSocket('**/*',ws=>ws.close());
        const page=await context.newPage();
        page.on('pageerror',e=>failures.add('js: '+String(e.message).slice(0,200)));
        page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(server.origin+'/'))failures.add('HTTP '+r.status()+' '+new URL(r.url()).pathname);});
        const res=await page.goto(server.origin+route,{waitUntil:'load',timeout:30000});
        if(!res?.ok()||!page.url().startsWith(server.origin+'/'))throw Error('Cannot load route: '+route);
        await page.evaluate(()=>document.fonts.ready);
        if(position==='middle')await page.evaluate(()=>window.scrollTo(0,Math.max(0,(document.documentElement.scrollHeight-innerHeight)/2)));
        await page.waitForTimeout(350);
        const info=await page.evaluate(()=>({title:document.title,h1:[...document.querySelectorAll('h1')].map(x=>x.textContent.trim()),scrollHeight:document.documentElement.scrollHeight,horizontalOverflow:document.documentElement.scrollWidth>innerWidth,brokenImages:[...document.images].filter(i=>i.complete&&i.naturalWidth===0&&(i.currentSrc||i.src)).length}));
        const bytes=await page.screenshot({animations:'disabled',caret:'hide',fullPage:false,timeout:15000});
        return {bytes,info,failures:[...failures].sort(),blockedOrigins:blocked.size};
      }finally{await context.close();}
    }
    for(let i=0;i<routes.length;i++)for(const width of viewports)for(const position of ['top','middle']){
      const route=routes[i],name='page-'+(i+1)+'-'+width+'-'+position;
      const left=await capture(a,route,width,position),right=await capture(b,route,width,position);
      const p=PNG.sync.read(left.bytes),q=PNG.sync.read(right.bytes);
      if(p.width!==q.width||p.height!==q.height)throw Error('Screenshot dimensions differ');
      const diff=new PNG({width:p.width,height:p.height});
      const pixels=pixelmatch(p.data,q.data,diff.data,p.width,p.height,{threshold:0.1,includeAA:false});
      const ratio=pixels/(p.width*p.height);
      const changedContent=left.info.title!==right.info.title||JSON.stringify(left.info.h1)!==JSON.stringify(right.info.h1);
      const newFailures=right.failures.filter(x=>!left.failures.includes(x));
      const findings=[];
      if(ratio>maxDiffRatio)findings.push('pixel-difference');
      if(changedContent)findings.push('title-or-h1-changed');
      if(right.info.horizontalOverflow&&!left.info.horizontalOverflow)findings.push('new-horizontal-overflow');
      if(right.info.brokenImages>left.info.brokenImages)findings.push('new-broken-images');
      if(Math.abs(right.info.scrollHeight-left.info.scrollHeight)>2)findings.push('document-height-changed');
      if(newFailures.length)findings.push('new-browser-errors');
      writeFileSync(join(output,name+'-before.png'),left.bytes,{flag:'wx'});
      writeFileSync(join(output,name+'-after.png'),right.bytes,{flag:'wx'});
      writeFileSync(join(output,name+'-diff.png'),PNG.sync.write(diff),{flag:'wx'});
      rows.push({route,width,position,pixels,ratio,findings,newFailures,before:left.info,after:right.info,blockedOrigins:[left.blockedOrigins,right.blockedOrigins],screenshots:{before:name+'-before.png',after:name+'-after.png',diff:name+'-diff.png'}});
    }
    const report={mode:'local-visual-regression',maxDiffRatio,rows,passed:rows.every(r=>r.findings.length===0),limitations:['Top and middle viewport samples only, not comprehensive page or interactive-state coverage.','Reduced motion, isolated browser contexts, external requests blocked. Compare on same machine. Dynamic content and timing can cause false positives.','Pixelmatch threshold 0.1 excludes antialias differences; passing is not release approval.','Private reports/screenshots may contain nonpublic content; never publish them automatically.']};
    writeFileSync(join(output,'visual-report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});return report;
  }catch(error){if(created)rmSync(output,{recursive:true,force:true});throw error;}
  finally{if(browser)await browser.close();if(a)await a.close();if(b)await b.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const [before,after,output,toolRoot,...routes]=process.argv.slice(2);
  if(!before||!after||!output||!toolRoot)throw Error('Usage: node scripts/performance/visual-regression.mjs <before-build> <after-build> <new-report-dir> <tool-dir> [routes...]');
  const report=await compareVisual({before,after,output,toolRoot,routes:routes.length?routes:['/']});
  console.log(JSON.stringify({samples:report.rows.length,passed:report.passed,findings:report.rows.filter(r=>r.findings.length).length},null,2));
  if(!report.passed)process.exitCode=1;
}
