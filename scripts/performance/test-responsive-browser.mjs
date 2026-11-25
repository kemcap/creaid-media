// Test actual browser selection, not just the generated markup.
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {createRequire} from 'node:module';
import {runPipeline} from './pipeline.mjs';
import {localBuildServer} from './browser-coverage.mjs';
const [opt,browserTools]=process.argv.slice(2);
if(!opt||!browserTools)throw Error('Expected optional optimization and browser tool directories');
const sharp=createRequire(join(resolve(opt),'package.json'))('sharp');
const {chromium}=createRequire(join(resolve(browserTools),'package.json'))('playwright');
const root=mkdtempSync(join(tmpdir(),'creaid-responsive-browser-'));
let server,browser;
try{
 const src=join(root,'dist');mkdirSync(join(src,'assets'),{recursive:true});
 await sharp({create:{width:1200,height:600,channels:3,background:'#456789'}}).png({compressionLevel:0}).toFile(join(src,'assets/photo.png'));
 writeFileSync(join(src,'index.html'),'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}img{width:min(100vw,1200px);height:auto}</style></head><body><img src="/assets/photo.png" width="1200" height="600" alt="Test"></body></html>');
 const output=join(root,'output');
 await runPipeline({source:src,output,toolRoot:opt,config:{schemaVersion:1,responsive:{images:['assets/photo.png'],widths:[320,640],integrate:{'index.html':{'/assets/photo.png':'(max-width: 1200px) 100vw, 1200px'}}}}});
 server=await localBuildServer(join(output,'package','site'));
 browser=await chromium.launch({headless:true});
 for(const [width,pattern] of [[320,/responsive-320w-/],[640,/responsive-640w-/],[1440,/photo\.sha256-/]]){
  const context=await browser.newContext({viewport:{width,height:800},deviceScaleFactor:1});
  try{
   const page=await context.newPage();
   await page.goto(server.origin+'/',{waitUntil:'load'});
   const info=await page.locator('img').evaluate(async img=>{await img.decode();return {url:img.currentSrc,w:img.getBoundingClientRect().width,h:img.getBoundingClientRect().height};});
   assert.match(info.url,pattern);assert.equal(info.w,Math.min(width,1200));assert.equal(info.h,info.w/2);
  }finally{await context.close();}
 }
 console.log('PASS: actual responsive image selection at 320, 640 and 1440 px, layout and fingerprint URLs preserved');
}finally{if(browser)await browser.close();if(server)await server.close();rmSync(root,{recursive:true,force:true});}
