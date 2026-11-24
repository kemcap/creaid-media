import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {routeFiles,redirects} from './routes.mjs';
const out=process.env.CREAID_LAUNCH_OUTPUT||'qa-results/launch-candidate';
const origin='https://creaid-media.de';
const pages=JSON.parse(readFileSync(new URL('../src/_data/pages.json',import.meta.url),'utf8'));
const canonical=Object.entries(routeFiles).map(([route,file])=>({route,file,url:origin+route,previewRobots:pages[file.replace(/\.html$/,'')]?.robots}));
const seen=new Set(canonical.map(c=>c.route));
assert.equal(seen.size,canonical.length);
for(const c of canonical){
 assert.ok(existsSync('dist/'+c.file),'Missing built page '+c.file);
 const html=readFileSync('dist/'+c.file,'utf8');
 assert.ok(html.includes('name="robots" content="noindex,nofollow,noarchive"'),'Preview protection missing: '+c.route);
 assert.ok(html.includes('rel="canonical" href="'+c.url+'"'),'Canonical mismatch '+c.route);
}
for(const [from,to] of redirects){assert.ok(!seen.has(from),'Redirect shadows canonical '+from);assert.ok(seen.has(to),'Redirect target missing '+to);}
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
mkdirSync(out,{recursive:true});
writeFileSync(out+'/routing-manifest.json',JSON.stringify({status:'NOT APPROVED FOR PRODUCTION',origin,canonical,redirects:redirects.map(([from,to])=>({from,to,status:301})),preserveQuery:true},null,2));
writeFileSync(out+'/sitemap-candidate.xml','<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+canonical.filter(c=>!['/impressum','/datenschutz','/cookie-einstellungen'].includes(c.route)).map(c=>'  <url><loc>'+esc(c.url)+'</loc></url>').join('\n')+'\n</urlset>\n');
writeFileSync(out+'/README.txt','PREVIEW ONLY. Do not deploy these files or remove noindex until the production release is explicitly approved. Candidate sitemap excludes legal utility pages as an editorial proposal; confirm before publishing. See docs/production-readiness.md.\n');
console.log('Launch candidate: '+canonical.length+' canonical routes; '+redirects.length+' redirects; preview protection verified; files outside dist.');
