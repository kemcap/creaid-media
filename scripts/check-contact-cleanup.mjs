import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
const names=readdirSync('dist').filter(n=>n.endsWith('.html'));
const failures=[];
for(const name of names){
 const html=readFileSync('dist/'+name,'utf8');
 const footer=html.match(/<footer class="cm-footer"[\s\S]*?<\/footer>/)?.[0];
 if(!footer||!footer.includes('tel:+4922129256011')||/<address\b/i.test(footer))failures.push(name+': footer');
 if(/(?:\+49|0049|0)[\s()/-]*1567[\s()/-]*8[\s()/-]*4[\s()/-]*5[\s()/-]*1[\s()/-]*1[\s()/-]*5[\s()/-]*2\b/.test(html))failures.push(name+': obsolete phone');
}
assert.deepEqual(failures,[]);
const imprint=readFileSync('dist/impressum.html','utf8');
assert.ok(imprint.includes('Çağlayan Mah. 2043 Sk.'), 'Registered business street missing from imprint');
assert.ok(imprint.includes('Doruk Apt. No: 1, İç Kapı No: 6'), 'Registered business unit missing from imprint');
assert.ok(imprint.includes('Muratpaşa / Antalya'), 'Registered business locality missing from imprint');
assert.ok(!imprint.includes('Yeniköy Mahallesi'), 'Previous address must not remain in the imprint');
const contact=readFileSync('dist/kontakt.html','utf8');
assert.ok(contact.includes('* Pflichtfelder · <a href="/datenschutz">Datenschutz</a>'));
assert.ok(!contact.includes('>Direkt per E-Mail ↗</a>'));
console.log('CONTACT_CLEANUP_OK '+names.length+' pages');
