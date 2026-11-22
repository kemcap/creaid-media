import assert from 'node:assert/strict';
import { redirects, routeFiles } from './routes.mjs';

const base = new URL(process.argv[2] || 'http://127.0.0.1:8080');
const canonicalPaths = Object.keys(routeFiles);
const canonicalDomain = 'https://creaid-media.de';

for (const path of canonicalPaths) {
  const response = await fetch(new URL(path, base), { redirect: 'manual' });
  assert.equal(response.status, 200, path);
  assert.match(response.headers.get('content-type'), /text\/html/, path);
  const body = await response.text();
  assert.ok(body.includes(`rel="canonical" href="${canonicalDomain + path}"`), path);
  assert.ok(body.includes('name="robots" content="noindex,nofollow,noarchive"'), path);
}
for (const [path, target] of redirects) {
  const response = await fetch(new URL(path + '?qa=1', base), { redirect: 'manual' });
  assert.equal(response.status, 301, path);
  const location = new URL(response.headers.get('location'), base);
  assert.equal(location.pathname + location.search, target + '?qa=1', path);
}
const assets = [
  '/assets/fonts.css',
  '/assets/fonts/ubuntu-latin-400-normal.woff2',
  '/assets/vendor/gsap.min.js',
  '/assets/vendor/ScrollTrigger.min.js',
  '/assets/creaid-media-logo.webp',
  '/robots.txt'
];
for (const path of assets) {
  const response = await fetch(new URL(path, base), { method: 'HEAD' });
  assert.equal(response.status, 200, path);
}
for (const path of ['/qa-nicht-vorhanden', '/sitemap.xml', '/sitemap-blog-v9.xml']) {
  const response = await fetch(new URL(path, base), { redirect: 'manual' });
  assert.equal(response.status, 404, path);
}
console.log(`${canonicalPaths.length} kanonische URLs, ${redirects.length} direkte 301, ${assets.length} Ressourcen und 3 Negativtests bestanden.`);
