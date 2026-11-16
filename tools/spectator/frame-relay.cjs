#!/usr/bin/env node
/**
 * frame-relay.cjs — the middle of the live-camera pipeline.
 *
 *   camera client  --POST /frames-->  relay  --WebSocket-->  the page
 *
 * WHY TWO DIFFERENT TRANSPORTS
 * -----------------------------
 * The camera pushes FROM the capture host, and it pushes a lot of small
 * binary blobs. HTTP POST with a length-prefixed body is the boring,
 * dependency-free way to do that, and a POST needs no framing state on
 * either end.
 *
 * The page pulls, and it wants the frames AS THEY ARE: a WebSocket carries
 * binary frames with no base64 tax (a 5 KB JPEG becomes 6.7 KB as base64,
 * and this hop is the one that scales with viewers). The server side of a
 * WebSocket is small: the handshake, and sending. Nothing here ever has to
 * parse a client's frame, because the viewers only receive.
 *
 * THE FAN-OUT IS THE POINT. One camera, one CPU cost, N viewers, and the
 * only per-viewer cost is bandwidth.
 *
 * THE FRAME BODY FORMAT
 * ----------------------
 * A POST body is a sequence of records: [uint32 big-endian length][bytes].
 * Length 0 ends the batch. That is it — no magic, no JSON, no base64.
 *
 * USAGE
 *   node tools/spectator/frame-relay.cjs [port]
 */

const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const PORT = Number(process.argv[2] || 5180);
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

const stats = {
  startedAt: Date.now(),
  framesIn: 0,
  framesOut: 0,
  bytesIn: 0,
  bytesOut: 0,
  viewers: 0,
  cameraConnected: false,
  lastFrameAt: 0,
  lastFrameBytes: 0,
};

const viewers = new Set();
let latestFrame = null;

/** A WebSocket frame header + payload, as the server sends it (unmasked). */
function wsFrame(payload, opcode = 0x2) {
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  header[0] = 0x80 | opcode; // FIN + opcode
  return Buffer.concat([header, payload]);
}

function acceptKey(key) {
  return crypto
    .createHash('sha1')
    .update(key + WS_GUID)
    .digest('base64');
}

function broadcast(frame) {
  const msg = wsFrame(frame);
  for (const v of viewers) {
    if (v.destroyed) {
      viewers.delete(v);
      continue;
    }
    v.write(msg);
    stats.framesOut += 1;
    stats.bytesOut += frame.length;
  }
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  if (url === '/frames' && req.method === 'POST') {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      // Parse the records: [uint32 BE length][bytes].
      let off = 0;
      let count = 0;
      while (off + 4 <= body.length) {
        const len = body.readUInt32BE(off);
        off += 4;
        if (len === 0 || off + len > body.length) break;
        const frame = body.subarray(off, off + len);
        off += len;
        count += 1;
        latestFrame = frame;
        stats.framesIn += 1;
        stats.bytesIn += frame.length;
        stats.lastFrameAt = Date.now();
        stats.lastFrameBytes = frame.length;
        broadcast(frame);
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, frames: count }));
    });
    return;
  }

  if (url === '/status') {
    const age = stats.lastFrameAt ? Date.now() - stats.lastFrameAt : null;
    res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
    res.end(
      JSON.stringify({
        ...stats,
        uptimeSeconds: Math.round((Date.now() - stats.startedAt) / 1000),
        lastFrameAgeMs: age,
        streamAlive: age !== null && age < 3000,
        viewers: viewers.size,
      })
    );
    return;
  }

  if (url === '/latest.jpg') {
    if (!latestFrame) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': 'image/jpeg', 'cache-control': 'no-store' });
    res.end(latestFrame);
    return;
  }

  res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
});

// The viewer WebSocket. The handshake and the sends — a viewer never sends
// anything but a close frame, and the socket's own error handling covers
// the rest.
server.on('upgrade', (req, socket, head) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return;
  }
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${acceptKey(key)}\r\n\r\n`
  );
  socket.setNoDelay(true);
  viewers.add(socket);
  stats.viewers = viewers.size;
  socket.on('close', () => {
    viewers.delete(socket);
    stats.viewers = viewers.size;
  });
  socket.on('error', () => {
    viewers.delete(socket);
    stats.viewers = viewers.size;
  });

  // A viewer that arrives before the first frame gets the latest one, so
  // the page is never blank while it waits.
  if (latestFrame) {
    socket.write(wsFrame(latestFrame));
    stats.framesOut += 1;
    stats.bytesOut += latestFrame.length;
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`frame-relay: ws://0.0.0.0:${PORT}/view   (camera pushes POST /frames)`);
});

// A heartbeat every 10s, so the log says the pipeline is alive and a
// stalled camera is visible without opening the status endpoint.
setInterval(() => {
  const age = stats.lastFrameAt ? Math.round((Date.now() - stats.lastFrameAt) / 1000) : null;
  console.log(
    `  frames in ${stats.framesIn} / out ${stats.framesOut} | viewers ${viewers.size} | ` +
      `last frame ${age === null ? 'NEVER' : age + 's ago'} | ${(stats.bytesIn / 1024).toFixed(0)}KB in`
  );
}, 10_000).unref?.();
