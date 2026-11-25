import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const data=JSON.parse(readFileSync('src/_data/pricing.json','utf8'));
for(const [page,key] of Object.entries({webdesign:'seo','webdesign-handwerker':'seo','webdesign-aerzte':'praxis','webdesign-immobilienmakler':'immo'})){
 const html=readFileSync('dist/'+page+'.html','utf8');
 assert.equal((html.match(/id="cm-pricing-title"/g)||[]).length,1,page);
 assert.equal((html.match(/class="cm-pricing__details"/g)||[]).length,3,page);
 for(const p of data.groups[key].packages){assert.ok(html.includes(p.name),page+' '+p.name);assert.ok(html.includes(p.displayPrice),page+' '+p.displayPrice);assert.ok(html.includes('paket='+encodeURIComponent(p.name)),page+' CTA');}
 assert.ok(html.includes('/assets/pricing.css'));
}
assert.equal(data.groups.seo.packages.map(x=>x.price).join(','),'199,349,649');
for(const key of ['praxis','immo'])assert.equal(data.groups[key].packages.map(x=>x.price).join(','),'1490,2290,3490');
console.log('PASS: 4 pricing sections, 12 cards, 9 central offers and package CTA');
