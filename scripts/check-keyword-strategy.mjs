import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const base='docs/seo/phase-3/';
const inventory=read(base+'keyword-inventory.json');
const scoring=read(base+'keyword-scoring.json').rows;
const assignments=read(base+'keyword-assignments.json');
const pageMap=read(base+'page-ownership.json');
const routes=read('src/_data/routes.json');
const sitemap=readFileSync('docs/sitemap-kandidat-nach-freigabe.xml','utf8');
const indexable=new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>new URL(m[1]).pathname).concat(read('src/_data/postsIndex.json').map(x=>x.url)));
const raw=new Map(Array.from({length:6},(_,i)=>read(base+'metrics-0'+(i+1)+'.json').rows).flat().map(x=>[x.keyword,x]));
const set=x=>new Set(x);
assert.deepEqual(set(pageMap.map(x=>x.pageKey)),set(Object.keys(routes)));
assert.equal(pageMap.length,Object.keys(routes).length);
assert.equal(pageMap.length,set(pageMap.map(x=>x.url)).size);
assert.deepEqual(set(scoring.map(x=>x.keyword)),set(inventory.candidates));
assert.equal(scoring.length,set(scoring.map(x=>x.keyword)).size);
assert.equal(assignments.length,scoring.length);
assert.deepEqual(set(scoring.map(x=>x.keyword)),set(assignments.map(x=>x.keyword)));
assert.equal(raw.size,inventory.candidates.length);
assert.ok(inventory.originalTracked.every(k=>scoring.find(x=>x.keyword===k)?.originalTracked));
const pageByKey=new Map(pageMap.map(x=>[x.pageKey,x]));
const focus=pageMap.map(x=>x.focusKeyword).filter(Boolean);
assert.equal(focus.length,set(focus.map(x=>x.toLowerCase())).size,'Duplicate editorial focus');
const approx=(a,b)=>a===null||b===null?assert.equal(a,b):assert.ok(Math.abs(a-b)<1e-8);
for(const page of pageMap){
 assert.equal(page.url,routes[page.pageKey]);
 assert.equal(page.role==='excluded',!indexable.has(page.url));
 if(page.role==='archive'||page.role==='excluded')assert.equal(page.focusKeyword,null);
 else assert.ok(page.focusKeyword);
 assert.deepEqual(set(page.ownedKeywords),set(scoring.filter(x=>x.pageKey===page.pageKey).map(x=>x.keyword)));
 if(page.commercialParent)assert.ok(indexable.has(page.commercialParent));
}
for(const row of scoring){
 const original=raw.get(row.keyword);
 assert.equal(row.volume,original.volume??null);
 assert.equal(row.cpcUSD,original.cpc??null);
 assert.equal(row.seoDifficulty,original.sd??null);
 const assignment=assignments.find(x=>x.keyword===row.keyword);
 for(const k of ['pageKey','target','intent','intentWeight','fit','priority'])assert.equal(row[k],assignment[k]);
 if(row.pageKey){assert.equal(row.target,routes[row.pageKey]);assert.ok(indexable.has(row.target));assert.ok(pageByKey.has(row.pageKey))}
 else {assert.equal(row.target,null);assert.ok(row.reason)}
 assert.equal(row.intentWeight,{Kauf:1.5,Vergleich:1.2,Information:1}[row.intent]);
 assert.ok([1,1.2,1.5].includes(row.fit));
 const {volume:v,cpcUSD:c,seoDifficulty:d}=row;
 const basic=v!==null&&d!==null?v/(d+1):null;
 const money=v!==null&&c!==null&&d!==null&&d>0?v*c/(d*d):null;
 approx(row.basicRatio,basic);approx(row.moneyRatio,money);
 approx(row.advancedScore,money===null?null:money*row.intentWeight);
 approx(row.businessScore,money===null?null:money*row.intentWeight*row.fit);
}
console.log('PASS: '+scoring.length+' keyword records, '+pageMap.length+' route owners, unique editorial focus, all four SEO formulas, intentional gaps and unchanged indexing policy.');
if(process.argv.includes('--export')){
 mkdirSync('seo-phase3-report',{recursive:true});
 const csv=(rows,columns)=>'\uFEFF'+columns.join(';')+'\n'+rows.map(r=>columns.map(k=>'"'+String(r[k]??'').replaceAll('"','""')+'"').join(';')).join('\n')+'\n';
 writeFileSync('seo-phase3-report/keyword-scoring.csv',csv(scoring,['keyword','originalTracked','target','priority','volume','seoDifficulty','cpcUSD','providerIntent','intent','intentWeight','fit','basicRatio','moneyRatio','advancedScore','businessScore','reason']));
 writeFileSync('seo-phase3-report/page-ownership.csv',csv(pageMap,['pageKey','url','role','focusKeyword','intent','commercialParent','ownedKeywords','publicationReview','phase','scope']));
}
