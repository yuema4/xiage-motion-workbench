#!/usr/bin/env node
// Static server for the built studio (dist/).
//
// Why this exists: the workbench used to be served by the Vite dev server,
// which re-reads every source file on each request. When the project lived in
// an iCloud-synced folder, macOS could evict those files at any time and the
// reads failed with EAGAIN ("Unknown system error -11"), leaving a blank page.
// Serving the prebuilt dist removes that whole class of failure.
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

const args = process.argv.slice(2);
const readFlag = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const root = resolve(readFlag('--root', resolve(process.cwd(), 'dist')));
const port = Number(readFlag('--port', process.env.PORT ?? '3188'));
const host = readFlag('--host', '127.0.0.1');

const MIME = new Map(Object.entries({
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.wasm': 'application/wasm',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
}));

const resolveTarget = (urlPath) => {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const relative = normalize(decoded).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]+/, '');
  const target = resolve(join(root, relative));
  if (target !== root && !target.startsWith(root + sep)) return null;
  return target;
};

const send = (res, status, headers, body) => {
  res.writeHead(status, headers);
  if (body === undefined) res.end();
  else res.end(body);
};

const server = createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, { Allow: 'GET, HEAD' }, 'Method Not Allowed');
    return;
  }

  const requested = resolveTarget(req.url ?? '/');
  if (!requested) {
    send(res, 400, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Bad Request');
    return;
  }

  let target = requested;
  try {
    let info = await stat(target);
    if (info.isDirectory()) {
      target = join(target, 'index.html');
      info = await stat(target);
    }
    if (!info.isFile()) throw new Error('not a file');

    const ext = extname(target).toLowerCase();
    const immutable = target.includes(`${sep}assets${sep}`);
    const headers = {
      'Content-Type': MIME.get(ext) ?? 'application/octet-stream',
      'Content-Length': String(info.size),
      'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-store, must-revalidate',
      'Cross-Origin-Opener-Policy': 'same-origin',
    };

    if (req.method === 'HEAD') {
      send(res, 200, headers);
      return;
    }
    res.writeHead(200, headers);
    createReadStream(target).on('error', () => res.destroy()).pipe(res);
  } catch {
    send(res, 404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }, 'Not Found');
  }
});

server.on('error', (error) => {
  process.stderr.write(`[serve-dist] failed to start on ${host}:${port}: ${error.message}\n`);
  process.exit(1);
});

server.listen(port, host, () => {
  process.stdout.write(`[serve-dist] ${root} -> http://${host}:${port}\n`);
});
