import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {decorateHeading} from './heading-dot.mjs';
const dot='<span class="cm-heading-dot" aria-hidden="true"></span>';
const period='<span class="cm-heading-dot" aria-hidden="true">.</span>';
assert.equal(decorateHeading('Hallo.'),'Hallo&#8288;'+period);
assert.equal(decorateHeading('<span>Eine</span><em>Idee.</em>'),'<span>Eine</span><em>Idee&#8288;'+period+'</em>');
assert.equal(decorateHeading('<span>MARKE<span class="pink-dot" aria-hidden="true"></span></span>'),'<span>MARKE<span class="pink-dot" aria-hidden="true"></span></span>');
assert.equal(decorateHeading('<em>Entwicklung<span class="pink-point">.</span></em>'),'<em>Entwicklung&#8288;'+period+'</em>');
assert.equal(decorateHeading('Frage?'),'Frage?&#8288;'+dot);
assert.equal(decorateHeading(decorateHeading('Text')),decorateHeading('Text'));
const files=readdirSync('dist').filter(n=>n.endsWith('.html'));
for(const file of files){
 const html=readFileSync('dist/'+file,'utf8');
 assert.ok(html.includes('class="cm-heading-dot"'),file+' missing global signature');
 for(const m of html.matchAll(/<h[12]\b[^>]*class="[^"]*cm-semantic-heading[^"]*"[^>]*>[\s\S]*?<\/h[12]>/g))assert.ok(!m[0].includes('cm-heading-dot'),file+' semantic label changed');
 assert.ok(html.includes('noindex,nofollow,noarchive'),file+' preview guard');
}
console.log('PASS: global signature on '+files.length+' generated pages, legacy period replacement and no duplicate dots');
