import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {warmCache,classifyCache} from './cache-warmup.mjs';
let hits=0,redirectTarget=0;
const server=createServer((req,res)=>{
  if(req.url==='/asset.css'){hits++;res.writeHead(200,{'Cache-Control':'public, max-age=3600','X-Cache':hits===1?'MISS':'HIT','Age':hits===1?'0':'1'}).end('body{color:black}');}
  else if(req.url==='/preview'){res.writeHead(200,{'Cache-Control':'no-store'}).end('preview');}
  else if(req.url==='/redirect'){res.writeHead(302,{Location:'/target'}).end();}
  else if(req.url==='/target'){redirectTarget++;res.end('target');}
  else if(req.url==='/limited'){res.writeHead(429).end();}
  else if(req.url==='/cookie'){res.writeHead(200,{'Cache-Control':'public, max-age=60','Set-Cookie':'fixture=private'}).end('cookie');}
  else res.writeHead(404).end();
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try{
  const origin='http://127.0.0.1:'+server.address().port;
  const result=await warmCache({origin,paths:['/asset.css','/preview','/cookie'],delayMs:150});
  assert.equal(result.requests,6);
  assert.equal(result.reportedHits,1);
  assert.equal(result.rows[0].cache,'provider-miss-or-bypass');
  assert.equal(result.rows[1].cache,'not-suitable-for-shared-warmup');
  assert.equal(result.rows[2].headers['set-cookie-present'],true);
  assert.equal(result.rows[2].headers['set-cookie'],undefined);
  assert.equal(result.rows[4].decodedBytes,0);
  const redirect=await warmCache({origin,paths:['/redirect'],passes:1,delayMs:150});
  assert.equal(redirect.rows[0].status,302);assert.equal(redirectTarget,0);
  const limited=await warmCache({origin,paths:['/limited','/asset.css'],delayMs:150});assert.equal(limited.requests,1);assert.equal(limited.stopped,'HTTP 429');
  const budget=await warmCache({origin,paths:['/asset.css'],maxTotalBytes:2,delayMs:150});assert.equal(budget.stopped,'byte-budget');
  await assert.rejects(warmCache({origin:'https://example.invalid',paths:['/']}),/explicit approval/);
  await assert.rejects(warmCache({origin,paths:['//example.invalid']}),/resource paths/);
  assert.equal(classifyCache({'cache-control':'public, max-age=60'},200),'cache-policy-only');
  assert.equal(classifyCache({'cache-control':'no-cache','age':'2'},200),'revalidation-required');
  console.log('PASS: cache warmup, shared-cache indicators, no-store, redirect, request/byte limits and explicit remote consent');
}finally{await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}
