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
 *
 * THE FAKE ENDS EVERY LINE WITH A NEWLINE, BECAUSE THE ENGINE DOES.
 * The engine's redirect buffer ends with '\n' and the flush sends the
 * buffer as it is (`Rcon_Print`, engine/server/sv_client.c), so the
 * text of a reply is the CONCATENATION of the datagrams — each one
 * already carrying its own newline. A fake that drops the newline
 * would let the client invent a fiction: a reply joined with '\n'
 * would look right and would put a blank line between every line of
 * the real thing.
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
 * A PRINTED LINE, the way the engine sends it.
 *
 * The engine's redirect buffer ends with a newline, so the flushed
 * datagram ends with one too.
 *
 * @param {string} text
 * @returns {Buffer}
 */
function line(text) {
  return print(`${text}\n`);
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
      // One datagram per printed line, as the engine's redirect does —
      // and each one ends with the engine's own newline.
      for (const l of lines) socket.send(line(l), rinfo.port, rinfo.address);
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
      assert.equal(res.empty, false);
    },
  );
});

test("the reply is the engine's text: concatenated, with no blank line between", async () => {
  // THE EXACT TEXT. The engine's redirect buffer ends with a newline
  // and the flush sends it as it is, so the reply is the datagrams
  // CONCATENATED. Joining them with '\n' would put a blank line
  // between every line — and would break a line that the engine's
  // 2032-byte redirect cap had split in two.
  await withFakeEngine(
    (buf, rinfo, socket) => {
      socket.send(line('line1'), rinfo.port, rinfo.address);
      socket.send(line('line2'), rinfo.port, rinfo.address);
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
      assert.equal(res.text, 'line1\nline2\n');
      assert.notEqual(res.text, 'line1\n\nline2\n');
      assert.deepEqual(res.lines, ['line1', 'line2']);
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

test('a refusal says what it cannot know', async () => {
  // "No reply" is ONE observation, and the protocol cannot tell the
  // four causes apart: a wrong password, RCON disabled on that
  // instance, UDP filtered, and a busy engine all look the same from
  // here. The detail has to name all four — a refusal that says only
  // "wrong password" sends the operator after the one cause that is
  // not a configuration problem.
  await withFakeEngine(null, async ({ port }) => {
    const res = await rcon({
      host: '127.0.0.1',
      port,
      password: 'pw',
      command: 'status',
      timeoutMs: 200,
      quietMs: 100,
    });
    assert.equal(res.outcome, 'refused');
    assert.match(res.detail, /password/i);
    assert.match(res.detail, /disabled/i);
    assert.match(res.detail, /filtered/i);
    assert.match(res.detail, /busy/i);
  });
});

test('a build that says "Bad rcon_password" is understood — but the pinned engine never says it', async () => {
  // WHAT THIS PROVES: the client recognises the string IF it ever
  // sees one. It is NOT evidence about the engine we ship: the pinned
  // FWGS build takes a rate-limit token and RETURNS WITHOUT REPLYING
  // when the password is wrong, so a wrong password there is a
  // silence, not a sentence. The refusal in the test above is the
  // shape a wrong password actually takes.
  await withFakeEngine(
    (buf, rinfo, socket) => {
      socket.send(line('Bad rcon_password.'), rinfo.port, rinfo.address);
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

test('an engine that keeps talking cannot hang the request forever', async () => {
  // THE HANG. The reply has no terminator: the reader stops when the
  // socket goes QUIET, and every datagram restarts the quiet clock. An
  // engine that dribbles a packet out every 250ms therefore keeps the
  // promise pending FOREVER — the HTTP request hangs and the socket
  // leaks, and one misbehaving instance hangs the whole fleet read.
  //
  // The OVERALL DEADLINE is the second clock, and it settles whatever
  // the traffic. It is not a refusal either: the engine IS talking,
  // it just never finished, and the reply cannot be trusted.
  let ticker = null;
  await withFakeEngine(
    (buf, rinfo, socket) => {
      ticker = setInterval(() => {
        socket.send(line('tick'), rinfo.port, rinfo.address);
      }, 250);
    },
    async ({ port }) => {
      const started = Date.now();
      try {
        const res = await rcon({
          host: '127.0.0.1',
          port,
          password: 'pw',
          command: 'status',
          timeoutMs: 500,
          // The quiet window is WIDER than the trickle, which is what
          // makes the quiet timer useless: every datagram arrives
          // before the socket has been quiet long enough.
          quietMs: 400,
          deadlineMs: 700,
        });
        const elapsed = Date.now() - started;
        assert.ok(res.packets > 0, 'the fake engine must have sent something');
        assert.notEqual(res.outcome, 'ok', 'an unfinished reply is not an answer');
        assert.notEqual(res.outcome, 'refused', 'a refusal means the engine said nothing');
        assert.equal(res.outcome, 'unreachable');
        assert.match(res.detail, /never finished/);
        assert.ok(elapsed >= 600, `the call took ${elapsed}ms, not the deadline`);
        assert.ok(elapsed < 3000, `the call took ${elapsed}ms, far past the deadline`);
      } finally {
        if (ticker) clearInterval(ticker);
      }
    },
  );
});

test('a host that cannot be resolved is unreachable, and does NOT crash', async () => {
  // THE CRASH. Node calls the connect callback with the error, and the
  // error is not optional. Sending anyway means calling `send()` on an
  // UNCONNECTED socket, where Node reinterprets the 4-argument form as
  // (msg, port, address, callback) -- so the offset (0) becomes the
  // port -- and throws ERR_SOCKET_BAD_PORT. That throw happens inside
  // an async callback, so it is an UNCAUGHT EXCEPTION: it takes the
  // whole service down, for a host name that simply does not resolve.
  //
  // Under the old code this test killed the runner.
  const r = await rcon({
    host: 'no-such-host.invalid',
    port: 27015,
    password: 'x',
    command: 'status',
    timeoutMs: 500,
  });
  assert.equal(r.outcome, 'unreachable');
  assert.match(r.detail, /ENOTFOUND|did not answer/);
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
      socket.send(line('^1Error: ^7banid: no such player'), rinfo.port, rinfo.address);
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
      assert.equal(res.text, 'Error: banid: no such player\n');
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
          Buffer.from([0x4a, 0x65, 0x72, 0xf3, 0x09, 0x0a]),
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
      assert.equal(res.text, 'Jeró\t\n');
    },
  );
});

test('a datagram without the magic number is not a reply we can use', () => {
  assert.equal(decodePacket(Buffer.from('not a reply', 'binary')), 'not a reply');
  assert.equal(decodePacket(Buffer.from('\xff\xff\xff\xffprint\nhello', 'binary')), 'hello');
  // The older GoldSrc shape is `l<text>`.
  assert.equal(decodePacket(Buffer.from('\xff\xff\xff\xfflhello', 'binary')), 'hello');
});
