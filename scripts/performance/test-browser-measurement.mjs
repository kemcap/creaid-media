import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {measureCoverage,localBuildServer} from './browser-coverage.mjs';
import {measureLighthouse} from './measure-lighthouse.mjs';
const toolRoot=process.argv[2];if(!toolRoot)throw Error('Tool directory required');
const root=mkdtempSync(join(tmpdir(),'creaid-browser-perf-'));
try{
  const source=join(root,'dist');mkdirSync(join(source,'assets'),{recursive:true});
  writeFileSync(join(source,'index.html'),'<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Test</title><link rel="stylesheet" href="/assets/style.css"></head><body><h1 class="used">CreAid fixture</h1><p>Local performance test.</p></body></html>');
  writeFileSync(join(source,'assets/style.css'),'.used{color:#222}.never-used{color:#555}body{font-family:system-ui}');
  const server=await localBuildServer(source);
  try{
    const page=await fetch(server.origin+'/');
    assert.equal(page.status,200);assert.equal(page.headers.get('cache-control'),'no-store');
    assert.equal((await fetch(server.origin+'/',{method:'POST'})).status,405);
    assert.equal((await fetch(server.origin+'/.htaccess')).status,404);
  }finally{await server.close();}
  const coverage=await measureCoverage({source,toolRoot,viewports:[390,1440]});
  assert.equal(coverage.rows.length,2);
  for(const row of coverage.rows){
    assert.equal(row.pageErrors,0);
    const css=row.initial.find(x=>x.url==='/assets/style.css');
    assert.ok(css&&css.used>0&&css.unobserved>0);
  }
  console.log('PASS: isolated browser coverage at mobile/desktop sizes');
  if(process.argv.includes('--lighthouse')){
    const result=await measureLighthouse({source,output:join(root,'lighthouse'),toolRoot,runs:1});
    assert.equal(result.results.length,1);
    assert.ok(result.results[0].score>=0&&result.results[0].score<=100);
    console.log('PASS: real local Lighthouse smoke measurement');
  }
}finally{rmSync(root,{recursive:true,force:true});}
