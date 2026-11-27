// IONOS production only: keep ordinary and GitHub Pages builds protected.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const host='creaid-media.de';
const origin='https://'+host;
const routes=JSON.parse(readFileSync('src/_data/routes.json','utf8'));
const posts=JSON.parse(readFileSync('src/_data/postsIndex.json','utf8'));
const sitemap=readFileSync('docs/sitemap-kandidat-nach-freigabe.xml','utf8');
const indexable=new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>{
  const u=new URL(m[1]);assert.equal(u.origin,origin);return u.pathname;
}));
for(const post of posts){assert.equal(routes[post.slug],post.url);indexable.add(post.url);}
assert.equal(posts.length,new Set(posts.map(p=>p.slug)).size);
assert.ok(indexable.has('/')&&indexable.has('/ki-automatisierung-fuer-unternehmen'));
for(const path of indexable)assert.ok(Object.values(routes).includes(path),'Unknown indexable route '+path);
for(const path of ['/projekt-detail','/impressum','/datenschutz','/cookie-einstellungen'])assert.ok(!indexable.has(path));
const tag='name="robots" content="noindex,nofollow,noarchive"';
const replacement='name="robots" content="index,follow"';
const oldHeader='Header always set X-Robots-Tag "noindex, nofollow, noarchive"';
const conditional=oldHeader+' "expr=%{HTTP_HOST} != \''+host+'\'"';
const sitemapXML='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+[...indexable].sort().map(p=>'  <url><loc>'+origin+p+'</loc></url>').join('\n')+'\n</urlset>\n';
for(const dir of ['dist','preview-cache-package/site']){
  for(const [key,path] of Object.entries(routes)){
    const file=join(dir,key+'.html');const html=readFileSync(file,'utf8');
    assert.equal(html.split(tag).length,2,'Expected exactly one protected robots meta '+path);
    assert.ok(html.includes('rel="canonical" href="'+origin+path+'"'),'Canonical mismatch '+path);
    const previewNotice='<span data-creaid-preview-notice>Designvorschau · Nicht die veröffentlichte Unternehmenswebsite</span>';
    assert.equal(html.split(previewNotice).length,2,'Expected exactly one preview notice '+path);
    const productionHTML=html.replace(previewNotice,'<span data-creaid-preview-notice hidden></span>');
    writeFileSync(file,indexable.has(path)?productionHTML.replace(tag,replacement):productionHTML);
  }
  const file=join(dir,'.htaccess');let rules=readFileSync(file,'utf8');
  assert.ok(rules.includes(oldHeader)&&!rules.includes('CREAID PRODUCTION INDEXING'));
  rules=rules.replaceAll(oldHeader,conditional).replaceAll("%{HTTP_HOST} == 'vorschau.creaid-media.de'","%{HTTP_HOST} == '"+host+"'");
  rules+='\n# CREAID PRODUCTION INDEXING — non-production hosts stay noindex\n';
  writeFileSync(file,rules);
  writeFileSync(join(dir,'sitemap.xml'),sitemapXML);
  writeFileSync(join(dir,'robots.txt'),'User-agent: *\nDisallow:\nSitemap: '+origin+'/sitemap.xml\n');
}
console.log('Prepared '+indexable.size+' indexable canonical URLs including '+posts.length+' journal articles; other pages retain noindex.');
