import assert from 'node:assert/strict';
import { mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { prepareCandidate,cachePolicy } from './prepare-candidate.mjs';
const root=mkdtempSync(join(tmpdir(),'creaid-perf-'));
try{
  const source=join(root,'dist'),out=join(root,'candidate');
  mkdirSync(join(source,'assets'),{recursive:true});
  const raw = `<script>const sample = '<img src="/assets/missing.webp">';</script><!-- <img src="/assets/missing.webp"> --><textarea><img src="/assets/missing.webp"></textarea>`;
  const html='<html><meta name="robots" content="noindex,nofollow,noarchive"><link href="/assets/style.css" rel="stylesheet"><img src="/assets/a.webp" srcset="/assets/a.webp 1x, /assets/b.webp 2x"><a href="/kontakt#anfrage">Kontakt</a><script src="/assets/app.js?v=1"></script><img src="https://example.test/external.webp">'+raw+'</html>';
  writeFileSync(join(source,'index.html'),html);
  writeFileSync(join(source,'assets/style.css'),'body{background:url(a.webp)}');
  writeFileSync(join(source,'assets/app.js'),'console.log("test")');
  writeFileSync(join(source,'assets/a.webp'),'fixture A');
  writeFileSync(join(source,'assets/b.webp'),'fixture B');
  const report=prepareCandidate({source,output:out});
  assert.equal(report.pages,1);assert.equal(report.assets,4);
  assert.equal(readFileSync(join(source,'index.html'),'utf8'),html);
  const updated=readFileSync(join(out,'site/index.html'),'utf8');
  assert.ok(updated.includes('noindex,nofollow,noarchive'));
  assert.ok(updated.includes(raw));
  assert.ok(updated.includes('/kontakt#anfrage'));
  assert.ok(updated.includes('https://example.test/external.webp'));
  for(const row of report.manifest){
    assert.ok(updated.includes(row.fingerprinted));
    const bytes=readFileSync(join(out,'site',row.fingerprinted.slice(1)));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256);
    assert.ok(existsSync(join(out,'site',row.original.slice(1))));
  }
  assert.ok(updated.includes('.js?v=1'));
  assert.ok(!cachePolicy().includes('immutable'));
  assert.ok(cachePolicy('production-candidate').includes('immutable'));
  assert.throws(()=>prepareCandidate({source,output:out}));
  assert.throws(()=>prepareCandidate({source,output:join(source,'bad')}));
  assert.throws(()=>cachePolicy('unknown'));
  console.log('PASS: fingerprint integrity, srcset, queries, original assets, preview no-store, isolated output');
}finally{rmSync(root,{recursive:true,force:true});}
