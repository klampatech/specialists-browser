/**
 * The RCON client, against a fake engine that speaks the protocol.
 *
 * The fake is a REAL UDP SOCKET, not a mock of our own client. That is
 * the point of the test: it proves the bytes on the wire, the
 * multi-datagram read and the timeout, none of which a mock of the
 * client would prove.
 *
 * The datagram shapes are the measured ones (docs/ADMIN-CONSOLE.md
 * §2.1): the request is `\xff\xff\xff\xffrcon <password> <command>\n`
 * and the reply is `\xff\xff\xff\xffprint\n<text>`, one datagram per
 * printed line.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import dgram from 'node:dgram';
import { buildRequest, decodePacket, rcon } from '../../services/admin/lib/rcon.mjs';

/** A reply datagram, the way the engine sends it. */
function print(text) {
  return Buffer.concat([
    Buffer.from('\xff\xff\xff\xffprint\n', 'binary'),
    Buffer.from(text, 'binary'),
  ]);
}

/**
 * Run `fn` against a fake engine.
 *
 * @param {(buf: Buffer, rinfo: object, socket: dgram.Socket) => void} [onRequest]
 * @param {(ctx: {port: number, received: Buffer[]}) => Promise<void>} fn
 */
async function withFakeEngine(onRequest, fn) {
  const socket = dgram.createSocket('udp4');
  const received = [];
  socket.on('message', (buf, rinfo) => {
    received.push(buf);
    if (onRequest) onRequest(buf, rinfo, socket);
  });
  await new Promise((resolve) => socket.bind(0, '127.0.0.1', resolve));
  try {
    await fn({ port: socket.address().port, received });
  } finally {
    socket.close();
  }
}

test('the request is raw bytes: four 0xff, not the UTF-8 pair', async () => {
  let seen = null;
  await withFakeEngine(
    (buf) => {
      seen = buf;
    },
    async ({ port }) => {
      await rcon({
        host: '127.0.0.1',
        port,
        password: 'hunter2',
        command: 'status',
        timeoutMs: 150,
        quietMs: 50,
      });
    },
  );

  assert.ok(seen, 'the fake engine never received the request');
  assert.equal(seen.toString('binary'), '\xff\xff\xff\xffrcon hunter2 status\n');
  assert.deepEqual([...seen.subarray(0, 4)], [0xff, 0xff, 0xff, 0xff]);

  // THE TRAP. The same string without the encoding is the UTF-8 pair
  // 0xc3 0xbf, and the engine never sees the magic number.
  const utf8 = Buffer.from('\xff\xff\xff\xffrcon hunter2 status\n');
  assert.notDeepEqual([...utf8.subarray(0, 4)], [0xff, 0xff, 0xff, 0xff]);
});

test('the password and the command are on the wire, in that order', () => {
  assert.equal(
    buildRequest('s3cret', 'sys_ticrate').toString('binary'),
    '\xff\xff\xff\xffrcon s3cret sys_ticrate\n',
  );
});

test('the reply is MANY datagrams and the reader stops when it goes quiet', async () => {
  const lines = [
    'hostname:  bulletballet TS',
    'players :  4 active (32 max)',
    '# 1     "Neo" 2 ID_7dea 5 01:23  45  0 172.17.0.1',
    '4 users',
  ];
  await withFakeEngine(
    (buf, rinfo, socket) => {
      // One datagram per printed line, as the engine's redirect does.
      for (const line of lines) socket.send(print(line), rinfo.port, rinfo.address);
    },
    async ({ port }) => {
      const res = await rcon({
        host: '127.0.0.1',
        port,
        password: 'pw',
        command: 'status',
        timeoutMs: 500,
        quietMs: 120,
      });
      assert.equal(res.outcome, 'ok');
      assert.equal(res.packets, lines.length);
      assert.deepEqual(res.lines, lines);
      assert.equal(res.text, lines.join('\n'));
      assert.equal(res.empty, false);
    },
  );
});

test('a reply that is EMPTY is a successful command that printed nothing', async () => {
  await withFakeEngine(
    (buf, rinfo, socket) => {
      // The engine flushes its redirect even when nothing was printed,
      // so the reply is a datagram with an empty body.
      socket.send(print(''), rinfo.port, rinfo.address);
    },
    async ({ port }) => {
      const res = await rcon({
        host: '127.0.0.1',
        port,
        password: 'pw',
        command: 'restartround',
        timeoutMs: 500,
        quietMs: 120,
      });
      assert.equal(res.outcome, 'ok');
      assert.equal(res.packets, 1);
      assert.equal(res.text, '');
      assert.equal(res.empty, true);
      assert.deepEqual(res.lines, []);
    },
  );
});

test('NO reply at all is a refusal, and it waits for the timeout', async () => {
  await withFakeEngine(null, async ({ port }) => {
    const started = Date.now();
    const res = await rcon({
      host: '127.0.0.1',
      port,
      password: 'pw',
      command: 'status',
      timeoutMs: 250,
      quietMs: 100,
    });
    const elapsed = Date.now() - started;
    assert.equal(res.outcome, 'refused');
    assert.equal(res.packets, 0);
    assert.equal(res.empty, false);
    assert.ok(elapsed >= 250, `the client gave up after ${elapsed}ms, not the timeout`);
  });
});

test('the engine can say the password is wrong', async () => {
  await withFakeEngine(
    (buf, rinfo, socket) => {
      socket.send(print('Bad rcon_password.'), rinfo.port, rinfo.address);
    },
    async ({ port }) => {
      const res = await rcon({
        host: '127.0.0.1',
        port,
        password: 'wrong',
        command: 'status',
        timeoutMs: 500,
        quietMs: 120,
      });
      assert.equal(res.outcome, 'refused');
      assert.equal(res.packets, 1);
      assert.match(res.text, /Bad rcon_password/);
    },
  );
});

test('a closed port is UNREACHABLE, not refused', async () => {
  // The port has to be closed, not silent: an open port with a silent
  // engine is a refusal, and a closed port is an instance that is not
  // there. The two need different answers from the operator.
  const probe = dgram.createSocket('udp4');
  await new Promise((resolve) => probe.bind(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  probe.close();

  const res = await rcon({
    host: '127.0.0.1',
    port,
    password: 'pw',
    command: 'status',
    timeoutMs: 500,
    quietMs: 100,
  });
  assert.equal(res.outcome, 'unreachable');
  assert.equal(res.packets, 0);
});

test('the colour codes are stripped out of the reply', async () => {
  await withFakeEngine(
    (buf, rinfo, socket) => {
      socket.send(print('^1Error: ^7banid: no such player'), rinfo.port, rinfo.address);
    },
    async ({ port }) => {
      const res = await rcon({
        host: '127.0.0.1',
        port,
        password: 'pw',
        command: 'banid 10 #165 kick',
        timeoutMs: 500,
        quietMs: 120,
      });
      assert.equal(res.text, 'Error: banid: no such player');
      assert.doesNotMatch(res.text, /\^\d/);
    },
  );
});

test('the reply is decoded as latin1, not UTF-8', async () => {
  await withFakeEngine(
    (buf, rinfo, socket) => {
      // 0xe9 is 'é' in latin1 and not valid UTF-8 on its own.
      socket.send(
        Buffer.concat([
          Buffer.from('\xff\xff\xff\xffprint\n', 'binary'),
          Buffer.from([0x4a, 0x65, 0x72, 0xf3, 0x09]),
        ]),
        rinfo.port,
        rinfo.address,
      );
    },
    async ({ port }) => {
      const res = await rcon({
        host: '127.0.0.1',
        port,
        password: 'pw',
        command: 'status',
        timeoutMs: 500,
        quietMs: 120,
      });
      assert.equal(res.text, 'Jeró\t');
    },
  );
});

test('a datagram without the magic number is not a reply we can use', () => {
  assert.equal(decodePacket(Buffer.from('not a reply', 'binary')), 'not a reply');
  assert.equal(decodePacket(Buffer.from('\xff\xff\xff\xffprint\nhello', 'binary')), 'hello');
  // The older GoldSrc shape is `l<text>`.
  assert.equal(decodePacket(Buffer.from('\xff\xff\xff\xfflhello', 'binary')), 'hello');
});
