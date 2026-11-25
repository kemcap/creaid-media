// Read-only hosting release plan between two local static site trees.
import {createHash} from 'node:crypto';
import {existsSync,lstatSync,readdirSync,readFileSync,writeFileSync,realpathSync} from 'node:fs';
import {join,resolve,relative,sep,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
const hash=b=>createHash('sha256').update(b).digest('hex');
const fingerprint=/^assets\/[A-Za-z0-9_./-]+\.sha256-([a-f0-9]{64})\.(css|js|mjs|webp|avif|png|jpe?g|gif|svg|woff2?|ico)$/;
const inside=(a,b)=>{const r=relative(a,b);return r===''||(!r.startsWith('..'+sep)&&r!=='..'&&!r.startsWith(sep));};
const future=p=>existsSync(p)?realpathSync(p):join(future(dirname(p)),relative(dirname(p),p));
function inventory(root){
  if(lstatSync(root).isSymbolicLink()||!existsSync(join(root,'index.html')))throw Error('Expected static site root');
  const rows=new Map();
  function walk(dir){
    for(const e of readdirSync(dir,{withFileTypes:true})){
      const p=join(dir,e.name),path=relative(root,p).split(sep).join('/');
      if(e.isSymbolicLink())throw Error('Symlink forbidden: '+path);
      if(e.isDirectory())walk(p);
      else if(e.isFile()){
        const bytes=readFileSync(p),sha256=hash(bytes),m=path.match(fingerprint);
        if(m&&m[1]!==sha256)throw Error('Invalid fingerprint: '+path);
        rows.set(path,{path,sha256,bytes:bytes.length,versioned:!!m});
      }else throw Error('Unsupported file: '+path);
    }
  }
  walk(root);return rows;
}
export function planRelease({before,after}){
  before=resolve(before);after=resolve(after);
  if(inside(realpathSync(before),realpathSync(after))||inside(realpathSync(after),realpathSync(before)))throw Error('Use separate release trees');
  const a=inventory(before),b=inventory(after);
  const phases={immutableAssets:[],otherAssets:[],html:[],serverRules:[],reviewOther:[]},retained=[],unchanged=[],blocked=[];
  for(const row of b.values()){
    const old=a.get(row.path);
    if(old?.sha256===row.sha256){unchanged.push(row.path);continue;}
    const entry={...row,action:old?'replace':'add',previousSha256:old?.sha256??null};
    if(row.versioned){if(old)throw Error('Immutable URL changed');phases.immutableAssets.push(entry);}
    else if(/^assets\//.test(row.path)&&!/\.(?:php[0-9]*|phtml|phar|cgi|fcgi|pl|py|asp|aspx|jsp|sh|exe)$/i.test(row.path)&&!row.path.split('/').some(p=>p.startsWith('.')))phases.otherAssets.push(entry);
    else if(/\.html?$/i.test(row.path))phases.html.push(entry);
    else if(/(?:^|\/)\.htaccess$/.test(row.path)||row.path==='robots.txt')phases.serverRules.push(entry);
    else phases.reviewOther.push(entry);
  }
  for(const row of a.values())if(!b.has(row.path)){
    retained.push({...row,reason:row.versioned?'Retain old immutable assets for open tabs and rollback':'Manual review of stale files and routes; no automatic deletion'});
    if(!row.versioned)blocked.push({path:row.path,reason:'Removed unversioned file requires explicit handling'});
  }
  const mutable=phases.otherAssets.filter(r=>r.action==='replace');
  if(mutable.length)blocked.push({reason:'Mutable assets change at stable URLs; prefer atomic release switch, not in-place upload',count:mutable.length});
  if(phases.reviewOther.length)blocked.push({reason:'Additional file types require review',count:phases.reviewOther.length});
  for(const p of b.keys()){
    if(/(?:^|\/)(?:\.htpasswd|\.env(?:\..*)?|\.git)(?:\/|$)/i.test(p)||/\.(?:php[0-9]*|phtml|phar|cgi|fcgi|pl|py|asp|aspx|jsp|sh|exe)$/i.test(p))blocked.push({path:p,reason:'Sensitive or executable file in static release'});
  }
  const sampleHtml=readFileSync(join(after,'index.html'),'utf8');
  const policy=existsSync(join(after,'.htaccess'))?readFileSync(join(after,'.htaccess'),'utf8'):'';
  const previewMarkers=/<meta\b[^>]*\bnoindex\b[^>]*>/i.test(sampleHtml)||/noindex|AuthType|Require\s+valid-user/i.test(policy);
  if(previewMarkers)blocked.push({reason:'Preview/protected build; never use as public production'});
  return {mode:'local-release-plan',deployment:'not performed',automaticDeletion:false,previewMarkers,counts:{before:a.size,after:b.size,unchanged:unchanged.length,retained:retained.length,changed:Object.values(phases).reduce((n,x)=>n+x.length,0)},phases,retained,blocked,sequence:['Verify target and previous full backup','Prefer atomic document-root/release switch; retain previous immutable assets','If non-atomic, upload new immutable assets before dependent HTML; review mutable assets and server rules separately','Check routes, headers, content and rollback before activation'],limitations:['No upload, remote file access, purge or deployment.','Preview checks are heuristics, not a confidentiality audit or production approval.','Retained list is advisory: old versioned assets need a deliberate retention policy; removed unversioned routes may need redirects or explicit removal.','Do not execute these phases blindly on a live site.']};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const [before,after,out,...extra]=process.argv.slice(2);
  if(!before||!after||!out||extra.length||existsSync(out)||[before,after].some(p=>inside(realpathSync(p),future(resolve(out)))))throw Error('Usage: node scripts/performance/release-plan.mjs <previous-site> <next-site> <new-report-outside-sites.json>');
  const report=planRelease({before,after});
  writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({counts:report.counts,blockers:report.blocked.length,previewMarkers:report.previewMarkers,deployment:report.deployment},null,2));
}
