// Local-only Studio runner. No arbitrary shell commands, external URLs or deployment.
import {createServer} from 'node:http';
import {randomBytes,randomUUID} from 'node:crypto';
import {existsSync,lstatSync,realpathSync,mkdirSync,readFileSync} from 'node:fs';
import {resolve,join,relative,sep} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {runPipeline} from './pipeline.mjs';

const studioFile=fileURLToPath(new URL('./studio.html',import.meta.url));
const inside=(a,b)=>{const r=relative(a,b);return r===''||(!r.startsWith('..'+sep)&&r!=='..'&&!r.startsWith(sep));};
function localDirectory(p){
  if(!existsSync(p))mkdirSync(p,{recursive:false});
  const st=lstatSync(p);
  if(st.isSymbolicLink()||!st.isDirectory())throw Error('Expected real local output directory');
  return realpathSync(p);
}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'}).end(JSON.stringify(data));}
async function body(req){
  let length=0;const parts=[];
  for await(const part of req){length+=part.length;if(length>256*1024)throw Error('Configuration exceeds 256 KiB');parts.push(part);}
  return JSON.parse(Buffer.concat(parts).toString('utf8'));
}
function localUI(token){
  const section='<section id="localRunner"><h2>05 / Lokal optimieren</h2><p>Erstellt einen neuen isolierten Vorschau-Build aus dem bereits gebauten dist-Ordner. Keine Veröffentlichung.</p><div class="actions"><button id="runLocal" type="button">Optimierung starten</button><a id="localReport" hidden target="_blank" rel="noopener noreferrer">Analysebericht öffnen</a></div><p id="localStatus" role="status" aria-live="polite"></p><pre id="localResult" hidden></pre></section>';
  const js='<script>\n'+
    'const localToken='+JSON.stringify(token)+';\n'+
    'const localButton=document.getElementById("runLocal"),localStatus=document.getElementById("localStatus"),localResult=document.getElementById("localResult"),localReport=document.getElementById("localReport");\n'+
    'let localBusy=false;\n'+
    'async function localAPI(path,options={}){const r=await fetch(path,{...options,headers:{"X-CreAid-Local":localToken,...options.headers},cache:"no-store"});const data=await r.json();if(!r.ok)throw Error(data.error||"Lokaler Serverfehler");return data;}\n'+
    'function renderLocal(state){localBusy=state.state==="running";localButton.disabled=localBusy;localStatus.textContent=state.state==="running"?"Optimierung läuft …":state.state==="done"?"Vorschau erfolgreich erstellt.":state.state==="error"?"Optimierung fehlgeschlagen.":"Bereit.";localResult.hidden=!state.result&&!state.error;localResult.textContent=state.result?JSON.stringify(state.result,null,2):state.error||"";localReport.hidden=state.state!=="done";if(state.state==="done")localReport.href="/report?token="+encodeURIComponent(localToken);}\n'+
    'async function refreshLocal(){try{const state=await localAPI("/api/status");renderLocal(state);if(localBusy)setTimeout(refreshLocal,1000);}catch(e){localStatus.textContent=e.message;localButton.disabled=false;}}\n'+
    'localButton.addEventListener("click",async()=>{if(localBusy)return;let config;try{config=build();}catch(e){localStatus.textContent=e.message;return;}localButton.disabled=true;localReport.hidden=true;localStatus.textContent="Starte …";try{renderLocal(await localAPI("/api/run",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(config)}));if(localBusy)setTimeout(refreshLocal,1000);}catch(e){localStatus.textContent=e.message;localButton.disabled=false;}});refreshLocal();\n</script>';
  return readFileSync(studioFile,'utf8').replace("default-src 'none'; style-src","default-src 'none'; connect-src 'self'; style-src").replace('</main>',section+'</main>').replace('</body>',js+'</body>');
}
export async function startStudio({source,outputRoot,toolRoot,port=0}){
  source=resolve(source);outputRoot=resolve(outputRoot);
  if(!existsSync(join(source,'index.html'))||lstatSync(source).isSymbolicLink())throw Error('Build dist first: npm run build');
  source=realpathSync(source);
  if(inside(source,outputRoot)||inside(outputRoot,source))throw Error('Output must be outside build');
  if(!existsSync(outputRoot)&&inside(source,realpathSync(resolve(outputRoot,'..'))))throw Error('Output parent must be outside build');
  outputRoot=localDirectory(outputRoot);
  if(inside(source,outputRoot)||inside(outputRoot,source))throw Error('Output must be outside build');
  const token=randomBytes(32).toString('hex');
  const html=localUI(token);
  let state={state:'idle'},latest=null,origin;
  const server=createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Referrer-Policy','no-referrer');
    if(req.headers.host!==new URL(origin).host){json(res,403,{error:'Invalid host'});return;}
    const u=new URL(req.url,origin);
    if(req.method==='GET'&&u.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(html);return;}
    if(req.method==='GET'&&u.pathname==='/report'&&u.searchParams.get('token')===token&&latest&&state.state==='done'){
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(readFileSync(join(latest,'audit','dashboard.html')));return;
    }
    if(req.headers['x-creaid-local']!==token){json(res,403,{error:'Local Studio authorization required'});return;}
    if(req.method==='GET'&&u.pathname==='/api/status'){json(res,200,state);return;}
    if(req.method==='POST'&&u.pathname==='/api/run'){
      if(req.headers.origin!==origin||!/^application\/json(?:;|$)/i.test(req.headers['content-type']??'')){json(res,403,{error:'Invalid request origin or type'});return;}
      if(state.state==='running'){json(res,409,{error:'A run is already active'});return;}
      // Reserve the run before awaiting the request body, preventing simultaneous starts.
      state={state:'running'};
      let config;
      try{config=await body(req);}catch(e){state={state:'error',error:String(e.message)};json(res,400,state);return;}
      const output=join(outputRoot,'run-'+randomUUID());
      json(res,202,state);
      setImmediate(async()=>{
        try{
          const result=await runPipeline({source,output,config,toolRoot});
          latest=output;
          state={state:'done',result:{output,site:join(output,'package','site'),audit:result.audit,packaging:result.packaging,deployment:result.deployment}};
        }catch(e){state={state:'error',error:String(e.message)};}
      });
      return;
    }
    json(res,404,{error:'Not found'});
  });
  await new Promise((done,fail)=>{server.once('error',fail);server.listen(port,'127.0.0.1',done);});
  origin='http://127.0.0.1:'+server.address().port;
  return {origin,close:()=>new Promise(done=>{server.close(done);server.closeAllConnections();})};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  if(process.argv.length!==2)throw Error('Usage: npm run performance:studio');
  const root=fileURLToPath(new URL('../../',import.meta.url));
  const server=await startStudio({source:join(root,'dist'),outputRoot:join(root,'.creaid-performance-runs'),toolRoot:join(root,'.performance-tools'),port:0});
  console.log('CreAid Performance Studio: '+server.origin+' (im Browser öffnen; Strg+C beendet den Server)');
}
