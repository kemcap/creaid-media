import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const read=name=>readFileSync('dist/'+name,'utf8');
const home=read('index.html'),services=read('leistungen.html'),contact=read('kontakt.html');
assert.ok(!/<a\b[^>]*role="listitem"/.test(home),'Link roles overwritten');
assert.ok(home.includes('aria-label="Vier Kompetenzbereiche"'));
for(const name of readdirSync('dist').filter(n=>n.endsWith('.html'))){
 const page=read(name);
 assert.ok(page.includes('cm-header__branches'),name+' missing branch navigation');
 assert.ok(page.includes('href="/leistungen#foto-video"'),name+' missing media link');
 assert.ok(page.includes('name="robots" content="noindex,nofollow,noarchive"'),name+' preview guard missing');
}
for(const path of ['webdesign','digitales-marketing','grafikdesign-2','ki-automatisierung'])assert.ok(services.includes('href="/'+path+'"'));
assert.ok(services.includes('id="foto-video"'));
assert.ok(services.includes('360°-Rundgänge'));
assert.ok(contact.includes('value="Foto &amp; Video"'));
assert.ok((contact.match(/class="a-option"/g)||[]).length===4);
console.log('PASS: service navigation, media anchor, contact topics, native links and preview guard');
