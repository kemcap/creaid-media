// Bounded HTTP cache warmup/diagnostic. No purge, deployment, credentials or redirects.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const allowedPath=p=>typeof p==='string'&&/^\/[A-Za-z0-9_./-]*$/.test(p)&&!p.startsWith('//')&&!p.split('/').some(x=>x.startsWith('.'));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
export function classifyCache(headers,status){
  if(status!==200)return 'non-200';
  const policy=headers['cache-control']??'';
  if(/\b(?:no-store|private)\b/i.test(policy)||headers['set-cookie-present'])return 'not-suitable-for-shared-warmup';
  if(/\bno-cache\b/i.test(policy))return 'revalidation-required';
  const age=Number(headers.age);
  const hints=[headers['x-cache'],headers['cf-cache-status'],headers['x-cache-status']].filter(Boolean).join(' ');
  if(/\b(?:MISS|BYPASS|DYNAMIC|EXPIRED)\b/i.test(hints))return 'provider-miss-or-bypass';
  if((headers.age!==undefined&&Number.isFinite(age)&&age>0)||/\bHIT\b/i.test(hints))return 'reported-shared-cache-hit';
  if(/\b(?:public|s-maxage|max-age)\b/i.test(policy))return 'cache-policy-only';
  return 'cache-status-unknown';
}
export async function warmCache({origin,paths,allowRemote=false,passes=2,delayMs=250,maxTotalBytes=64*1024*1024}){
  const u=new URL(origin);
  if(u.username||u.password||u.pathname!=='/'||u.search||u.hash||!['http:','https:'].includes(u.protocol))throw Error('Supply an origin, not a URL with credentials or path');
  const loopback=u.hostname==='127.0.0.1'||u.hostname==='[::1]';
  if(!loopback&&(!allowRemote||u.protocol!=='https:'))throw Error('Remote HTTPS requires explicit approval');
  if(!Array.isArray(paths)||!paths.length||paths.length>50||new Set(paths).size!==paths.length||paths.some(p=>!allowedPath(p)))throw Error('Provide 1–50 unique local absolute resource paths, without queries');
  if(!Number.isSafeInteger(passes)||passes<1||passes>2||!Number.isSafeInteger(delayMs)||delayMs<150||delayMs>5000||!Number.isSafeInteger(maxTotalBytes)||maxTotalBytes<1||maxTotalBytes>64*1024*1024)throw Error('Invalid warmup limits');
  let totalBytes=0,stopped=null;
  const rows=[];
  outer:for(let pass=1;pass<=passes;pass++)for(const path of paths){
    if(rows.length)await wait(delayMs);
    const start=performance.now(),row={path,pass};
    try{
      const response=await fetch(new URL(path,u),{method:'GET',redirect:'manual',signal:AbortSignal.timeout(15000),headers:{'User-Agent':'CreAid-Performance-Warmup/1.0','Accept':'*/*'}});
      row.status=response.status;row.headers={};
      for(const key of ['cache-control','age','etag','last-modified','vary','content-encoding','x-cache','x-cache-status','cf-cache-status']){
        const value=response.headers.get(key);
        if(value!==null)row.headers[key]=value.slice(0,512);
      }
      row.headers['set-cookie-present']=response.headers.has('set-cookie');
      row.cache=classifyCache(row.headers,row.status);
      row.ttfbMs=Math.round(performance.now()-start);
      row.decodedBytes=0;
      if(response.status!==200||row.headers['set-cookie-present']||/\b(?:private|no-store)\b/i.test(row.headers['cache-control']??'')){
        await response.body?.cancel();
      }else if(response.body){
        const reader=response.body.getReader();
        try{
          while(true){
            const {done,value}=await reader.read();if(done)break;
            row.decodedBytes+=value.byteLength;totalBytes+=value.byteLength;
            if(row.decodedBytes>16*1024*1024||totalBytes>maxTotalBytes){
              stopped='byte-budget';await reader.cancel();break;
            }
          }
        }finally{reader.releaseLock();}
      }
      row.elapsedMs=Math.round(performance.now()-start);rows.push(row);
      if(stopped)break outer;
      if([401,403,429,503].includes(row.status)){stopped='HTTP '+row.status;break outer;}
    }catch(e){row.error=e.name==='TimeoutError'?'timeout':String(e.message).slice(0,200);rows.push(row);stopped='request-failed';break outer;}
  }
  return {mode:'http-cache-warmup-observation',origin:u.origin,requestedPaths:paths.length,passes,requests:rows.length,totalDecodedBytes:totalBytes,stopped,reportedHits:rows.filter(r=>r.cache==='reported-shared-cache-hit').length,rows,limitations:['GET requests only; redirects are never followed and cookies are not retained. No cache purge or configuration change.','A reported HIT/Age is an indicator from the server, not independent proof of a cache fill. Cache-Control alone is not a cache hit.','No browser cache is prewarmed; no HTML dependency crawl. Only explicitly supplied public static resources.','Decoded body size and elapsed time are not a browser or CDN performance benchmark. Local no-store preview cannot demonstrate shared cache warmup.']};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const [configPath,out,...flags]=process.argv.slice(2);
  if(!configPath||!out||existsSync(out)||flags.some(x=>x!=='--approve-remote-public-get')||flags.length>1)throw Error('Usage: node scripts/performance/cache-warmup.mjs <config.json> <new-report.json> [--approve-remote-public-get]');
  const config=JSON.parse(readFileSync(configPath,'utf8'));
  if(!config||Object.keys(config).some(k=>!['origin','paths','passes','delayMs'].includes(k)))throw Error('Unknown warmup configuration');
  const report=await warmCache({...config,allowRemote:flags.length===1});
  writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({requests:report.requests,reportedHits:report.reportedHits,stopped:report.stopped},null,2));
  if(report.stopped||report.rows.some(r=>r.status!==200||r.error))process.exitCode=1;
}
