import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { redirect } from './routes.mjs';

function collect(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? collect(p) : p.endsWith('.html') ? [p] : [];
  });
}
const files = collect('dist');
if (files.length < 50) throw new Error(`Expected at least 50 HTML pages, got ${files.length}`);
const links = ['/leistungen/webdesign', '/leistungen/marketing', '/leistungen/branding', '/leistungen/ki-automatisierung', '/kontakt'];
for (const file of files) {
  const html = readFileSync(file, 'utf8');
  const headerCount = (html.match(/class="cm-site-header"/g) || []).length;
  const footerCount = (html.match(/class="cm-site-footer"/g) || []).length;
  if (headerCount !== 1 || footerCount !== 1) throw new Error(`${relative('dist',file)}: header ${headerCount}, footer ${footerCount}`);
  for (const target of links) {
    if (!html.includes(`href="${target}"`)) throw new Error(`${relative('dist',file)} is missing footer destination ${target}`);
  }
  if (!html.includes('global-shell.css') || !html.includes('global-shell.js')) throw new Error(`${relative('dist',file)} missing global shell assets`);
}
for(const asset of ['dist/assets/global-shell.css','dist/assets/global-shell.js','dist/assets/creaid-media-logo.webp']){
  if(!existsSync(asset)) throw new Error('Missing global asset '+asset);
}
const destinations = {
 '/leistungen/webdesign':'/webdesign',
 '/leistungen/marketing':'/digitales-marketing',
 '/leistungen/branding':'/grafikdesign-2',
 '/leistungen/ki-automatisierung':'/ki-automatisierung'
};
for (const [source,dest] of Object.entries(destinations)) {
  const actual=redirect(new URL(source, 'https://creaid-media.de'));
  if(actual !== dest)throw new Error(`Incorrect redirect: ${source} -> ${actual}`);
}
console.log(`PASS: ${files.length} HTML pages; one global header and footer per page; expected links/assets/routes.`);
