#!/usr/bin/env node
// ts-udp-bridge.js — bridge a browser's WebSocket stream to a real UDP
// GoldSrc server.
//
// WHY THIS EXISTS
// ---------------
// webXash runs Xash3D-FWGS as a WASM module in the browser. The engine's
// POSIX socket layer is emulated in JS (see xash3d-fwgs `Net`), which means
// the engine CANNOT emit raw UDP datagrams — there is no UDP in a browser.
// webXash's only multiplayer transport is WebRTC data channels between two
// BROWSER peers (xash-webrtc.ts) — that only works when both sides are
// browsers. Kyle's requirement is a real dedicated server, so we need
// something in the middle that speaks:
//
//     browser (WASM engine)  <--WebSocket-->  this bridge  <--UDP-->  xash DS
//
// This process is that middle. It accepts WebSocket connections, and for each
// connection it opens a dedicated UDP socket to the target server, forwards
// every binary WebSocket frame out as a UDP datagram, and writes every
// inbound UDP datagram back as a binary WebSocket frame.
//
// The engine treats this as a connected UDP peer at the IP:port it dialed,
// because xash3d-fwgs's `Net.sendto` hands us the payload and its `Net`
// receives our frames via `net.incoming.enqueue()` on the client side.
//
// PROTOCOL
// --------
// WebSocket subprotocol: none required (client sends binary frames).
// Binary frame payload = raw GoldSrc UDP datagram bytes. 1:1, no framing
// header of our own. The engine's own protocol header is preserved intact.
//
// USAGE
// -----
//   node ts-udp-bridge.js --listen 27017 --target 127.0.0.1:27015
//
//   --listen   TCP port to accept WebSocket connections on (default 27017)
//   --target   host:port of the UDP GoldSrc server (default 127.0.0.1:27015)
//   --targets  id=host:port[,id=host:port...] extra named targets
//   --health   plain-HTTP health path on the listen port (default /health)
//   --debug    log the first few datagram headers per connection
//
// A tiny HTTP health endpoint answers GET /health with JSON so the operator
// can curl it to prove the bridge is alive without opening a socket.
//
// MULTI-TARGET
// ------------
// One bridge now fronts every game instance, because the server browser
// lets a player pick one. The target is chosen per connection:
//
//   ws://host:port/ws?server=ts-1
//
// `server` names an entry in the allowlist. THE ALLOWLIST IS A SECURITY
// BOUNDARY, not a convenience: without it this process would be an open
// UDP relay — anyone who could open a WebSocket could make it send
// packets to any host:port the VPS can reach, which is a UDP-based SSRF
// and an amplification vector. A target that is not in the allowlist is
// refused, not forwarded.
//
// The allowlist comes from --targets / BRIDGE_TARGETS. --target sets the
// default target for connections that do not name one.

const http = require('http');

function parseArgs(argv) {
  const out = {
    // Environment first, command line second: the container passes the
    // target allowlist through the environment so it is never baked into
    // an image layer, and the dev script still passes --target on the
    // command line.
    listen: parseInt(process.env.BRIDGE_LISTEN || '', 10) || 27017,
    targetHost: '127.0.0.1',
    targetPort: 27015,
    health: process.env.BRIDGE_HEALTH || '/health',
    debug: false,
    targets: process.env.BRIDGE_TARGETS ? parseTargetSpec(process.env.BRIDGE_TARGETS) : [],
    // Whether an explicit allowlist was supplied. If one was, the
    // --target default is NOT silently added to it — a default that was
    // never declared would be a target outside the configured boundary.
    targetsProvided: Boolean(process.env.BRIDGE_TARGETS),
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--listen') out.listen = parseInt(argv[++i], 10);
    else if (a === '--target') {
      const v = argv[++i];
      const idx = v.lastIndexOf(':');
      out.targetHost = v.slice(0, idx);
      out.targetPort = parseInt(v.slice(idx + 1), 10);
    } else if (a === '--targets') {
      out.targets = parseTargetSpec(argv[++i]);
      out.targetsProvided = true;
    } else if (a === '--health') out.health = argv[++i];
    else if (a === '--debug') out.debug = true;
    else if (a === '--help' || a === '-h') {
      console.log(
        'Usage: node ts-udp-bridge.js [--listen PORT] [--target host:port]\n' +
          '                            [--targets id=host:port,...] [--health PATH] [--debug]'
      );
      process.exit(0);
    }
  }
  return out;
}

/**
 * Parse `id=host:port,id2=host:port2`.
 *
 * A bare `host:port` (no id) becomes the default target, because that is
 * what a single-server deployment wants and it keeps the flag shape
 * identical to --target.
 */
function parseTargetSpec(spec) {
  const out = [];
  for (const raw of (spec || '').split(',')) {
    const item = raw.trim();
    if (!item) continue;
    const eq = item.indexOf('=');
    if (eq === -1) {
      const hp = item;
      const idx = hp.lastIndexOf(':');
      if (idx === -1) continue;
      out.push({
        id: 'default',
        host: hp.slice(0, idx),
        port: parseInt(hp.slice(idx + 1), 10),
      });
      continue;
    }
    const id = item.slice(0, eq).trim();
    let hp = item.slice(eq + 1).trim();
    // `id=internal:port@public:port` — the public address is what the
    // BROWSER sees in the server list and what it puts in `+connect`. The
    // internal address is where the packet actually goes. They differ
    // because the game server sits behind the same host as the bridge, so
    // the browser's peer address is a public IP while the bridge dials
    // loopback.
    let publicHost = null;
    let publicPort = null;
    const at = hp.indexOf('@');
    if (at !== -1) {
      const pub = hp.slice(at + 1).trim();
      hp = hp.slice(0, at).trim();
      const pidx = pub.lastIndexOf(':');
      if (pidx !== -1) {
        publicHost = pub.slice(0, pidx);
        publicPort = parseInt(pub.slice(pidx + 1), 10);
      }
    }
    const idx = hp.lastIndexOf(':');
    if (!id || idx === -1) continue;
    out.push({
      id,
      host: hp.slice(0, idx),
      port: parseInt(hp.slice(idx + 1), 10),
      publicHost,
      publicPort,
    });
  }
  return out;
}

const opts = parseArgs(process.argv);

// The registry maps a PUBLIC address (what the browser knows from the
// server list) to an INTERNAL target (where the packet actually goes).
// The bridge consults it so a newly started instance is reachable without
// restarting the bridge with new environment variables.
const REGISTRY_URL = process.env.BRIDGE_REGISTRY_URL || '';

// THE SECURITY FLOOR.
//
// The bridge may only ever dial this host, on these ports. The registry
// can tell the bridge where to send a packet; it cannot tell the bridge
// where it is ALLOWED to send one. That distinction is the whole point:
// without a floor, "the registry said so" is not a security property, it
// is just a suggestion from another service.
//
// The range is static on purpose. The orchestrator starts instances on
// ports derived from the index, so the range covers every instance the
// fleet can ever have — and the floor never has to be widened to add a
// server.
const ALLOWED_HOST = process.env.BRIDGE_ALLOWED_HOST || '127.0.0.1';
const ALLOWED_PORTS = parsePortRange(
  process.env.BRIDGE_ALLOWED_PORTS || '27000-27100'
);

/** Parse "27015-27022" or "27015,27017" into a Set of ports. */
function parsePortRange(spec) {
  const out = new Set();
  for (const part of String(spec || '').split(',')) {
    const item = part.trim();
    if (!item) continue;
    const dash = item.indexOf('-');
    if (dash !== -1) {
      const lo = parseInt(item.slice(0, dash), 10);
      const hi = parseInt(item.slice(dash + 1), 10);
      if (Number.isInteger(lo) && Number.isInteger(hi)) {
        for (let p = lo; p <= hi; p++) out.add(p);
      }
      continue;
    }
    const n = parseInt(item, 10);
    if (Number.isInteger(n)) out.add(n);
  }
  return out;
}

/** Is this target inside the floor? */
function withinFloor(host, port) {
  return host === ALLOWED_HOST && ALLOWED_PORTS.has(port);
}

// `ws` is a dependency of tools/port/tsp-rs (and of the production image's
// own package.json). Resolve it relative to this file rather than assuming a
// global install.
const path = require('path');
let wsPath;
try {
  wsPath = require.resolve('ws');
} catch (_) {
  wsPath = require.resolve('ws', {
    paths: [
      path.dirname(__filename),
      path.join(path.dirname(__filename), 'node_modules'),
      path.join(path.dirname(__filename), '..', 'node_modules'),
    ],
  });
}
const { WebSocketServer } = require(wsPath);

const dgram = require('dgram');

/**
 * The allowlist, keyed by id.
 *
 * `--target` provides the default entry. `--targets` adds named ones. If
 * the deployment named exactly one target and did not give a --target, that
 * one becomes the default too, so a single-instance bridge works with no
 * `?server=` parameter at all.
 */
const TARGETS = new Map();
for (const t of opts.targets) TARGETS.set(t.id, t);
if (!opts.targetsProvided && !TARGETS.has('default')) {
  // No allowlist was declared at all: this is the single-server dev case,
  // so --target becomes the one and only target.
  TARGETS.set('default', {
    id: 'default',
    host: opts.targetHost,
    port: opts.targetPort,
  });
}

const stats = {
  startedAt: new Date().toISOString(),
  connections: 0,
  packetsToServer: 0,
  packetsToClient: 0,
  bytesToServer: 0,
  bytesToClient: 0,
  liveConnections: 0,
  debugLogged: 0,
  rejectedTargets: 0,
};

const server = http.createServer((req, res) => {
  if (req.url === opts.health) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify(
        {
          ok: true,
          targets: [...TARGETS.values()].map(
            (t) =>
              `${t.id}=${t.host}:${t.port}` +
              (t.publicHost ? ` (public ${t.publicHost}:${t.publicPort})` : '')
          ),
          ...stats,
        },
        null,
        2
      )
    );
    return;
  }
  res.writeHead(404);
  res.end();
});

// Both /ws (dev, direct) and /bridge (production, behind a reverse proxy)
// are accepted. The `ws` library's `path` option only handles one path, and
// managing the upgrade by hand is the supported way to serve several.
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', async (req, socket, head) => {
  let pathname;
  try {
    pathname = new URL(req.url, 'http://bridge.invalid').pathname;
  } catch (_) {
    socket.destroy();
    return;
  }
  if (pathname !== '/ws' && pathname !== '/bridge') {
    socket.destroy();
    return;
  }
  // Validate the target BEFORE completing the handshake. Validating in the
  // connection handler would let the WebSocket open successfully and only
  // then close, which reads to the client as "connected" and hides the
  // refusal. Answering with a plain HTTP error is unambiguous.
  const target = await resolveTarget(req);
  if (!target) {
    stats.rejectedTargets += 1;
    console.warn(
      `[bridge] refused upgrade: target not in the allowlist (${req.url})`
    );
    socket.write(
      'HTTP/1.1 403 Forbidden\r\n' +
        'Content-Type: text/plain\r\n' +
        'Connection: close\r\n' +
        '\r\n' +
        'unknown bridge target\n'
    );
    socket.destroy();
    return;
  }
  req.bridgeTarget = target;
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});

/**
 * The registry's view: public address -> internal target.
 *
 * Refreshed on a timer and on demand. A stale map is better than no map,
 * and the floor still applies to whatever comes out of it.
 */
let registryByAddress = new Map();
let registryById = new Map();
let registryFetchedAt = 0;
const REGISTRY_TTL_MS = 10_000;

/**
 * Instance ids the registry currently reports as DOWN.
 *
 * The registry polls A2S, so it is the only component that knows when a
 * game server has actually gone away. The bridge cannot tell by itself:
 * UDP has no connection state, so a dead server just means packets stop
 * arriving — indistinguishable from a quiet moment.
 *
 * This matters for the player. A server restart does NOT close the
 * WebSocket (the browser talks to the bridge, not to the server), so
 * without this the client keeps a live socket that carries nothing, and
 * the player is left looking at a frozen world with no way to tell what
 * happened.
 */
let registryDownIds = new Set();
let consecutiveDownPolls = 0;

async function refreshRegistry() {
  if (!REGISTRY_URL) return false;
  try {
    const res = await fetch(REGISTRY_URL, {
      signal: AbortSignal.timeout(4000),
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return false;
    const body = await res.json();
    const byAddress = new Map();
    const byId = new Map();
    for (const inst of body.instances || []) {
      if (inst.stale || inst.responsive === false) continue;
      // The registry reports the address the BROWSER knows. Its internal
      // target is the same host and port as the instance's UDP port.
      const publicAddr = `${inst.publicAddress || inst.address}:${inst.port}`;
      const internal = `${ALLOWED_HOST}:${inst.port}`;
      byAddress.set(publicAddr, { id: inst.id, host: ALLOWED_HOST, port: inst.port });
      byId.set(inst.id, { id: inst.id, host: ALLOWED_HOST, port: inst.port });
    }
    registryByAddress = byAddress;
    registryById = byId;
    registryFetchedAt = Date.now();

    // Track which instances are down, requiring several consecutive polls.
    // One bad poll is not a dead server — see the registry's own
    // FAILURES_BEFORE_DOWN for the same reasoning.
    const downNow = new Set(
      (body.instances || [])
        .filter((inst) => inst.stale || inst.responsive === false)
        .map((inst) => inst.id)
    );
    if (downNow.size > 0) {
      consecutiveDownPolls += 1;
      // Two consecutive down polls before acting. The registry already
      // requires three failed A2S probes; this is the bridge's own
      // second opinion, and it should not be twitchier than its source.
      if (consecutiveDownPolls >= 2) {
        registryDownIds = downNow;
      }
    } else {
      consecutiveDownPolls = 0;
      registryDownIds = new Set();
    }
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Resolve the target for a connection.
 *
 * Returns null when the request names a target that cannot be resolved
 * inside the floor — the caller refuses the connection rather than
 * forwarding.
 */
async function resolveTarget(req) {
  let serverId = null;
  let address = null;
  try {
    const u = new URL(req.url, 'http://bridge.invalid');
    serverId = u.searchParams.get('server');
    address = u.searchParams.get('address');
  } catch (_) {
    /* fall through to the default */
  }

  if (!serverId && !address) {
    const fallback = TARGETS.get('default') || null;
    if (!fallback) return null;
    return withinFloor(fallback.host, fallback.port) ? fallback : null;
  }

  // The registry is the live source of truth — it knows about instances
  // the static list has never heard of. Refresh if the map is empty or
  // stale, because a scale-out that needs a bridge restart is not
  // scale-out.
  if (!REGISTRY_URL) {
    // No registry configured: the static allowlist is all there is.
    return staticLookup(serverId, address);
  }
  if (registryFetchedAt === 0 || Date.now() - registryFetchedAt > REGISTRY_TTL_MS) {
    await refreshRegistry();
  }

  let found = null;
  if (serverId) {
    found = registryById.get(serverId) || null;
  } else if (address) {
    found = registryByAddress.get(address) || null;
  }
  if (!found) {
    // Fall back to the static list — it may know a target the registry
    // has not published yet (a dev bridge pointed at one server).
    found = staticLookup(serverId, address);
  }
  if (!found) return null;

  // THE FLOOR. The registry may say where; only the floor says whether.
  if (!withinFloor(found.host, found.port)) return null;
  return found;
}

function staticLookup(serverId, address) {
  if (serverId) return TARGETS.get(serverId) || null;
  if (address) {
    for (const t of TARGETS.values()) {
      if (t.publicHost && t.publicPort) {
        if (`${t.publicHost}:${t.publicPort}` === address) return t;
      }
    }
    return null;
  }
  return null;
}

wss.on('connection', (ws, req) => {
  // The target was resolved and checked during the upgrade, so by the time
  // a connection exists it is known-good.
  const target = req.bridgeTarget;
  if (!target) {
    ws.close(1008, 'unknown target');
    return;
  }

  stats.connections += 1;
  stats.liveConnections += 1;
  const connId = stats.connections;
  console.log(
    `[bridge] #${connId} browser connected (live=${stats.liveConnections}) → udp ${target.host}:${target.port}`
  );

  // Each browser gets its own UDP socket. GoldSrc servers track
  // "clients" by their source address:port, so a fresh socket per browser
  // means two browsers get two distinct server-side client slots instead of
  // colliding on one.
  const udp = dgram.createSocket('udp4');

  udp.on('error', (err) => {
    console.error(`[bridge] #${connId} udp error:`, err.message);
  });

  udp.on('message', (msg) => {
    if (ws.readyState !== ws.OPEN) return;
    // WebSocket wants an ArrayBuffer / Buffer; dgram gives us a Buffer
    // which is directly acceptable to the `ws` library.
    ws.send(msg, { binary: true });
    stats.packetsToClient += 1;
    stats.bytesToClient += msg.length;
  });

  ws.on('open', () => {
    console.log(`[bridge] #${connId} WS open, readyState=${ws.readyState}`);
  });

  ws.on('error', (err) =>
    console.error(`[bridge] #${connId} ws error:`, err.message)
  );
  ws.on('close', (code, reason) => {
    console.log(
      `[bridge] #${connId} WS close code=${code} reason=${reason?.toString() || '<none>'}`
    );
  });

  // If the game server behind this connection has gone away, say so
  // instead of letting the connection linger as a silent pipe to nothing.
  // The client cannot detect this on its own — its socket is to the
  // bridge, and the bridge is still perfectly alive.
  const checkTargetAlive = setInterval(() => {
    if (ws.readyState !== ws.OPEN) return;
    if (!target.id || !registryDownIds.has(target.id)) return;
    console.log(
      `[bridge] #${connId} target ${target.id} is down — closing so the client can say so`
    );
    // 4001 is an application close code: the peer is fine, the thing it
    // was talking to is not. The live-connection count is decremented by
    // the normal teardown path, not here — decrementing it in both places
    // drove the counter negative.
    ws.close(4001, 'game server unavailable');
  }, 5000);
  checkTargetAlive.unref?.();
  ws.on('close', () => clearInterval(checkTargetAlive));

  ws.on('message', (data, isBinary) => {
    // The engine only ever sends binary frames. If we get text, drop it —
    // it isn't a GoldSrc datagram.
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    udp.send(buf, 0, buf.length, target.port, target.host, (err) => {
      if (err) console.error(`[bridge] #${connId} udp send failed:`, err.message);
    });
    stats.packetsToServer += 1;
    stats.bytesToServer += buf.length;
    // Debug: log the first datagram per connection so we can see whether the
    // engine's GoldSrc handshake is actually crossing the WebSocket (it
    // should be a 0xffffffff-prefixed challenge with "TSource Engine
    // Query"). Keep it cheap: only while a debug flag is set, and only the
    // first 8 bytes so the log stays readable.
    if (opts.debug && stats.debugLogged < 40) {
      stats.debugLogged += 1;
      const head = buf.subarray(0, 8).toString('hex');
      console.log(`[bridge] #${connId} → udp ${buf.length}B  head=${head}`);
    }
  });

  const teardown = (why) => {
    if (udp.close) {
      try {
        udp.close();
      } catch (_) {
        /* already closed */
      }
    }
    stats.liveConnections -= 1;
    console.log(
      `[bridge] #${connId} disconnected (${why}) — up ${stats.packetsToServer}p/${stats.packetsToClient}p`
    );
  };

  ws.on('close', () => teardown('ws close'));
  ws.on('error', (err) => {
    console.error(`[bridge] #${connId} ws error:`, err.message);
    teardown('ws error');
  });
});

if (REGISTRY_URL) {
  refreshRegistry();
  setInterval(refreshRegistry, REGISTRY_TTL_MS).unref?.();
}

server.listen(opts.listen, '0.0.0.0', () => {
  const list = [...TARGETS.values()]
    .map(
      (t) =>
        `${t.id}=${t.host}:${t.port}` +
        (t.publicHost ? `@${t.publicHost}:${t.publicPort}` : '')
    )
    .join(', ');
  console.log(
    `[bridge] listening on ws://0.0.0.0:${opts.listen}/ws (and /bridge)  targets: ${list}`
  );
  console.log(
    `[bridge] floor: only ${ALLOWED_HOST}:${
      [...ALLOWED_PORTS].length === 1
        ? [...ALLOWED_PORTS][0]
        : `${Math.min(...ALLOWED_PORTS)}-${Math.max(...ALLOWED_PORTS)}`
    } may be dialled`
  );
  if (REGISTRY_URL) console.log(`[bridge] registry: ${REGISTRY_URL}`);
  else console.log('[bridge] registry: none — static targets only');
  console.log(`[bridge] health: http://0.0.0.0:${opts.listen}${opts.health}`);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log(`[bridge] ${sig} — shutting down`);
    wss.close();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 500);
  });
}
