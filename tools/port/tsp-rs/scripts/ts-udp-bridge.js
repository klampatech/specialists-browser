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
// browsers. Kyle's requirement is a real dedicated server on the LAN, so we
// need something in the middle that speaks:
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
//   --health   plain-HTTP health path on the listen port (default /health)
//
// A tiny HTTP health endpoint answers GET /health with JSON so Kyle can
// curl it to prove the bridge is alive without opening a socket.

const http = require('http');

function parseArgs(argv) {
  const out = {
    listen: 27017,
    targetHost: '127.0.0.1',
    targetPort: 27015,
    health: '/health',
    debug: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--listen') out.listen = parseInt(argv[++i], 10);
    else if (a === '--target') {
      const v = argv[++i];
      const idx = v.lastIndexOf(':');
      out.targetHost = v.slice(0, idx);
      out.targetPort = parseInt(v.slice(idx + 1), 10);
    } else if (a === '--health') out.health = argv[++i];
    else if (a === '--debug') out.debug = true;
    else if (a === '--help' || a === '-h') {
      console.log(
        'Usage: node ts-udp-bridge.js [--listen PORT] [--target host:port] [--health PATH]'
      );
      process.exit(0);
    }
  }
  return out;
}

const opts = parseArgs(process.argv);

// `ws` is a dependency of the signaling server that already lives in the
// webXash subtree, so resolve it relative to this file's location rather
// than assuming a global install.
const path = require('path');
const wsPath = require.resolve('ws', {
  paths: [
    path.dirname(__filename),
    path.join(path.dirname(__filename), 'node_modules'),
  ],
});
const { WebSocketServer } = require(wsPath);

const dgram = require('dgram');

const stats = {
  startedAt: new Date().toISOString(),
  connections: 0,
  packetsToServer: 0,
  packetsToClient: 0,
  bytesToServer: 0,
  bytesToClient: 0,
  liveConnections: 0,
  debugLogged: 0,
};

const server = http.createServer((req, res) => {
  if (req.url === opts.health) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify(
        {
          ok: true,
          target: `${opts.targetHost}:${opts.targetPort}`,
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

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  stats.connections += 1;
  stats.liveConnections += 1;
  const connId = stats.connections;
  console.log(
    `[bridge] #${connId} browser connected (live=${stats.liveConnections}) → udp ${opts.targetHost}:${opts.targetPort}`
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
    console.log(
      `[bridge] #${connId} WS open, readyState=${ws.readyState}`
    );
  });

  ws.on('error', (err) =>
    console.error(`[bridge] #${connId} ws error:`, err.message)
  );
  ws.on('close', (code, reason) => {
    console.log(
      `[bridge] #${connId} WS close code=${code} reason=${reason?.toString() || '<none>'}`
    );
  });

  ws.on('message', (data, isBinary) => {
    // The engine only ever sends binary frames. If we get text, drop it —
    // it isn't a GoldSrc datagram.
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    udp.send(buf, 0, buf.length, opts.targetPort, opts.targetHost, (err) => {
      if (err) console.error(`[bridge] #${connId} udp send failed:`, err.message);
    });
    stats.packetsToServer += 1;
    stats.bytesToServer += buf.length;
    // 2026-10-21 debug: log the first datagram per connection so we can
    // see whether the engine's GoldSrc handshake is actually crossing
    // the WebSocket (it should be a 0xffffffff-prefixed challenge with
    // "TSource Engine Query"). Keep it cheap: only while a debug flag is
    // set, and only the first 8 bytes so the log stays readable.
    if (opts.debug && stats.debugLogged < 40) {
      stats.debugLogged += 1;
      const head = buf.subarray(0, 8).toString('hex');
      console.log(
        `[bridge] #${connId} → udp ${buf.length}B  head=${head}`
      );
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

server.listen(opts.listen, '0.0.0.0', () => {
  console.log(
    `[bridge] listening on ws://0.0.0.0:${opts.listen}/ws  →  udp://${opts.targetHost}:${opts.targetPort}`
  );
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