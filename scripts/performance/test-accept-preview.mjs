import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {buildPerformance} from './engine.mjs';
import {verifySafePreview,checkRoutes} from './accept-preview.mjs';
const root=mkdtempSync(join(tmpdir(),'creaid-accept-'));
try{
  const source=join(root,'dist'),out=join(root,'package');
  mkdirSync(join(source,'assets'),{recursive:true});
  const html='<!doctype html><html><head><title>Unchanged</title><link rel="stylesheet" href="/assets/main.css"></head><body><h1>Fixture</h1></body></html>';
  writeFileSync(join(source,'index.html'),html);
  writeFileSync(join(source,'internal-name.html'),html);
  writeFileSync(join(source,'assets/main.css'),'body{color:black}');
  buildPerformance({source,output:out});
  const result=verifySafePreview({source,packageDir:out});
  assert.equal(result.pages,2);assert.equal(result.verifiedAssets,1);
  const routeFiles={'/':'index.html','/public-url':'internal-name.html'};
  assert.equal(await checkRoutes({source,packageDir:out,routeFiles}),2);
  await assert.rejects(checkRoutes({source,packageDir:out,routeFiles:{'/wrong':'missing.html'}}),/Invalid route mapping/);
  const staged=join(out,'site','index.html');
  writeFileSync(staged,readFileSync(staged,'utf8').replace('Fixture','Changed'));
  assert.throws(()=>verifySafePreview({source,packageDir:out}),/changed HTML/);
  console.log('PASS: safe preview content invariants and canonical route mappings');
}finally{rmSync(root,{recursive:true,force:true});}
