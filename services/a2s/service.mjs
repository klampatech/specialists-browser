/**
 * a2s-service — the deployable server browser backend.
 *
 * WHY THIS IS NOT THE VITE PLUGIN ANYMORE
 * ---------------------------------------
 * vite-a2s-plugin.mjs exists because a browser cannot emit UDP, so the query
 * has to happen server-side, and a Vite plugin was the only server-side thing
 * running in dev. In production the frontend is a static bundle served by
 * Caddy — there is no Vite process — so the endpoint would simply not exist.
 *
 * This service is that endpoint, standing on its own. It reuses queryServer()
 * from the plugin rather than reimplementing A2S, because the GoldSrc
 * handshake rules are the kind of thing that is easy to get subtly wrong and
 * impossible to notice until a server browser silently shows one map.
 *
 * WHY THE RESULTS ARE POLLED IN THE BACKGROUND
 * --------------------------------------------
 * Each probe is a UDP round trip with a ~1.2s timeout, against N instances.
 * Doing that inside the request handler means the slowest or dead instance
 * sets the latency of every page load, and a server that stops answering
 * makes the list empty rather than stale.
 *
 * So: poll on an interval, serve the last good snapshot, and mark entries
 * stale instead of dropping them. A server that dies should fade out of the
 * browser over one poll interval, not vanish on a single lost packet.
 *
 * CONFIG (env)
 *   A2S_BIND        host:port to listen on          default 127.0.0.1:8081
 *   A2S_PORTS       comma-separated UDP ports       default 27015
 *   A2S_HOST        address to probe                default 127.0.0.1
 *   A2S_PUBLIC      address handed to the browser   default = A2S_HOST
 *   A2S_POLL_MS     poll interval                   default 10000
 *   A2S_STALE_MS    drop entries unrefreshed for    default 45000
 *
 * The service binds 127.0.0.1 by default and is expected to sit behind Caddy.
 * Binding it publicly would let anyone enumerate the fleet for free.
 */

import http from 'node:http';
import { queryServer } from '../../webxash/vite-a2s-plugin.mjs';

const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);

const BIND = process.env.A2S_BIND || '127.0.0.1:8081';
const HOST = process.env.A2S_HOST || '127.0.0.1';
const PUBLIC = process.env.A2S_PUBLIC || HOST;
const POLL_MS = num(process.env.A2S_POLL_MS, 10_000);
const STALE_MS = num(process.env.A2S_STALE_MS, 45_000);
const PORTS = (process.env.A2S_PORTS || '27015')
  .split(',')
  .map((p) => parseInt(p.trim(), 10))
  .filter((p) => Number.isInteger(p) && p > 0 && p < 65536);

/** id -> last successful probe. Entries are kept until they go stale. */
const registry = new Map();
let lastPollAt = 0;
let pollInFlight = false;

async function poll() {
  if (pollInFlight) return;
  pollInFlight = true;
  try {
    await Promise.all(
      PORTS.map(async (port) => {
        const id = `ts-${port - 27015}`;
        const result = await queryServer(HOST, port, id, PUBLIC).catch(() => null);
        if (result) {
          registry.set(id, { ...result, seenAt: Date.now(), stale: false });
        } else {
          const prev = registry.get(id);
          // Keep the last good row so a single dropped packet does not make a
          // live server disappear from the list.
          if (prev) registry.set(id, { ...prev, stale: true });
        }
      }),
    );
    const cutoff = Date.now() - STALE_MS;
    for (const [id, row] of registry) {
      if (row.seenAt < cutoff) registry.delete(id);
    }
    lastPollAt = Date.now();
  } finally {
    pollInFlight = false;
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/healthz') {
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        ok: true,
        ports: PORTS,
        lastPollAt,
        known: registry.size,
      }),
    );
    return;
  }

  if (url.pathname === '/api/servers') {
    // Sort by id so the ordering is stable between polls; otherwise rows
    // shuffle on every refresh as instances answer at slightly different
    // times, and the list looks like it is churning.
    const servers = [...registry.values()]
      .filter((s) => !s.stale)
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    const stale = [...registry.values()]
      .filter((s) => s.stale)
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ servers, stale }));
    return;
  }

  res.statusCode = 404;
  res.end('not found');
});

const [bindHost, bindPort] = BIND.split(':');
server.listen(Number(bindPort), bindHost, () => {
  console.log(`a2s-service listening on ${BIND}`);
  console.log(`probing ${PORTS.length} instance(s) at ${HOST}:${PORTS.join(',')}`);
  console.log(`browser will be told to connect to ${PUBLIC}`);
  poll();
});

const timer = setInterval(poll, POLL_MS);
timer.unref?.();

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    clearInterval(timer);
    server.close(() => process.exit(0));
  });
}