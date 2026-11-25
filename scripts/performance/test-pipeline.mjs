import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {runPipeline} from './pipeline.mjs';
const root=mkdtempSync(join(tmpdir(),'creaid-pipe-'));
try{
  const source=join(root,'dist');mkdirSync(join(source,'assets'),{recursive:true});
  const html='<!doctype html><html><head><meta charset="utf-8"><script src="/assets/app.js"></script></head><body><img src="/assets/hero.webp" width="800" height="400"></body></html>';
  writeFileSync(join(source,'index.html'),html);
  for(const [p,b] of [['app.js','globalThis.ready=true;'],['hero.webp','fixture'],['font.woff2','font fixture']])writeFileSync(join(source,'assets',p),b);
  const config={schemaVersion:1,hints:{'index.html':{deferScripts:['/assets/app.js'],preloadFonts:['/assets/font.woff2'],preloadImages:['/assets/hero.webp']}}};
  const out=join(root,'out');const report=await runPipeline({source,output:out,config});
  assert.equal(report.steps.hints.length,3);
  const staged=readFileSync(join(out,'package/site/index.html'),'utf8');
  assert.match(staged,/<script src="\/assets\/app\.sha256-[a-f0-9]{64}\.js" defer>/);
  assert.match(staged,/<link rel="preload" as="font" href="\/assets\/font\.woff2" type="font\/woff2" crossorigin>/);
  assert.match(staged,/<link rel="preload" as="image" href="\/assets\/hero\.sha256-[a-f0-9]{64}\.webp">/);
  assert.equal(readFileSync(join(source,'index.html'),'utf8'),html);
  assert.ok(existsSync(join(out,'audit/dashboard.html')));
  assert.ok(!existsSync(join(out,'package/site/audit')));
  await assert.rejects(runPipeline({source,output:join(root,'bad'),config:{...config,profile:'production'}}),/Invalid pipeline/);
  await assert.rejects(runPipeline({source,output:join(source,'bad'),config}),/isolated/);
  writeFileSync(join(source,'index.html'),html.replace('<img ','<img loading="lazy" '));
  await assert.rejects(runPipeline({source,output:join(root,'lazy'),config}),/eager img/);
  assert.ok(!existsSync(join(root,'lazy')));
  console.log('PASS: central preview pipeline, explicit hints, fingerprinting, source preservation and fail-closed config');
}finally{rmSync(root,{recursive:true,force:true});}
