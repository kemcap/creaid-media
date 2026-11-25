// Create a cache candidate from the freshly generated IONOS preview, without changing dist.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {prepareCandidate} from '../../scripts/performance/prepare-candidate.mjs';
import {apachePolicy,verifyCandidate} from '../../scripts/performance/engine.mjs';
import {previewHostingRules} from '../../scripts/performance/preview-hosting.mjs';
const source='dist',output='preview-cache-package';
assert.ok(!existsSync(output),'Use a fresh candidate directory');
const baseline=readFileSync(join(source,'.htaccess'),'utf8');
assert.ok(baseline.startsWith('# Generated from scripts/routes.mjs; preview only'),'Expected generated IONOS rules');
assert.match(baseline,/Header always set X-Robots-Tag "noindex, nofollow, noarchive"/);
assert.match(baseline,/Header always set Cache-Control "no-store, no-cache, must-revalidate, max-age=0"/);
assert.ok(!/BEGIN CREAID PERFORMANCE ENGINE|BEGIN CREAID PREVIEW HOST CACHE|AuthType|AuthUserFile/i.test(baseline),'Unexpected or protected preview configuration');
const manifest=JSON.parse(readFileSync('ionos-deploy-manifest.json','utf8'));
for(const page of manifest.pages)assert.ok(readFileSync(join(source,page),'utf8').includes('name="robots" content="noindex,nofollow,noarchive"'),'Missing preview protection');
const report=prepareCandidate({source,output});
verifyCandidate(output,report);
const rules=baseline+(baseline.endsWith('\n')?'':'\n')+apachePolicy('preview')+previewHostingRules;
writeFileSync(join(output,'site','.htaccess'),rules);
for(const page of manifest.pages){
 const original=readFileSync(join(source,page),'utf8');
 const candidate=readFileSync(join(output,'site',page),'utf8');
 const reverse=new Map(report.manifest.map(x=>[x.fingerprinted,x.original]));
 const restored=candidate.replace(/\/assets\/[A-Za-z0-9_./-]+\.sha256-[a-f0-9]{64}\.[A-Za-z0-9]+/g,x=>reverse.get(x)??x);
 assert.equal(restored,original,'Unexpected HTML change: '+page);
}
assert.equal(readFileSync(join(source,'.htaccess'),'utf8'),baseline);
console.log(JSON.stringify({pages:manifest.pages.length,assets:report.manifest.length,mode:'dedicated-preview-cache-candidate',deployment:'not performed'}));
