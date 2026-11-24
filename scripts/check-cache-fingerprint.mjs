import assert from 'node:assert/strict';
import {mkdtempSync,cpSync,readFileSync,writeFileSync,rmSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';import {execFileSync} from 'node:child_process';
const tmp=mkdtempSync(join(tmpdir(),'creaid-fingerprint-'));
try{
 const dirs=['a','b','c'].map(s=>join(tmp,s));
 for(const d of dirs)cpSync('dist',d,{recursive:true});
 const run=d=>JSON.parse(execFileSync(process.execPath,['scripts/fingerprint-preview-assets.mjs',d],{encoding:'utf8'}).match(/ASSET_FINGERPRINT (.*)/)[1]);
 const a=run(dirs[0]),b=run(dirs[1]);assert.deepEqual(a,b);
 assert.equal(readFileSync(join(dirs[0],'index.html'),'utf8'),readFileSync(join(dirs[1],'index.html'),'utf8'));
 const file=join(dirs[2],'assets/global-shell.css');writeFileSync(file,readFileSync(file,'utf8')+'\n/* fingerprint change probe */');
 const c=run(dirs[2]);assert.notEqual(a.version,c.version);
 for(const f of readdirSync(dirs[0]).filter(n=>n.endsWith('.html'))){
  const html=readFileSync(join(dirs[0],f),'utf8');
  assert.ok(html.includes('noindex,nofollow,noarchive'));
  for(const m of html.matchAll(/\b(?:src|href|poster|data-src)=["'](\/assets\/[^"']+)["']/g))assert.ok(m[1].includes('cmv='+a.version),f+' unversioned '+m[1]);
 }
 const home=readFileSync(join(dirs[0],'index.html'),'utf8');
 assert.match(home,/srcset="\/assets\/portfolio\/[^"]+\?cmv=[a-f0-9]{20} 600w,/);
 assert.ok(readFileSync(join(dirs[0],'assets/fonts.css'),'utf8').includes('?cmv='+a.version));
 assert.ok(readFileSync(join(dirs[0],'assets/scrollstory.js'),'utf8').includes('/assets/vendor/gsap.min.js?cmv='+a.version));
 console.log('PASS deterministic content fingerprint; CSS/font/JS/srcset coverage and version change');
}finally{rmSync(tmp,{recursive:true,force:true})}
