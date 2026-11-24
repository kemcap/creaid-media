import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {routeFiles,redirects} from './routes.mjs';
const load=p=>readFileSync(p,'utf8');
const data=n=>JSON.parse(load('src/_data/'+n+'.json'));
const routes=data('routes'),pages=data('pages'),services=data('services'),categories=data('journalCategories');
assert.equal(Object.keys(routes).length,76);assert.equal(Object.keys(services).length,24);
assert.equal(Object.keys(categories).length,4);assert.equal(data('postsIndex').length,38);
assert.equal(readdirSync('dist').filter(f=>f.endsWith('.html')).length,76);
const names=new Set(),descriptions=new Set();
for(const [key,url] of Object.entries(routes)){
 const p=pages[key],h=load('dist/'+key+'.html');
 assert.ok(p.title&&p.description&&!names.has(p.title)&&!descriptions.has(p.description),'Duplicate/missing metadata: '+key);
 names.add(p.title);descriptions.add(p.description);
 assert.equal(p.canonical,'https://creaid-media.de'+url);
 assert.equal(p.robots,'noindex,nofollow,noarchive');
 for(const id of ['cm-global-header','cm-global-footer'])assert.equal((h.match(new RegExp('id="'+id+'"','g'))||[]).length,1,key+' '+id);
 assert.equal((h.match(/<h1\b/g)||[]).length,1,key+' H1 count');
 assert.ok(h.includes('/assets/global-shell.css')&&h.includes('/assets/ux-phase1.css')&&h.includes('/assets/adaptive-scroll.js'),key+' shared assets');
 if(p.structuredData)JSON.parse(p.structuredData);
 for(const tag of h.matchAll(/<(?:script|img|iframe|video|audio|source)\b[^>]*\bsrc=["']([^"']+)/gi))assert.ok(!/^(?:https?:)?\/\//i.test(tag[1]),key+' external resource');
}
for(const [k,v] of Object.entries(services)){
 const h=load('dist/'+k+'.html');
 assert.ok(h.includes('Häufige Fragen'),k+' missing FAQ');
 for(const child of v.children||[])assert.ok(h.includes('href="'+routes[child]+'"'),k+' missing child '+child);
}
const blog=load('dist/blog.html');
for(const k of Object.keys(categories))assert.ok(blog.includes('href="'+routes[k]+'"'),k+' missing journal navigation');
const index=load('dist/index.html');
assert.equal((index.match(/class="cm-hero-ticker__group"/g)||[]).length,2);
assert.ok(index.includes('class="axes"')&&index.includes('href="/kontakt#anfrage">Projekt besprechen'));
assert.ok(load('dist/assets/journal.js').includes("const tocLinks=$$('.j-toc"));
assert.ok(load('dist/impressum.html').includes('ENTWURF'));
assert.ok(!load('dist/assets/legal-pages.js').includes('localStorage.setItem'));
const alias=new Map(redirects);
for(const row of data('legacySitemapCoverage'))assert.ok(row.url===row.target||alias.get(row.url)===row.target,'Legacy URL missing '+row.url);
for(const [from,to] of redirects){assert.ok(!Object.hasOwn(routeFiles,from)&&Object.hasOwn(routeFiles,to),'Redirect conflict '+from);}
console.log('PASS: 76 pages, 24 services, 4 journal categories, 38 articles, shell, metadata, FAQ and legacy URLs.');
