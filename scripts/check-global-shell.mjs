import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { redirect } from './routes.mjs';

const assert = (ok, message) => { if (!ok) throw new Error(message); };
const file = (path) => readFileSync(path, 'utf8');
const pages = readdirSync('dist').filter(name => name.endsWith('.html'));
assert(pages.length >= 50, 'Expected the full CreAid-Media preview site to be generated, found ' + pages.length);
const expectedLinks = [
  '/leistungen/webdesign',
  '/leistungen/marketing',
  '/leistungen/branding',
  '/leistungen/ki-automatisierung',
  '/kontakt'
];
const expectedText = [
  'Leistungen im Überblick',
  'Webdesign und Entwicklung',
  'Digitales Marketing',
  'Branding und Grafikdesign',
  'KI und Automatisierung',
  'Projekt besprechen',
  '+49 1567 8451152',
  'info@creaid-media.de',
  'Yeniköy Mahallesi',
  'Impressum',
  'Datenschutz'
];
for (const name of pages) {
  const html = file('dist/' + name);
  for (const id of ['cm-global-header', 'cm-global-footer']) {
    const matches = html.match(new RegExp('id="' + id + '"', 'g')) || [];
    assert(matches.length === 1, name + ': expected exactly one ' + id + ', found ' + matches.length);
  }
  assert(html.includes('href="/assets/global-shell.css"'), name + ': global CSS missing');
  assert(html.includes('src="/assets/global-shell.js"'), name + ': global JS missing');
  for (const link of expectedLinks) assert(html.includes('href="' + link + '"'), name + ': missing link ' + link);
  for (const phrase of expectedText) assert(html.includes(phrase), name + ': missing footer text ' + phrase);
}
assert(existsSync('dist/assets/global-shell.css'), 'global CSS not built');
assert(existsSync('dist/assets/global-shell.js'), 'global JS not built');
const css = file('dist/assets/global-shell.css');
assert(css.includes('.cm-header__nav.is-open'), 'mobile navigation style missing');
assert(css.includes('.cm-footer__services'), 'footer service style missing');
const js = file('dist/assets/global-shell.js');
assert(js.includes("aria-expanded"), 'accessible menu behavior missing');
for (const [from,to] of Object.entries({
  '/leistungen/webdesign': '/webdesign',
  '/leistungen/marketing': '/digitales-marketing',
  '/leistungen/branding': '/grafikdesign-2',
  '/leistungen/ki-automatisierung': '/ki-automatisierung'
})) {
  assert(redirect(new URL('https://example.test' + from)) === to, 'Alias missing: ' + from);
  assert(redirect(new URL('https://example.test' + from + '/')) === to, 'Trailing slash alias missing: ' + from);
}
console.log('Global CreAid header/footer verified on ' + pages.length + ' generated HTML pages, including 5 footer links and 4 alias redirects.');
