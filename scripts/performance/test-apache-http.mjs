// Real Apache HTTP integration tests (Linux; isolated fixture, no external traffic).
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, chmodSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { request } from 'node:http';
import { createServer } from 'node:net';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';
import { buildPerformance } from './engine.mjs';

const root=mkdtempSync(join(tmpdir(),'creaid-apache-'));
chmodSync(root,0o755);
const source=join(root,'dist');
mkdirSync(join(source,'assets'),{recursive:true,mode:0o755});
const css='body { color: #111; background: #fff; }\n'.repeat(300);
const html='<html><head><link rel="stylesheet" href="/assets/main.css"></head><body>'+('Cache HTTP test. '.repeat(300))+'</body></html>';
writeFileSync(join(source,'index.html'),html);
writeFileSync(join(source,'assets/main.css'),css);
const binary=process.env.CREAID_APACHE_BINARY||'/usr/sbin/apache2';
const moduleDir=process.env.CREAID_APACHE_MODULES||'/usr/lib/apache2/modules';
const mod=(name, required=true)=>{
  const file=join(moduleDir,'mod_'+name+'.so');
  if(!existsSync(file)){if(required)throw Error('Missing Apache module: '+file);return '';}
  return 'LoadModule '+name+'_module "'+file+'"';
};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function freePort(){
  const s=createServer();
  await new Promise((resolve,reject)=>{s.once('error',reject);s.listen(0,'127.0.0.1',resolve);});
  const p=s.address().port;await new Promise(resolve=>s.close(resolve));return p;
}
function get(port,path,headers={}){
  return new Promise((resolve,reject)=>{
    const req=request({hostname:'127.0.0.1',port,path,headers,method:'GET',timeout:5000},res=>{
      const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));res.on('error',reject);
    });req.on('error',reject);req.on('timeout',()=>req.destroy(Error('HTTP timeout')));req.end();
  });
}
function decoded(res){
  return res.headers['content-encoding']==='br'?brotliDecompressSync(res.body):res.headers['content-encoding']==='gzip'?gunzipSync(res.body):res.body;
}
async function scenario(profile,compression){
  const out=join(root,profile+'-'+compression);
  const report=buildPerformance({source,output:out,profile,approved:profile==='production'});
  const site=join(out,'site');chmodSync(out,0o755);chmodSync(site,0o755);
  const asset=report.manifest.find(x=>x.original==='/assets/main.css').fingerprinted;
  const port=await freePort();
  const conf=join(out,'httpd.conf');
  const modules=['mpm_event','authz_core','headers','filter','mime','dir'].map(x=>mod(x));
  if(compression!=='gzip')modules.push(mod('brotli'));
  if(compression!=='br')modules.push(mod('deflate'));
  writeFileSync(conf,[
    'ServerRoot "'+out+'"','Listen 127.0.0.1:'+port,'ServerName localhost',
    'PidFile "'+join(out,'httpd.pid')+'"','ErrorLog "'+join(out,'error.log')+'"',
    ...modules,'User www-data','Group www-data','TypesConfig /etc/mime.types',
    'DocumentRoot "'+site+'"','<Directory "'+site+'">','AllowOverride All','Require all granted','DirectoryIndex index.html','</Directory>'
  ].join('\n')+'\n');
  const server=spawn(binary,['-f',conf,'-DFOREGROUND'],{stdio:['ignore','pipe','pipe']});
  let stderr='';server.stderr.on('data',c=>stderr+=c);
  let launchError;server.on('error',e=>launchError=e);
  try{
    let ready=false;
    for(let i=0;i<50;i++){
      if(launchError)throw launchError;
      if(server.exitCode!==null)break;
      try{await get(port,'/');ready=true;break;}catch{await delay(100);}
    }
    if(!ready)throw Error('Apache startup failed: '+stderr);
    const plain=await get(port,asset,{'Accept-Encoding':'identity'});
    assert.equal(plain.status,200);
    assert.equal(plain.headers['content-encoding'],undefined);
    assert.equal(plain.body.toString(),css);
    assert.equal(plain.headers['cache-control'],profile==='production'?'public, max-age=31536000, immutable':'no-store, no-cache, must-revalidate, max-age=0');
    const cases=compression==='both'?[['br, gzip','br'],['gzip','gzip'],['br;q=0, gzip','gzip'],['identity',undefined]]:compression==='gzip'?[['br, gzip','gzip'],['br',undefined]]:[['br, gzip','br'],['gzip',undefined]];
    for(const [accept,expected] of cases){
      const response=await get(port,asset,{'Accept-Encoding':accept});
      assert.equal(response.status,200);
      assert.equal(response.headers['content-encoding'],expected);
      assert.match(response.headers.vary||'',/Accept-Encoding/i);
      assert.equal(decoded(response).toString(),css);
      if(expected)assert.ok(response.body.length<plain.body.length);
    }
    assert.ok(plain.headers.etag);
    const revalidated=await get(port,asset,{'Accept-Encoding':'identity','If-None-Match':plain.headers.etag});
    assert.equal(revalidated.status,304);
    assert.equal(revalidated.headers['cache-control'],plain.headers['cache-control']);
    const page=await get(port,'/');
    assert.equal(page.status,200);
    assert.equal(page.body.toString(),readFileSync(join(site,'index.html'),'utf8'));
    assert.equal(page.headers['cache-control'],profile==='production'?'no-cache, must-revalidate':'no-store, no-cache, must-revalidate, max-age=0');
    const original=await get(port,'/assets/main.css');
    assert.equal(original.headers['cache-control'],profile==='production'?'no-cache, must-revalidate':'no-store, no-cache, must-revalidate, max-age=0');
    const orig304=await get(port,'/assets/main.css',{'If-None-Match':original.headers.etag});
    assert.equal(orig304.status,304);
    assert.equal(orig304.headers['cache-control'],original.headers['cache-control']);
    const missing=await get(port,'/assets/missing.sha256-'+('0'.repeat(64))+'.css');
    assert.equal(missing.status,404);
    assert.match(missing.headers['cache-control'],/no-store/);
    console.log('PASS: Apache '+profile+' / '+compression+' — encoding, decoded bytes, cache, ETag/304, 404');
  }catch(e){
    if(existsSync(join(out,'error.log')))console.error(readFileSync(join(out,'error.log'),'utf8'));
    throw e;
  }finally{
    if(server.exitCode===null && server.pid){
      const done=new Promise(resolve=>server.once('exit',resolve));server.kill('SIGTERM');await Promise.race([done,delay(3000)]);
      if(server.exitCode===null&&server.signalCode===null)server.kill('SIGKILL');
    }
  }
}
try{
  await scenario('preview','both');
  await scenario('production','both');
  await scenario('production','gzip');
  await scenario('production','br');
}finally{rmSync(root,{recursive:true,force:true});}
