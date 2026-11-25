// Local browser coverage. Reports only, never removes CSS or executes clicks/forms.
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {existsSync,lstatSync,realpathSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join,extname,relative,sep} from 'node:path';
import {pathToFileURL} from 'node:url';

const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.avif':'image/avif','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.woff2':'font/woff2','.json':'application/json'};
const pathOK=p=>typeof p==='string'&&/^\/[A-Za-z0-9_./-]*$/.test(p)&&!p.split('/').some(x=>x==='.'||x==='..'||x.startsWith('.'));
function inventory(root){
  for(const e of readdirSync(root,{withFileTypes:true})){
    const p=join(root,e.name);
    if(e.isSymbolicLink())throw Error('Symlink forbidden: '+p);
    if(e.isDirectory())inventory(p);else if(!e.isFile())throw Error('Nonregular file: '+p);
  }
}
export async function localBuildServer(source){
  source=resolve(source);
  if(lstatSync(source).isSymbolicLink()||!existsSync(join(source,'index.html')))throw Error('Expected static build');
  inventory(source);
  const server=createServer((req,res)=>{
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
    const path=req.url.split('?')[0];
    if(!pathOK(path)){res.writeHead(404).end();return;}
    const candidates=path.endsWith('/')?[path+'index.html']:[path,path+'.html',path+'/index.html'];
    for(const p of candidates){
      const file=join(source,p.slice(1)),ext=extname(file);
      if(!Object.hasOwn(types,ext)||!existsSync(file)||!lstatSync(file).isFile())continue;
      const bytes=readFileSync(file);
      res.writeHead(200,{'Content-Type':types[ext],'Content-Length':bytes.length});
      res.end(req.method==='HEAD'?undefined:bytes);return;
    }
    res.writeHead(404).end();
  });
  await new Promise((done,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',done);});
  return {origin:'http://127.0.0.1:'+server.address().port,close:()=>new Promise(done=>{server.close(done);server.closeAllConnections();})};
}
function coverageRows(entries,origin){
  return entries.filter(e=>e.url.startsWith(origin+'/')&&typeof e.text==='string').map(e=>{
    const total=e.text.length;
    const used=e.ranges.reduce((sum,r)=>sum+r.end-r.start,0);
    return {url:new URL(e.url).pathname,units:'UTF-16 code units',total,used,unobserved:total-used,usedRanges:e.ranges};
  });
}
export async function measureCoverage({source,routes=['/'],toolRoot,viewports=[390,1440]}){
  if(!Array.isArray(routes)||!routes.length||routes.length>20||routes.some(p=>!pathOK(p))||!Array.isArray(viewports)||!viewports.length||viewports.length>4||viewports.some(w=>!Number.isInteger(w)||w<320||w>2560))throw Error('Invalid routes/viewports');
  const require=createRequire(join(resolve(toolRoot),'package.json'));
  if(require('playwright/package.json').version!=='1.56.1')throw Error('Expected Playwright 1.56.1');
  const {chromium}=require('playwright');
  const server=await localBuildServer(source);
  let browser;
  const rows=[];
  try{
    browser=await chromium.launch({headless:true});
    for(const width of viewports)for(const route of routes){
      const context=await browser.newContext({viewport:{width,height:width<600?844:900},serviceWorkers:'block'});
      try{
        const blocked=new Set();
        await context.route('**/*',async r=>{
          const u=new URL(r.request().url());
          if(u.origin!==server.origin||!['GET','HEAD'].includes(r.request().method())){blocked.add(u.origin);await r.abort();}else await r.continue();
        });
        await context.routeWebSocket('**/*',ws=>ws.close());
        const page=await context.newPage();
        const errors=[];
        page.on('pageerror',e=>errors.push(String(e.message).slice(0,400)));
        await page.coverage.startCSSCoverage();
        const response=await page.goto(server.origin+route,{waitUntil:'load',timeout:30000});
        if(!response?.ok()||!page.url().startsWith(server.origin+'/'))throw Error('Page failed: '+route);
        await page.evaluate(()=>document.fonts.ready);
        await page.waitForTimeout(500);
        const initial=coverageRows(await page.coverage.stopCSSCoverage(),server.origin);
        await page.coverage.startCSSCoverage();
        // Observe a few scroll states; never click, submit, hover or assume all dynamic states were exercised.
        for(let i=1;i<=4;i++){
          await page.evaluate(i=>window.scrollTo(0,(document.documentElement.scrollHeight-innerHeight)*i/4),i);
          await page.waitForTimeout(200);
        }
        const scrolled=coverageRows(await page.coverage.stopCSSCoverage(),server.origin);
        const timing=await page.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0];return {domContentLoadedMs:n?.domContentLoadedEventEnd??null,loadMs:n?.loadEventEnd??null,resources:performance.getEntriesByType('resource').length};});
        rows.push({route,viewport:width,initial,scrolled,timing,blockedOrigins:blocked.size,pageErrors:errors.length});
      }finally{await context.close();}
    }
    return {mode:'local-chromium-css-coverage',rows,limitations:['Observed CSS ranges are candidates for review, not safe-to-delete rules or proven critical CSS.','Initial sample includes load plus 500ms; scroll sample is separate, not cumulative.','No hover/focus/menu/form interaction coverage; external requests blocked; local no-store server does not emulate IONOS or production caching.','Timings are unthrottled local observations, not Lighthouse or field metrics.']};
  }finally{if(browser)await browser.close();await server.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const [source,output,toolRoot,...routes]=process.argv.slice(2);
  if(!source||!output||!toolRoot||existsSync(output))throw Error('Usage: node scripts/performance/browser-coverage.mjs <build> <new-report.json> <tool-dir> [routes...]');
  const root=realpathSync(source),dest=resolve(output),r=relative(root,dest);
  if(r===''||(!r.startsWith('..'+sep)&&r!=='..'&&!r.startsWith(sep)))throw Error('Keep report outside build');
  const result=await measureCoverage({source,toolRoot,routes:routes.length?routes:['/']});
  writeFileSync(dest,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({samples:result.rows.length,pageErrors:result.rows.reduce((n,x)=>n+x.pageErrors,0)},null,2));
}
