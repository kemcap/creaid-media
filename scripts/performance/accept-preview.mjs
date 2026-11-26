// Acceptance gate for the SAFE preview package: no optional transformations.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,lstatSync,writeFileSync,existsSync,mkdirSync,realpathSync} from 'node:fs';
import {join,resolve,relative,dirname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {verifyCandidate} from './engine.mjs';
import {localBuildServer} from './browser-coverage.mjs';
import {compareVisual} from './visual-regression.mjs';
const digest=b=>createHash('sha256').update(b).digest('hex');
const inside=(a,b)=>{const r=relative(a,b);return r===''||(!r.startsWith('..'+sep)&&r!=='..'&&!r.startsWith(sep));};
const future=p=>existsSync(p)?realpathSync(p):join(future(dirname(p)),relative(dirname(p),p));
function list(root){
  const files=[];
  function visit(dir){for(const e of readdirSync(dir,{withFileTypes:true})){
    const p=join(dir,e.name);
    if(e.isSymbolicLink())throw Error('Symlink not allowed');
    if(e.isDirectory())visit(p);
    else if(e.isFile())files.push(relative(root,p).split(sep).join('/'));
    else throw Error('Nonregular file');
  }}
  visit(root);return files.sort();
}
export function verifySafePreview({source,packageDir}){
  source=realpathSync(source);packageDir=realpathSync(packageDir);
  const site=join(packageDir,'site'),report=JSON.parse(readFileSync(join(packageDir,'report.json'),'utf8'));
  assert.equal(report.profile,'preview','Only safe preview packages are supported');
  const original=list(source),staged=list(site);
  const expected=new Set([...original,'.htaccess']);
  const reverse=new Map();
  for(const row of report.manifest){
    assert.match(row.original,/^\/assets\/[A-Za-z0-9_./-]+$/);
    assert.match(row.fingerprinted,/^\/assets\/[A-Za-z0-9_./-]+\.sha256-[a-f0-9]{64}\.[A-Za-z0-9]+$/);
    assert.ok(!row.original.split('/').some(x=>x==='..'||x==='.'));
    assert.ok(!row.fingerprinted.split('/').some(x=>x==='..'||x==='.'));
    const orig=row.original.slice(1),hashed=row.fingerprinted.slice(1);
    assert.ok(original.includes(orig),'Original asset missing from source');
    assert.equal(digest(readFileSync(join(source,orig))),row.sha256,'Source asset hash differs');
    expected.add(hashed);
    assert.ok(!reverse.has(row.fingerprinted),'Duplicate fingerprint URL');
    reverse.set(row.fingerprinted,row.original);
  }
  assert.deepEqual(staged,[...expected].sort(),'Unexpected added or removed files');
  const verifiedAssets=verifyCandidate(packageDir,report);
  let pages=0,unchangedFiles=0;
  for(const file of original){
    const a=readFileSync(join(source,file)),b=readFileSync(join(site,file));
    if(file==='.htaccess')continue;
    if(/\.html$/i.test(file)){
      // Reverse only the known generated fingerprint strings in a single pass.
      const restored=b.toString('utf8').replace(/\/assets\/[A-Za-z0-9_./-]+\.sha256-[a-f0-9]{64}\.[A-Za-z0-9]+/g,url=>reverse.get(url)??url);
      assert.equal(restored,a.toString('utf8'),'Safe preview unexpectedly changed HTML content');
      pages++;
    }else{assert.ok(a.equals(b),'Safe preview changed a non-HTML source file');unchangedFiles++;}
  }
  const policy=readFileSync(join(site,'.htaccess'),'utf8');
  if(original.includes('.htaccess'))assert.ok(policy.startsWith(readFileSync(join(source,'.htaccess'),'utf8')),'Original server rules changed');
  assert.match(policy,/no-store, no-cache, must-revalidate, max-age=0/);
  assert.ok(!/immutable/i.test(policy),'Preview must not enable immutable caching');
  return {pages,unchangedFiles,verifiedAssets,sourceFiles:original.length,stagedFiles:staged.length};
}
export async function checkRoutes({source,packageDir,routeFiles}){
  const site=join(packageDir,'site');
  let a,b;
  try{
    a=await localBuildServer(source,routeFiles);
    b=await localBuildServer(site,routeFiles);
    for(const [route,file] of Object.entries(routeFiles)){
      for(const [server,root] of [[a,source],[b,site]]){
        const res=await fetch(server.origin+route,{redirect:'error',signal:AbortSignal.timeout(10000)});
        assert.equal(res.status,200,'Canonical route failed');
        assert.match(res.headers.get('x-robots-tag')??'',/noindex/i);
        assert.match(res.headers.get('cache-control')??'',/no-store/i);
        assert.ok(Buffer.from(await res.arrayBuffer()).equals(readFileSync(join(root,file))),'Route returned unexpected file');
      }
    }
    return Object.keys(routeFiles).length;
  }finally{if(a)await a.close();if(b)await b.close();}
}
export async function acceptSafePreview({source,packageDir,output,toolRoot,routeFiles,representative}){
  source=realpathSync(source);packageDir=realpathSync(packageDir);output=resolve(output);
  if(existsSync(output)||[source,packageDir].some(p=>inside(p,future(output))||inside(future(output),p)))throw Error('Use isolated acceptance report directory');
  const staticChecks=verifySafePreview({source,packageDir});
  const canonicalRoutes=await checkRoutes({source,packageDir,routeFiles});
  mkdirSync(output,{recursive:false});
  const visual=await compareVisual({before:source,after:join(packageDir,'site'),output:join(output,'visual'),toolRoot,routeFiles,routes:representative});
  const result={mode:'safe-preview-acceptance',staticChecks,canonicalRoutes,visualSamples:visual.rows.length,visualPassed:visual.passed,visualFindings:visual.rows.filter(r=>r.findings.length>0).length,passed:visual.passed,limitations:['Checks safe packaging only, not optional CSS/JS/image transformations.','Local server validates routes and preview response policy, not IONOS rewrites or actual cache/compression.','Representative viewport comparisons are not full interactive regression or production release approval.']};
  writeFileSync(join(output,'acceptance.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const [source,packageDir,output,toolRoot,...extra]=process.argv.slice(2);
  if(!source||!packageDir||!output||!toolRoot||extra.length)throw Error('Usage: node scripts/performance/accept-preview.mjs <build> <safe-package> <new-report-dir> <browser-tool-dir>');
  const {routeFiles}=await import('../routes.mjs');
  const representative=['/','/webdesign','/grafikdesign-2','/online-shop-entwicklung','/kontakt','/creaid-blog','/google-ads-aber-keine-anfragen','/webdesign/webdesign-fuer-aerzte'].filter(r=>Object.hasOwn(routeFiles,r));
  const result=await acceptSafePreview({source,packageDir,output,toolRoot,routeFiles,representative});
  console.log(JSON.stringify(result,null,2));
  if(!result.passed)process.exitCode=1;
}
