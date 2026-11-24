import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const map=JSON.parse(readFileSync('docs/audit/phase-4-keyword-map.json','utf8'));
const links=JSON.parse(readFileSync('src/_data/editorialLinks.json','utf8'));
const files=map.pages;assert.equal(files.length,98);
function main(key){const html=readFileSync('dist/'+key+'.html','utf8');return html.match(/<main\b[^>]*>[\s\S]*?<\/main>/)?.[0]||''}
function hrefs(key){return new Set([...main(key).matchAll(/<a\b[^>]*\bhref="([^"]+)"/gi)].map(m=>m[1].replaceAll('&amp;','&').split(/[?#]/)[0]))}
const articles=files.filter(p=>p.type==='article');assert.equal(articles.length,39);
const missing=articles.filter(p=>!hrefs(p.key).has(p.commercialTarget)).map(p=>({source:p.url,target:p.commercialTarget}));
const missingServices=['webdesign','branding','marketing','ki-automatisierung'].flatMap(key=>(links[key]||[]).filter(l=>!hrefs(key).has(l.url)).map(l=>({source:key,target:l.url})));
console.log('SEO_LINK_COVERAGE '+JSON.stringify({articles:articles.length,linked:articles.length-missing.length,missing,missingServices}));
assert.equal(missing.length+missingServices.length,0,'Missing rendered contextual links');
