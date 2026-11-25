// CreAid Performance Engine 1.3: opt-in, isolated static-site packaging.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, readdirSync, lstatSync, realpathSync } from 'node:fs';
import { join, resolve, dirname, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { prepareCandidate } from './prepare-candidate.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const immutablePattern = '\\.sha256-[0-9a-f]{64}\\.(css|js|mjs|webp|avif|png|jpg|jpeg|gif|svg|woff2|woff|ico)$';
const okStatus = 'expr=%{REQUEST_STATUS} == 200 || %{REQUEST_STATUS} == 206 || %{REQUEST_STATUS} == 304';
const begin = '# BEGIN CREAID PERFORMANCE ENGINE';
const end = '# END CREAID PERFORMANCE ENGINE';

export function apachePolicy(profile = 'preview') {
  if (!['preview', 'production'].includes(profile)) throw Error('Unknown profile');
  const production = profile === 'production';
  return [
    begin, '<IfModule mod_headers.c>',
    'Header onsuccess unset Cache-Control',
    'Header always set Cache-Control "no-store, no-cache, must-revalidate, max-age=0"',
    ...(production ? [
      '<FilesMatch "\\.html?$">',
      'Header always set Cache-Control "no-cache, must-revalidate" "' + okStatus + '"',
      '</FilesMatch>',
      '<FilesMatch "\\.(css|js|mjs|webp|avif|png|jpg|jpeg|gif|svg|woff2|woff|ico)$">',
      'Header always set Cache-Control "no-cache, must-revalidate" "' + okStatus + '"',
      '</FilesMatch>',
      '<FilesMatch "' + immutablePattern + '">',
      'Header always set Cache-Control "public, max-age=31536000, immutable" "' + okStatus + '"',
      '</FilesMatch>'
    ] : []),
    '</IfModule>',
    '<IfModule mod_filter.c>',
    '<IfModule mod_brotli.c>',
    '<IfModule mod_deflate.c>',
    'AddOutputFilterByType BROTLI_COMPRESS;DEFLATE text/html text/plain text/css text/javascript application/javascript application/json application/xml text/xml image/svg+xml',
    '</IfModule>',
    '<IfModule !mod_deflate.c>',
    'AddOutputFilterByType BROTLI_COMPRESS text/html text/plain text/css text/javascript application/javascript application/json application/xml text/xml image/svg+xml',
    '</IfModule>',
    '</IfModule>',
    '<IfModule !mod_brotli.c>',
    '<IfModule mod_deflate.c>',
    'AddOutputFilterByType DEFLATE text/html text/plain text/css text/javascript application/javascript application/json application/xml text/xml image/svg+xml',
    '</IfModule>',
    '</IfModule>',
    '</IfModule>', end, ''
  ].join('\n');
}

function walk(dir) {
  const result = [];
  for (const entry of readdirSync(dir, {withFileTypes:true})) {
    const p = join(dir, entry.name);
    if (entry.isSymbolicLink()) throw Error('Symlink not allowed: ' + p);
    if (entry.isDirectory()) result.push(...walk(p));
    else if (entry.isFile()) result.push(p);
    else throw Error('Unsupported file type: ' + p);
  }
  return result.sort();
}
function contains(parent, child) {
  const r = relative(parent, child);
  return r === '' || (r !== '..' && !r.startsWith('..' + sep));
}
function prospectiveRealpath(p) {
  if (existsSync(p)) return realpathSync(p);
  const d = dirname(p);
  if (d === p) throw Error('No existing ancestor');
  return join(prospectiveRealpath(d), relative(d,p));
}
function inspect(source, profile) {
  const list = walk(source);
  for (const file of list) {
    const name = file.split(sep).pop();
    if (name === '.htaccess') {
      const rules = readFileSync(file,'utf8');
      if (/^\s*(?!#).*?\b(?:cache-control|expiresactive|expiresbytype|expiresdefault|surrogate-control|cdn-cache-control)\b/im.test(rules))
        throw Error('Existing cache rules require manual reconciliation: ' + file);
      if (profile === 'production' && /noindex|noarchive|nofollow|AuthType|Require\s+valid-user/i.test(rules))
        throw Error('Protected/preview configuration: ' + file);
    }
    if (profile === 'production' && /\.(?:php[0-9]*|phtml|phar|cgi|fcgi|pl|py|asp|aspx|jsp|sh|exe)$/i.test(name))
      throw Error('Executable file in static production input: ' + file);
    if (profile === 'production' && /\.(?:html?|xml)$/i.test(name)) {
      const html = readFileSync(file,'utf8');
      if (/<meta\b[^>]*\b(?:noindex|noarchive|nofollow)\b[^>]*>/i.test(html))
        throw Error('Preview/non-indexable page in production input: ' + file);
    }
    if (profile === 'production' && name === 'robots.txt' && /^\s*Disallow:\s*\/\s*(?:#.*)?$/im.test(readFileSync(file,'utf8')))
      throw Error('Blocked robots.txt in production input');
    if (profile === 'production' && /(?:^|[\\/])(?:drafts?|preview|vorschau)(?:[\\/]|\.html?$)/i.test(relative(source,file)))
      throw Error('Preview/draft path in production input: ' + file);
  }
  return list;
}
export function verifyCandidate(output, report) {
  const site = join(output,'site');
  const rows = report.manifest;
  for (const row of rows) {
    const p = resolve(site,'.'+row.fingerprinted);
    if (!contains(join(site,'assets'),p) || !existsSync(p) || lstatSync(p).isSymbolicLink())
      throw Error('Missing or unsafe fingerprint: '+row.fingerprinted);
    const bytes = readFileSync(p);
    if (sha(bytes) !== row.sha256 || bytes.length !== row.bytes || !row.fingerprinted.includes('.sha256-'+row.sha256+'.'))
      throw Error('Fingerprint mismatch: '+row.fingerprinted);
    if (sha(readFileSync(resolve(site,'.'+row.original))) !== row.sha256)
      throw Error('Original mismatch: '+row.original);
  }
  // Validate every hashed asset, including ones already in the source.
  for (const p of walk(site)) {
    const m = p.match(/\.sha256-([0-9a-f]{64})\.[^./\\]+$/);
    if (m && sha(readFileSync(p)) !== m[1]) throw Error('Corrupted hashed file: '+p);
  }
  return rows.length;
}
export function buildPerformance({source, output, profile='preview', approved=false}) {
  if (!['preview','production'].includes(profile)) throw Error('Unknown profile');
  if (profile === 'production' && approved !== true) throw Error('Production requires explicit approval and a public-only final build');
  source = resolve(source); output = resolve(output);
  if (lstatSync(source).isSymbolicLink() || contains(realpathSync(source),prospectiveRealpath(output)) || contains(prospectiveRealpath(output),realpathSync(source)))
    throw Error('Output must be isolated from input');
  inspect(source,profile);
  const report = prepareCandidate({source,output});
  const verified = verifyCandidate(output,report);
  const rules = apachePolicy(profile);
  const target = join(output,'site','.htaccess');
  const existing = existsSync(target) ? readFileSync(target,'utf8') : '';
  writeFileSync(target,existing+(existing&&!existing.endsWith('\n')?'\n':'')+rules);
  writeFileSync(join(output,'cache-policy.active.conf'),rules);
  const result = {...report,engineVersion:'1.3.0',profile,verifiedAssets:verified,
    stagedBytes:walk(join(output,'site')).reduce((n,p)=>n+lstatSync(p).size,0),
    deployment:'not performed', limitations:[
      'Only static directly referenced assets fingerprinted; originals retained for runtime dependencies.',
      'Compression estimates are not live HTTP measurements. Apache mod_brotli/mod_deflate/mod_headers/mod_filter must be verified.',
      'Packaging does not transform CSS/JS or generate image variants; use the separate opt-in stages before fingerprinting. No automatic deployment.',
      'Production approval and public-only source review are separate; heuristic preview checks are not a confidentiality audit.',
      'Run only after final path rewriting; never transform hashed files after packaging.'
    ]};
  writeFileSync(join(output,'report.json'),JSON.stringify(result,null,2)+'\n');
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [source,output,profile='preview',approval,...extra] = process.argv.slice(2);
  if (!source || !output || extra.length || (approval && approval !== '--approve-public-build'))
    throw Error('Usage: node scripts/performance/engine.mjs <final-build> <new-output> [preview|production] [--approve-public-build]');
  const result = buildPerformance({source,output,profile,approved:approval==='--approve-public-build'});
  console.log(JSON.stringify({profile:result.profile,pages:result.pages,verifiedAssets:result.verifiedAssets,stagedBytes:result.stagedBytes,deployment:result.deployment},null,2));
}
