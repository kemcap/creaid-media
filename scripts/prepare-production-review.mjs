import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import apacheRoutes from '../src/_data/apacheRoutes.js';
import { redirect, routeFiles } from './routes.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const domain = 'https://creaid-media.de';
const sitemap = join(root, 'docs/sitemap-kandidat-nach-freigabe.xml');
const robotsMeta = 'name="robots" content="noindex,nofollow,noarchive"';
const legalPages = ['/impressum', '/datenschutz', '/cookie-einstellungen'];
const readJson = name => JSON.parse(readFileSync(join(root, 'src/_data', name + '.json'), 'utf8'));

assert.equal(process.argv.length, 3, 'Usage: node scripts/prepare-production-review.mjs <new output directory>');
const output = resolve(process.argv[2]);
assert.ok(!existsSync(output), 'Use a new output directory');

const locs = [...readFileSync(sitemap, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => new URL(match[1]));
assert.ok(locs.length > 0, 'Candidate sitemap is empty');
for (const url of locs) {
  assert.equal(url.href, domain + url.pathname);
  assert.ok(Object.hasOwn(routeFiles, url.pathname), 'Unknown sitemap route: ' + url.pathname);
}
const indexedRoutes = new Set(locs.map(url => url.pathname));
assert.equal(indexedRoutes.size, locs.length, 'Duplicate sitemap route');
for (const path of legalPages) assert.ok(!indexedRoutes.has(path), 'Legal page requires individual indexation approval: ' + path);

const allowed = new Set([...indexedRoutes, ...legalPages]);
const drafts = new Set(Object.keys(readJson('wordpressPreviewDrafts')));
for (const [path, file] of Object.entries(routeFiles)) {
  if (drafts.has(file.replace(/\.html$/, '')) || path === '/projekt-detail') {
    assert.ok(!allowed.has(path), 'Unreleased page included in production review: ' + path);
  }
}

const temporaryBuild = mkdtempSync(join(tmpdir(), 'creaid-release-review-'));
let createdOutput = false;
try {
  const processResult = spawnSync(process.execPath, [
    join(root, 'node_modules/@11ty/eleventy/cmd.cjs'), '--output=' + temporaryBuild,
  ], { cwd: root, env: {...process.env, CREAID_RELEASE_REVIEW: '1'}, stdio: 'inherit' });
  if (processResult.error) throw processResult.error;
  assert.equal(processResult.status, 0, 'Eleventy build failed');

  const html = new Map([...allowed].map(path => [
    path, readFileSync(join(temporaryBuild, routeFiles[path]), 'utf8'),
  ]));
  for (const [path, content] of html) {
    assert.ok(content.includes(robotsMeta), 'Index protection missing: ' + path);
    assert.ok(content.includes('rel="canonical" href="' + domain + path + '"'), 'Incorrect canonical: ' + path);
    for (const [, value] of content.matchAll(/<a\b[^>]*\shref=["']([^"']+)["']/gi)) {
      const url = new URL(value.replaceAll('&amp;', '&'), domain + path);
      if (url.origin !== domain || !Object.hasOwn(routeFiles, url.pathname) && !redirect(url)) continue;
      const target = redirect(url)?.split('?')[0] ?? url.pathname;
      assert.ok(allowed.has(target), path + ' links to an excluded page: ' + target);
    }
  }

  mkdirSync(output);
  createdOutput = true;
  const site = join(output, 'site');
  mkdirSync(site);
  // Keep available shared media while omitting preview demonstrations and draft-only covers.
  const visibleHtml = [...html.values()].join('\n');
  const draftCovers = readJson('postsIndex')
    .filter(post => drafts.has(post.slug) && post.image.startsWith('/assets/') && !visibleHtml.includes(post.image))
    .map(post => join(temporaryBuild, post.image.slice(1)));
  const demos = join(temporaryBuild, 'assets/demos');
  cpSync(join(temporaryBuild, 'assets'), join(site, 'assets'), {
    recursive: true,
    filter: source => source !== demos && !draftCovers.includes(source),
  });
  cpSync(join(temporaryBuild, 'robots.txt'), join(site, 'robots.txt'));
  for (const [path, content] of html) writeFileSync(join(site, routeFiles[path]), content);

  const aliases = apacheRoutes.aliases.filter(({to}) => allowed.has(to));
  const rewrites = apacheRoutes.paths.filter(({file}) => existsSync(join(site, file)));
  const rules = [
    '# Local review candidate. Keep index protection until production approval.',
    'Options -MultiViews -Indexes',
    'DirectoryIndex index.html',
    '<IfModule mod_rewrite.c>',
    'RewriteEngine On',
    ...aliases.flatMap(({from, to}) => [
      'RewriteCond %{THE_REQUEST} \\s/+' + from + '(?:[?\\s])',
      'RewriteRule ^' + from + '$ ' + to + ' [R=301,END,NE]',
    ]),
    ...rewrites.map(({from, file}) => 'RewriteRule ^' + from + '$ /' + file + ' [END]'),
    '</IfModule>',
    '<IfModule mod_headers.c>',
    'Header always set X-Robots-Tag "noindex, nofollow, noarchive"',
    'Header always set Cache-Control "no-store"',
    '</IfModule>',
    '',
  ];
  writeFileSync(join(site, '.htaccess'), rules.join('\n'));
  cpSync(sitemap, join(output, 'sitemap-kandidat-nach-freigabe.xml'));
  console.log('Prepared ' + allowed.size + ' pages and ' + aliases.length + ' redirects for local review: ' + site);
} catch (error) {
  if (createdOutput) rmSync(output, {recursive: true, force: true});
  throw error;
} finally {
  rmSync(temporaryBuild, {recursive: true, force: true});
}
