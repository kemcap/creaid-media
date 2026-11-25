// Local static-build snapshots and non-destructive restoration.
import {createHash} from 'node:crypto';
import {existsSync,lstatSync,realpathSync,readdirSync,readFileSync,writeFileSync,cpSync,mkdirSync,rmSync} from 'node:fs';
import {resolve,join,relative,dirname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
const inside=(a,b)=>{const r=relative(a,b);return r===''||(!r.startsWith('..'+sep)&&r!=='..'&&!r.startsWith(sep));};
const future=p=>existsSync(p)?realpathSync(p):join(future(dirname(p)),relative(dirname(p),p));
function disjoint(a,b){
  if(existsSync(b)||inside(realpathSync(a),future(b))||inside(future(b),realpathSync(a)))throw Error('Use new isolated output directory');
}
function inventory(root){
  if(lstatSync(root).isSymbolicLink()||!lstatSync(root).isDirectory()||!existsSync(join(root,'index.html')))throw Error('Expected static build root');
  const rows=[];
  function visit(dir){
    for(const e of readdirSync(dir,{withFileTypes:true})){
      const p=join(dir,e.name),path=relative(root,p).split(sep).join('/');
      if(e.isSymbolicLink())throw Error('Symlink forbidden: '+path);
      if(e.isDirectory()){rows.push({path,type:'directory'});visit(p);}
      else if(e.isFile()){
        const bytes=readFileSync(p);
        rows.push({path,type:'file',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
      }else throw Error('Unsupported file: '+path);
    }
  }
  visit(root);
  return rows.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
}
function verify(site,manifest){
  if(manifest.schemaVersion!==1||!Array.isArray(manifest.entries)||JSON.stringify(inventory(site))!==JSON.stringify(manifest.entries))throw Error('Snapshot integrity mismatch');
}
export function snapshotBuild({source,output}){
  source=resolve(source);output=resolve(output);disjoint(source,output);
  const entries=inventory(source),manifest={schemaVersion:1,entries};
  mkdirSync(output,{recursive:false});
  try{
    const site=join(output,'site');cpSync(source,site,{recursive:true,errorOnExist:true,force:false});
    verify(site,manifest);
    writeFileSync(join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
    return {files:entries.filter(e=>e.type==='file').length,bytes:entries.reduce((n,e)=>n+(e.bytes??0),0)};
  }catch(error){rmSync(output,{recursive:true,force:true});throw error;}
}
export function verifySnapshot(snapshot){
  snapshot=resolve(snapshot);
  if(lstatSync(snapshot).isSymbolicLink()||lstatSync(join(snapshot,'manifest.json')).isSymbolicLink())throw Error('Symlink forbidden');
  const manifest=JSON.parse(readFileSync(join(snapshot,'manifest.json'),'utf8'));
  verify(join(snapshot,'site'),manifest);
  return manifest;
}
export function restoreBuild({snapshot,output}){
  snapshot=resolve(snapshot);output=resolve(output);disjoint(snapshot,output);
  const site=join(snapshot,'site'),manifest=verifySnapshot(snapshot);
  mkdirSync(output,{recursive:false});
  try{
    cpSync(site,output,{recursive:true,errorOnExist:true,force:false});
    verify(output,manifest);
    return {files:manifest.entries.filter(e=>e.type==='file').length,restored:true,deployment:'not performed'};
  }catch(error){rmSync(output,{recursive:true,force:true});throw error;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const [mode,source,output,...extra]=process.argv.slice(2);
  if(!['snapshot','restore'].includes(mode)||!source||!output||extra.length)throw Error('Usage: node scripts/performance/snapshot.mjs snapshot|restore <input> <new-output>');
  console.log(JSON.stringify(mode==='snapshot'?snapshotBuild({source,output}):restoreBuild({snapshot:source,output}),null,2));
}
