import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
const data=JSON.parse(readFileSync('src/_data/portfolio.json','utf8'));
const ref=readFileSync('dist/referenzen.html','utf8'),home=readFileSync('dist/index.html','utf8');
assert.equal(data.items.length,16);
assert.equal(new Set(data.items.map(x=>x.sha256)).size,16);
assert.equal((ref.match(/data-portfolio-index="/g)||[]).length,16);
assert.equal((home.match(/class="work-mock work-(?:mag|browser)"/g)||[]).length,2);
assert.ok(ref.indexOf('id="arbeitsproben"')<ref.indexOf('id="projekt-01"'));
assert.ok(ref.includes('KONZEPTSTUDIE / KEIN KUNDENPROJEKT'));
for(const item of data.items)for(const key of ['small','large']){
 const file='dist'+item[key];assert.ok(existsSync(file),file);assert.ok(statSync(file).size>0);
 assert.ok(ref.includes(item[key]),item.id+' not rendered');
}
assert.ok(!ref.includes('/wp-content/uploads/'),'No hotlinks');
console.log('PASS: 16 real portfolio images, 32 local responsive assets, 2 home selections, original studies distinctly labeled.');
