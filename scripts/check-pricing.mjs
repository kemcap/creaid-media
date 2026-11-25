import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const data=JSON.parse(readFileSync('src/_data/pricing.json','utf8'));
const pages={webdesign:['webdesign','seo'],'webdesign-handwerker':['seo'],'webdesign-aerzte':['praxis'],'webdesign-immobilienmakler':['immo'],'google-ads-social-media':['ads','monthlyAds'],'performance-optimization-3':['conversion'],'upgrades-wartung':['maintenance']};
for(const [page,keys] of Object.entries(pages)){
 const html=readFileSync('dist/'+page+'.html','utf8');
 const ids=[...html.matchAll(/id="(cm-pricing-title[^"]*)"/g)].map(m=>m[1]);
 assert.equal(new Set(ids).size,ids.length,page+' duplicate pricing ID');
 assert.equal(ids.length,keys.length+(page==='webdesign'?1:0),page+' heading count');
 assert.equal((html.match(/class="cm-pricing__details"/g)||[]).length,keys.reduce((n,k)=>n+data.groups[k].packages.length,0),page);
 for(const k of keys)for(const p of data.groups[k].packages){assert.ok(html.includes(p.name),page+' '+p.name);assert.ok(html.includes(p.displayPrice),page+' '+p.displayPrice);assert.ok(html.includes('paket='+encodeURIComponent(p.name)),page+' CTA');}
 assert.ok(html.includes('/assets/pricing.css'));
 if(page==='webdesign'){assert.equal((html.match(/class="cm-pricing__module"/g)||[]).length,11);for(const g of data.modules)for(const m of g.items){assert.ok(html.includes('paket='+encodeURIComponent(m.name)));assert.ok(html.includes(m.displayPrice));}}
}
const amounts={seo:'199,349,649',praxis:'1490,2290,3490',immo:'1490,2290,3490',webdesign:'1490,2290,3490',conversion:'690,1290,2190',ads:'890,1390,1990',monthlyAds:'390,690,1090',maintenance:'99,299'};
for(const [key,expected] of Object.entries(amounts))assert.equal(data.groups[key].packages.map(x=>x.price).join(','),expected);
assert.equal(data.modules.flatMap(g=>g.items).map(m=>m.price).join(','),'79,79,129,99,149,99,149,149,199,39,');
console.log('PASS: 9 package sections, 26 package cards, 11 modules, exact source prices, unique heading IDs and package CTA');
