// Produce a reviewable Balanced candidate from an unoptimized build audit.
// No transformations, no guessed sizes, no script scheduling changes.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const safe=p=>typeof p==='string'&&/^\/assets\/[A-Za-z0-9_./-]+$/.test(p)&&!p.slice(1).split('/').some(x=>!x||x==='.'||x==='..'||x.startsWith('.'))&&!/\.sha256-|\.responsive-|\.min\./i.test(p);
export function suggestBalanced(audit){
 if(audit?.mode!=='static-build-audit'||!Array.isArray(audit.assets)||!Array.isArray(audit.pages))throw Error('Expected original static build audit');
 const eligible=audit.assets.filter(a=>safe(a.path)&&Number.isSafeInteger(a.bytes)&&a.bytes>0&&Number.isSafeInteger(a.pages)&&a.pages>0);
 const ordered=eligible.slice().sort((a,b)=>b.bytes*b.pages-a.bytes*a.pages||a.path.localeCompare(b.path));
 const optimize=ordered.filter(a=>/\.(?:css|m?js|png|webp)$/i.test(a.path)&&a.bytes>=8192).slice(0,30);
 const responsive=ordered.filter(a=>/\.(?:png|jpe?g|webp)$/i.test(a.path)&&a.bytes>=128*1024).slice(0,20);
 const config={schemaVersion:1};
 if(optimize.length)config.optimize={files:optimize.map(a=>a.path.slice(1))};
 if(responsive.length)config.responsive={images:responsive.map(a=>a.path.slice(1)),widths:[320,480,768,1024,1440],quality:82};
 return {mode:'balanced-review-proposal',config,selected:{optimize:optimize.length,responsive:responsive.length},limitations:['Review the selected assets before running. Ranking uses uncompressed bytes multiplied by page count, not measured traffic or savings.','Responsive variants are not inserted automatically: add measured layout sizes explicitly. No critical CSS or delay scripts.','The optimizer still validates source maps, SRI, image metadata, actual size savings and source isolation. Browser QA is required.']};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [input,output,...extra]=process.argv.slice(2);
 if(!input||!output||extra.length||existsSync(output))throw Error('Usage: node scripts/performance/suggest-balanced.mjs <original-audit.json> <new-config.json>');
 const proposal=suggestBalanced(JSON.parse(readFileSync(input,'utf8')));
 writeFileSync(output,JSON.stringify(proposal.config,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({selected:proposal.selected,limitations:proposal.limitations},null,2));
}
