import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { redirect, routeFiles } from './routes.mjs';

const dist = fileURLToPath(new URL('../dist', import.meta.url));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};
const port = Number(process.env.CREAID_PREVIEW_PORT || 8080);

createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }

  const url = new URL(req.url, 'http://127.0.0.1');
  const destination = redirect(url);
  if (destination) {
    res.writeHead(301, { Location: destination }).end();
    return;
  }
  const route = Object.hasOwn(routeFiles, url.pathname) ? routeFiles[url.pathname] : null;
  const staticFile = /^\/(?:assets\/[A-Za-z0-9/_.-]+|robots\.txt)$/.test(url.pathname) ? url.pathname.slice(1) : null;
  if (!route && !staticFile) {
    res.writeHead(404).end('Seite nicht gefunden.');
    return;
  }

  const file = resolve(dist, route || staticFile);
  if (!file.startsWith(dist + sep)) {
    res.writeHead(404).end('Seite nicht gefunden.');
    return;
  }
  try {
    const stats = await stat(file);
    if (!stats.isFile()) {
      res.writeHead(404).end('Seite nicht gefunden.');
      return;
    }
    const headers = {
      'Content-Type': types[extname(file)] || 'application/octet-stream',
      'Content-Length': stats.size,
      'X-Robots-Tag': 'noindex, nofollow'
    };
    res.writeHead(200, headers);
    if (req.method === 'HEAD') res.end();
    else createReadStream(file).on('error', () => res.destroy()).pipe(res);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
      res.writeHead(404).end('Seite nicht gefunden.');
    } else {
      res.writeHead(500).end('Vorschau konnte die Datei nicht lesen.');
    }
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`CreAid-Media Vorschau: http://127.0.0.1:${port}/`);
});
