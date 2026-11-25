// Local-only Studio runner. No arbitrary shell commands, external URLs or deployment.
import {createServer} from 'node:http';
import {randomBytes,randomUUID} from 'node:crypto';
import {existsSync,lstatSync,realpathSync,mkdirSync,readFileSync,rmSync,readdirSync} from 'node:fs';
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
function generatedBytes(dir){
  let bytes=0;
  for(const entry of readdirSync(dir,{withFileTypes:true})){
    const p=join(dir,entry.name);
    if(entry.isSymbolicLink())throw Error('Symbolic link in generated run; manual review required');
    if(entry.isDirectory())bytes+=generatedBytes(p);
    else if(entry.isFile())bytes+=lstatSync(p).size;
    else throw Error('Unexpected file type in generated run');
  }
  return bytes;
}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'}).end(JSON.stringify(data));}
async function body(req){
  let length=0;const parts=[];
  for await(const part of req){length+=part.length;if(length>256*1024)throw Error('Configuration exceeds 256 KiB');parts.push(part);}
  return JSON.parse(Buffer.concat(parts).toString('utf8'));
}
function localUI(token){
  const section='<section id="localRunner"><h2>05 / Lokal optimieren</h2><p>Erstellt einen neuen isolierten Vorschau-Build aus dem bereits gebauten dist-Ordner. Keine Veröffentlichung.</p><div class="actions"><button id="runLocal" type="button">Optimierung starten</button><a id="localReport" hidden target="_blank" rel="noopener noreferrer">Analysebericht öffnen</a></div><p id="localStatus" role="status" aria-live="polite"></p><pre id="localResult" hidden></pre></section><section id="cacheManagement"><h2>06 / Lokalen Build-Cache verwalten</h2><p>Entfernt nur ältere, in dieser Studio-Sitzung erzeugte Vorschau-Builds samt Berichten. Der neueste Lauf, dist, Sicherungen und frühere Sitzungen bleiben erhalten. Browser- und Hosting-Cache werden nicht geleert.</p><p id="cacheInfo" role="status"></p><button id="clearCache" type="button" class="secondary" disabled>Lokalen Build-Cache leeren</button><p id="cacheStatus" role="status" aria-live="polite"></p><h3>Automatische Aufbewahrung (nur diese Sitzung)</h3><label><input id="autoCleanup" type="checkbox">Automatische Bereinigung aktivieren</label><div class="grid"><label>Neueste Läufe behalten<input id="keepRuns" type="number" min="2" max="20" value="3"></label><label>Mindestalter in Stunden<input id="ageHours" type="number" min="1" max="168" value="24"></label></div><button id="saveRetention" class="secondary" type="button">Aufbewahrung übernehmen</button><p id="retentionStatus" role="status" aria-live="polite"></p><p class="small">Prüft jede Minute, solange Studio läuft. Nur ältere Läufe außerhalb der Aufbewahrungsgrenze werden gelöscht. Nach Neustart aus.</p></section>';
  const js='<script>\n'+
    'const localToken='+JSON.stringify(token)+';\n'+
    'const localButton=document.getElementById("runLocal"),localStatus=document.getElementById("localStatus"),localResult=document.getElementById("localResult"),localReport=document.getElementById("localReport");\n'+
    'const clearButton=document.getElementById("clearCache"),cacheInfo=document.getElementById("cacheInfo"),cacheStatus=document.getElementById("cacheStatus");let removable=0;let localBusy=false;const retentionButton=document.getElementById("saveRetention"),retentionStatus=document.getElementById("retentionStatus");\n'+
    'async function localAPI(path,options={}){const r=await fetch(path,{...options,headers:{"X-CreAid-Local":localToken,...options.headers},cache:"no-store"});const data=await r.json();if(!r.ok)throw Error(data.error||"Lokaler Serverfehler");return data;}\n'+
    'function renderLocal(state){localBusy=state.state==="running"||state.state==="cleaning";localButton.disabled=localBusy;if(state.cache){removable=state.cache.removableRuns;cacheInfo.textContent=removable+" ältere Testläufe zur Bereinigung.";}clearButton.disabled=localBusy||removable===0;retentionButton.disabled=localBusy;if(state.cache?.autoCleanup){const a=state.cache.autoCleanup;retentionStatus.textContent=(a.enabled?"Aktiv":"Aus")+(a.lastResult?" · letzte Bereinigung: "+a.lastResult.removed+" Läufe"+(a.lastResult.error?" · Fehler: "+a.lastResult.error:""):"");}localStatus.textContent=state.state==="cleaning"?"Bereinigung läuft …":state.state==="running"?"Optimierung läuft …":state.state==="done"?"Vorschau erfolgreich erstellt.":state.state==="error"?"Optimierung fehlgeschlagen.":"Bereit.";localResult.hidden=!state.result&&!state.error;localResult.textContent=state.result?JSON.stringify(state.result,null,2):state.error||"";localReport.hidden=state.state!=="done";if(state.state==="done")localReport.href="/report?token="+encodeURIComponent(localToken);}\n'+
    'async function refreshLocal(){try{const state=await localAPI("/api/status");renderLocal(state);if(localBusy)setTimeout(refreshLocal,1000);}catch(e){localStatus.textContent=e.message;localButton.disabled=false;}}\n'+
    'localButton.addEventListener("click",async()=>{if(localBusy)return;let config;try{config=build();}catch(e){localStatus.textContent=e.message;return;}localButton.disabled=true;clearButton.disabled=true;localReport.hidden=true;localStatus.textContent="Starte …";try{renderLocal(await localAPI("/api/run",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(config)}));if(localBusy)setTimeout(refreshLocal,1000);}catch(e){localStatus.textContent=e.message;localButton.disabled=false;}});clearButton.addEventListener("click",async()=>{if(localBusy||!removable)return;if(!window.confirm("Ältere Vorschau-Builds dieser Sitzung samt Berichten wirklich löschen? Der neueste Lauf bleibt erhalten."))return;clearButton.disabled=true;localButton.disabled=true;try{const result=await localAPI("/api/cache/clear",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({confirm:"remove-previous-session-runs"})});cacheStatus.textContent=result.removed+" Testläufe entfernt · "+(result.bytes/1048576).toFixed(2)+" MiB freigegeben.";}catch(e){cacheStatus.textContent=e.message;}await refreshLocal();});retentionButton.addEventListener("click",async()=>{if(localBusy)return;const enabled=document.getElementById("autoCleanup").checked;if(enabled&&!window.confirm("Automatische Löschung älterer Testläufe dieser Sitzung aktivieren?"))return;try{await localAPI("/api/cache/schedule",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({enabled,keep:Number(document.getElementById("keepRuns").value),maxAgeHours:Number(document.getElementById("ageHours").value)})});await refreshLocal();}catch(e){retentionStatus.textContent=e.message;}});refreshLocal();\n</script>';
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
  const completedRuns=new Map();
  let autoCleanup={enabled:false,keep:3,maxAgeHours:24,lastResult:null};
  function cleanupCandidates(){return [...completedRuns.keys()].filter(p=>p!==latest&&existsSync(p));}
  function cacheInfo(){return {removableRuns:cleanupCandidates().length,latestPreserved:!!latest,scope:'current-session',autoCleanup:{...autoCleanup},browserCacheCleared:false,hostingCacheCleared:false};}
  function removeRuns(candidates){
    let removed=0,bytes=0;
    try{
        const plan=candidates.map(p=>{
          if(!/^run-[0-9a-f-]{36}$/.test(p.slice(outputRoot.length+1))||resolve(p,'..')!==outputRoot||realpathSync(outputRoot)!==outputRoot||lstatSync(p).isSymbolicLink()||!lstatSync(p).isDirectory()||realpathSync(p)!==p)throw Error('Unsafe generated run; cleanup aborted');
          return {p,bytes:generatedBytes(p)};
        });
        for(const entry of plan){
          rmSync(entry.p,{recursive:true,force:false});
          completedRuns.delete(entry.p);removed++;bytes+=entry.bytes;
        }

      return {removed,bytes};
    }catch(error){return {removed,bytes,error:String(error.message)};}
  }
  function scheduledCleanup(){
    if(!autoCleanup.enabled||state.state==='running'||state.state==='cleaning')return;
    const ordered=[...completedRuns.entries()].sort((a,b)=>b[1]-a[1]);
    const cutoff=Date.now()-autoCleanup.maxAgeHours*3600000;
    const candidates=ordered.slice(autoCleanup.keep).filter(([p,created])=>p!==latest&&created<=cutoff&&existsSync(p)).map(([p])=>p);
    if(!candidates.length)return;
    autoCleanup.lastResult={...removeRuns(candidates),at:new Date().toISOString()};
  }
  const server=createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Referrer-Policy','no-referrer');
    if(req.headers.host!==new URL(origin).host){json(res,403,{error:'Invalid host'});return;}
    let u;try{u=new URL(req.url,origin);}catch{json(res,400,{error:'Invalid URL'});return;}
    if(u.origin!==origin){json(res,403,{error:'Invalid URL origin'});return;}
    if(req.method==='GET'&&u.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(html);return;}
    if(req.method==='GET'&&u.pathname==='/report'&&u.searchParams.get('token')===token&&latest&&state.state==='done'){
      let report;try{report=readFileSync(join(latest,'audit','dashboard.html'));}catch{json(res,404,{error:'Report no longer exists'});return;}
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(report);return;
    }
    if(req.headers['x-creaid-local']!==token){json(res,403,{error:'Local Studio authorization required'});return;}
    if(req.method==='GET'&&u.pathname==='/api/status'){json(res,200,{...state,cache:cacheInfo()});return;}
    if(req.method==='POST'&&u.pathname==='/api/cache/schedule'){
      if(req.headers.origin!==origin||!/^application\/json(?:;|$)/i.test(req.headers['content-type']??'')){json(res,403,{error:'Invalid request origin or type'});return;}
      if(state.state==='running'||state.state==='cleaning'){json(res,409,{error:'A run or cleanup is active'});return;}
      const previous=state;state={state:'cleaning'};
      try{
        const cfg=await body(req);
        if(!cfg||typeof cfg.enabled!=='boolean'||!Number.isSafeInteger(cfg.keep)||cfg.keep<2||cfg.keep>20||!Number.isSafeInteger(cfg.maxAgeHours)||cfg.maxAgeHours<1||cfg.maxAgeHours>168||Object.keys(cfg).some(k=>!['enabled','keep','maxAgeHours'].includes(k)))throw Error('Invalid retention settings');
        autoCleanup={...cfg,lastResult:null};json(res,200,cacheInfo());
      }catch(e){json(res,400,{error:String(e.message)});}
      finally{state=previous;}
      return;
    }
    if(req.method==='POST'&&u.pathname==='/api/cache/clear'){
      if(req.headers.origin!==origin||!/^application\/json(?:;|$)/i.test(req.headers['content-type']??'')){json(res,403,{error:'Invalid request origin or type'});return;}
      if(state.state==='running'||state.state==='cleaning'){json(res,409,{error:'A run or cleanup is active'});return;}
      const previous=state;
      state={state:'cleaning'};
      let removed=0,bytes=0;
      try{
        const config=await body(req);
        if(config?.confirm!=='remove-previous-session-runs'||Object.keys(config).length!==1){json(res,400,{error:'Explicit cleanup confirmation required'});return;}
        const result=removeRuns(cleanupCandidates());removed=result.removed;bytes=result.bytes;
        if(result.error)throw Error(result.error);
        json(res,200,{removed,bytes,cache:cacheInfo(),deployment:'not performed'});
      }catch(e){json(res,400,{error:String(e.message),removed,bytes,cache:cacheInfo()});}
      finally{state=previous;}
      return;
    }
    if(req.method==='POST'&&u.pathname==='/api/run'){
      if(req.headers.origin!==origin||!/^application\/json(?:;|$)/i.test(req.headers['content-type']??'')){json(res,403,{error:'Invalid request origin or type'});return;}
      if(state.state==='running'||state.state==='cleaning'){json(res,409,{error:'A run is already active'});return;}
      // Reserve the run before awaiting the request body, preventing simultaneous starts.
      state={state:'running'};
      let config;
      try{config=await body(req);}catch(e){state={state:'error',error:String(e.message)};json(res,400,state);return;}
      const output=join(outputRoot,'run-'+randomUUID());
      json(res,202,state);
      setImmediate(async()=>{
        try{
          const result=await runPipeline({source,output,config,toolRoot});
          completedRuns.set(output,Date.now());
          latest=output;
          state={state:'done',result:{output,site:join(output,'package','site'),audit:result.audit,packaging:result.packaging,deployment:result.deployment}};
        }catch(e){state={state:'error',error:String(e.message)};}
      });
      return;
    }
    json(res,404,{error:'Not found'});
  });
  server.requestTimeout=30000;
  server.headersTimeout=15000;
  await new Promise((done,fail)=>{server.once('error',fail);server.listen(port,'127.0.0.1',done);});
  origin='http://127.0.0.1:'+server.address().port;
  const timer=setInterval(scheduledCleanup,60000);timer.unref();
  return {origin,close:()=>new Promise(done=>{clearInterval(timer);server.close(done);server.closeAllConnections();})};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  if(process.argv.length!==2)throw Error('Usage: npm run performance:studio');
  const root=fileURLToPath(new URL('../../',import.meta.url));
  const server=await startStudio({source:join(root,'dist'),outputRoot:join(root,'.creaid-performance-runs'),toolRoot:join(root,'.performance-tools'),port:0});
  console.log('CreAid Performance Studio: '+server.origin+' (im Browser öffnen; Strg+C beendet den Server)');
}
