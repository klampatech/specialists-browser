/**
 * A static server for `webxash/dist` that PROXIES the API paths to
 * production.
 *
 * WHY IT NEEDS A PROXY
 * --------------------
 * The frontend fetches the server list from the RELATIVE path
 * `api/servers` (`webxash/src/services/ts-server-list.ts:73`). On
 * production that resolves to the same origin, which is the API. On a
 * local static server it resolves to
 * `http://127.0.0.1:8899/api/servers`, which does not exist — so the
 * page shows "SCANNING FOR SERVERS…" forever and PLAY has no target.
 *
 * A plain `python3 -m http.server` therefore cannot host a local build
 * that can actually play. This proxies `/api/*` (and anything else that
 * is not a file in `dist/`) to production, so a local build behaves
 * exactly like the deployed one.
 *
 * USAGE
 *   node tools/perf/serve-local-build.cjs [--port 8899] [--dir <dist>]
 *                                               [--proxy https://bulletballet.dev]
 */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf('--' + n);
  if (i === -1) return d;
  const v = argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
};

const PORT = Number(arg('port', 8899));
const DIR = path.resolve(
  arg('dir', '/home/kyle/Development/specialists-browser/webxash/dist'),
);
const PROXY = arg('proxy', 'https://bulletballet.dev');
const ASSET_BASE = arg(
  'asset-base',
  'https://assets.bulletballet.dev',
).replace(/\/+$/, '');

const TYPES = {
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
  '.pk3': 'application/octet-stream',
  '.zip': 'application/zip',
  '.txt': 'text/plain; charset=utf-8',
};

/**
 * The paths that are proxied to production rather than served from disk.
 *
 * `/api/*` is the fleet and the leaderboard. `/hl/*` is the 493 MB mod
 * archive, which lives on the asset host.
 *
 * WHY THE ARCHIVE HAS TO BE PROXIED TOO
 * ------------------------------------
 * The frontend fetches the archive from `VITE_ASSET_BASE`, which in
 * production is `https://assets.bulletballet.dev`. That host serves the
 * archive with **no `Access-Control-Allow-Origin` header** — verified:
 * a request with `Origin: http://127.0.0.1:8899` comes back 200 with
 * no CORS header at all. A browser on a cross-origin page therefore
 * blocks the fetch outright (`net::ERR_FAILED`), and the local build
 * hangs at "FETCHING GAME DATA" forever with the engine never starting.
 *
 * Proxying `/hl/*` through the local server makes the fetch same-origin
 * to the page, which is exactly what production's own origin does.
 */
const PROXY_PREFIXES = ['/api/', '/hl/'];

const server = https.createServer(
  {
    key: fs.readFileSync(arg('key', '/tmp/local-key.pem')),
    cert: fs.readFileSync(arg('cert', '/tmp/local-cert.pem')),
  },
  (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = decodeURIComponent(url.pathname);

  // A file in the build? Serve it.
  const rel = p === '/' ? 'index.html' : p.replace(/^\/+/, '');
  const file = path.resolve(DIR, rel);
  if (
    file.startsWith(DIR) &&
    fs.existsSync(file) &&
    fs.statSync(file).isFile()
  ) {
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'content-type': TYPES[ext] || 'application/octet-stream',
      'cache-control': 'no-store',
      // The engine's build needs these to use SharedArrayBuffer.
      'cross-origin-opener-policy': 'same-origin',
      'cross-origin-embedder-policy': 'credentialless',
      'cross-origin-resource-policy': 'cross-origin',
    });
    fs.createReadStream(file).pipe(res);
    return;
  }

  // Proxied paths: the API, and the mod archive.
  const isProxied =
    PROXY_PREFIXES.some((pre) => p.startsWith(pre)) ||
    !file.startsWith(DIR) ||
    !fs.existsSync(file);

  if (!isProxied) {
    res.writeHead(404);
    res.end('not found');
    return;
  }

  // The upstream is HTTPS, so the proxy request has to speak TLS.
  // `http.request` cannot do that; `https.request` can, and it is used
  // when the target's protocol is https.
  const upstream = PROXY_PREFIXES.some((pre) => p.startsWith(pre))
    ? PROXY + p + (url.search || '')
    : ASSET_BASE + p + (url.search || '');
  const target = new URL(upstream);
  const client = target.protocol === 'https:' ? https : http;
  const proxied = client.request(
    target,
    { method: req.method, headers: { ...req.headers, host: target.host } },
    (r) => {
      // Copy the upstream headers, then fix up the ones that must not be
      // passed through verbatim:
      //
      //   access-control-allow-origin — the upstream's own value applies
      //     to a different origin; the response is now same-origin to
      //     the page, and a stale value confuses the browser.
      //   content-encoding — the upstream may have compressed the body.
      //     Node's http client does NOT decompress it, so forwarding the
      //     header would make the browser try to inflate bytes that are
      //     already plain. The header is removed, and the body is
      //     forwarded as-is.
      const headers = { ...r.headers };
      headers['access-control-allow-origin'] = '*';
      delete headers['content-encoding'];
      delete headers['content-length'];
      headers['cross-origin-opener-policy'] = 'same-origin';
      headers['cross-origin-embedder-policy'] = 'credentialless';
      headers['cross-origin-resource-policy'] = 'cross-origin';
      res.writeHead(r.statusCode, headers);
      r.pipe(res);
    },
  );
  proxied.on('error', (e) => {
    res.writeHead(502, { 'content-type': 'text/plain' });
    res.end('proxy error: ' + e.message);
  });
  req.pipe(proxied);
  },
);

server.listen(PORT, '127.0.0.1', () => {
  console.log(`  serving ${DIR} on https://127.0.0.1:${PORT}/`);
  console.log(`  proxying /api/* to ${PROXY} and /hl/* to ${ASSET_BASE}`);
});
