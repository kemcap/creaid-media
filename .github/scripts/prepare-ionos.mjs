import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {routeFiles,redirects} from '../../scripts/routes.mjs';
const esc=s=>s.replaceAll('.','\\.');
const validPath=s=>/^\/[a-z0-9/_.-]*$/.test(s)&&!s.includes('..')&&!s.includes('//');
const files=Object.entries(routeFiles);
const lines=['# Generated from scripts/routes.mjs; preview only','Options -MultiViews','DirectoryIndex index.html','<IfModule mod_rewrite.c>','RewriteEngine On','RewriteBase /','RewriteRule ^\\.creaid- [F,END]'];
for(const [from,to] of redirects){
 assert.ok(validPath(from)&&validPath(to)&&Object.hasOwn(routeFiles,to)&&!Object.hasOwn(routeFiles,from),'Invalid redirect: '+from);
 const p=esc(from.slice(1));
 lines.push('RewriteCond %{THE_REQUEST} \\s/+'+p+'(?:[?\\s])','RewriteRule ^'+p+'$ '+to+' [R=301,END,NE]');
}
for(const [url,file] of files){
 assert.ok(validPath(url)&&/^[a-z0-9-]+\.html$/.test(file),'Unsafe route');
 const html=readFileSync('dist/'+file,'utf8');
 assert.ok(html.includes('name="robots" content="noindex,nofollow,noarchive"'),'Missing preview protection: '+url);
 if(url!=='/')lines.push('RewriteRule ^'+esc(url.slice(1))+'$ /'+file+' [END]');
}
lines.push('</IfModule>','<IfModule mod_headers.c>','Header always set X-Robots-Tag "noindex, nofollow, noarchive"','Header onsuccess unset Cache-Control','Header always set Cache-Control "no-store, no-cache, must-revalidate, max-age=0"','</IfModule>','<FilesMatch "^\\.creaid-">','Require all denied','</FilesMatch>','');
assert.ok(existsSync('dist/assets')&&existsSync('dist/robots.txt'));
writeFileSync('dist/.htaccess',lines.join('\n'));
writeFileSync('ionos-deploy-manifest.json',JSON.stringify({pages:files.map(([,f])=>f),redirects:redirects.length},null,2));
console.log('Prepared '+files.length+' pages and '+redirects.length+' redirects; noindex preserved.');
