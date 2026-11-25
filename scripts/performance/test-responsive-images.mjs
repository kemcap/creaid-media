import assert from 'node:assert/strict';
import { mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync } from 'node:fs';
import { join,resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { responsiveCandidates } from './responsive-images.mjs';
const toolRoot=process.argv[2];if(!toolRoot)throw Error('Tool directory required');
const sharp=createRequire(join(resolve(toolRoot),'package.json'))('sharp');
const root=mkdtempSync(join(tmpdir(),'creaid-responsive-'));
try{
  const source=join(root,'dist');mkdirSync(join(source,'assets'),{recursive:true});
  const html='<img src="/assets/photo.png" width="800" height="400">';
  const original=await sharp({create:{width:800,height:400,channels:3,background:'#456789'}}).png({compressionLevel:0}).toBuffer();
  writeFileSync(join(source,'index.html'),html);writeFileSync(join(source,'assets/photo.png'),original);
  const config={images:['assets/photo.png'],widths:[320,640,1200],quality:82};
  const output=join(root,'out');const report=await responsiveCandidates({source,output,config,toolRoot});
  assert.equal(report.generated,2);assert.deepEqual(report.rows[0].variants.map(v=>v.width),[320,640]);
  for(const v of report.rows[0].variants){const m=await sharp(join(output,'site',v.url.slice(1))).metadata();assert.equal(m.width,v.width);assert.equal(m.height,v.width/2);assert.ok(v.bytes<original.length);}
  assert.match(report.rows[0].srcsetCandidate,/photo\.png 800w/);
  assert.equal(readFileSync(join(output,'site/index.html'),'utf8'),html);
  assert.deepEqual(readFileSync(join(source,'assets/photo.png')),original);
  await assert.rejects(responsiveCandidates({source,output:join(source,'bad'),config,toolRoot}),/isolated/);
  await assert.rejects(responsiveCandidates({source,output:join(root,'bad'),config:{...config,widths:[9999]},toolRoot}),/Invalid/);
  console.log('PASS: responsive variants, aspect ratio, source preservation, no upscaling and isolated output');
}finally{rmSync(root,{recursive:true,force:true});}
