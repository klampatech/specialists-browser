#!/usr/bin/env node
/**
 * local-harness.cjs — serve a LOCAL bundle against the CI rig.
 *
 * WHY THIS EXISTS
 * ---------------
 * The port's client is compiled to WASM, so a change to it only shows up
 * in a browser after the WASM is rebuilt and the bundle is rebuilt around
 * it. The rig at ci.bulletballet.dev serves the PRODUCTION bundle from
 * the production host, and the production bundle must never be swapped
 * for a local build.
 *
 * So: serve the local bundle from here, and proxy the two control-plane
 * routes to the rig over an SSH tunnel. The page sees ONE origin, so the
 * bridge stays same-origin (a page on https:// cannot open ws://, and a
 * cross-origin WebSocket cannot carry the page's cross-origin-isolation
 * context), and the game server it reaches is the rig's.
 *
 *   /            the local bundle (webxash/dist)
 *   /api/servers the rig's registry    (tunnel 127.0.0.1:18082)
 *   /bridge      the rig's bridge (WS)  (tunnel 127.0.0.1:17018)
 *
 * The tunnel:
 *   ssh -N -L 18082:127.0.0.1:8082 -L 17018:127.0.0.1:27018 bb-prod
 *
 * USAGE: node tools/spectator/local-harness.cjs [port] [distDir]
 */

const http = require('node:http');
const https = require('node:https');
const net = require('node:net');
const fs = require('node:fs');
const path = require('node:path');

const PORT = Number(process.argv[2] || 5175);
const DIST = path.resolve(process.argv[3] || 'webxash/dist');
const REGISTRY = 'http://127.0.0.1:18082';
const BRIDGE_HOST = '127.0.0.1';
const BRIDGE_PORT = 17018;
const RELAY_PORT = 5180;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.zip': 'application/zip',
  '.txt': 'text/plain; charset=utf-8',
  '.cfg': 'text/plain; charset=utf-8',
};

function isolationHeaders(res) {
  // The engine is a threaded WASM build: it needs SharedArrayBuffer, which
  // the browser only grants to a cross-origin isolated document.
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  // The game archive lives on Cloudflare R2 behind assets.bulletballet.dev,
  // which sends CORS headers for the production origin only — a local
  // origin is refused. The bundle is built with a RELATIVE asset base, so
  // the request arrives here, same-origin, and is proxied onward.
  if (url.startsWith('/hl/')) {
    const proxied = https.request(
      'https://assets.bulletballet.dev' + req.url,
      { method: req.method, headers: { host: 'assets.bulletballet.dev' } },
      (up) => {
        isolationHeaders(res);
        res.writeHead(up.statusCode || 502, {
          'content-type': up.headers['content-type'] || 'application/octet-stream',
          'content-length': up.headers['content-length'],
          'cache-control': 'public, max-age=3600',
        });
        up.pipe(res);
      }
    );
    proxied.on('error', (e) => {
      res.writeHead(502, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: String(e) }));
    });
    req.pipe(proxied);
    return;
  }

  if (url === '/api/servers' || url.startsWith('/api/')) {
    const proxied = http.request(
      REGISTRY + req.url,
      { method: req.method, headers: { host: 'rig-registry' } },
      (up) => {
        isolationHeaders(res);
        res.writeHead(up.statusCode || 502, up.headers);
        up.pipe(res);
      }
    );
    proxied.on('error', (e) => {
      res.writeHead(502, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: String(e) }));
    });
    req.pipe(proxied);
    return;
  }

  let rel = decodeURIComponent(url);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(DIST, rel);
  if (!file.startsWith(DIST)) {
    res.writeHead(403).end('no');
    return;
  }
  fs.readFile(file, (err, body) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/plain' }).end('not found: ' + rel);
      return;
    }
    isolationHeaders(res);
    res.writeHead(200, {
      'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(body);
  });
});

// The bridge is a WebSocket. The upgrade is proxied verbatim: the
// handshake goes to the bridge and the bridge's 101 comes back, so the
// bridge sees exactly what Caddy would have shown it.
//
// `/camera` is the live-camera frame stream, which lives on the capture
// host. In production Caddy proxies it the same way; here it is a second
// tunnel to the relay.
server.on('upgrade', (req, socket, head) => {
  const url = req.url.split('?')[0];
  const camera = url.startsWith('/camera');
  const port = camera ? RELAY_PORT : BRIDGE_PORT;
  const up = net.connect(port, BRIDGE_HOST, () => {
    const lines = [`GET ${req.url} HTTP/1.1`];
    for (const [k, v] of Object.entries(req.headers)) {
      if (k.toLowerCase() === 'host') continue;
      lines.push(`${k}: ${v}`);
    }
    lines.push(`Host: ${BRIDGE_HOST}:${port}`);
    lines.push('', '');
    up.write(lines.join('\r\n'));
    if (head && head.length) up.write(head);
    up.pipe(socket);
    socket.pipe(up);
  });
  up.on('error', () => socket.destroy());
  socket.on('error', () => up.destroy());
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`local-harness: http://127.0.0.1:${PORT}/  (bundle: ${DIST})`);
  console.log(`  /api/servers -> ${REGISTRY}`);
  console.log(`  /bridge      -> ws://${BRIDGE_HOST}:${BRIDGE_PORT}`);
});
