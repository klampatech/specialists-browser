/**
 * The GoldSrc RCON client.
 *
 * THE PROTOCOL (measured — docs/ADMIN-CONSOLE.md §2.1)
 * ---------------------------------------------------
 * The engine's RCON is a UDP packet to the game server's OWN port. It
 * is not a TCP stream and it has no session:
 *
 *   request   \xff\xff\xff\xff  rcon <password> <command>\n
 *   reply     \xff\xff\xff\xff  print\n<text>      (one or more datagrams)
 *
 * (`engine/server/sv_client.c`, `SV_RemoteCommand`.)
 *
 * FIVE THINGS THAT WILL BITE
 * --------------------------
 *
 * 1. THE PACKET IS RAW BYTES. `Buffer.from(cmd)` encodes 0xff as the
 *    UTF-8 pair 0xc3 0xbf, so the server never sees the magic number
 *    and RCON looks broken while the network is fine. The request AND
 *    the reply are latin1 (`binary`), on both sides.
 *
 * 2. THE REPLY IS MANY DATAGRAMS. The engine flushes its redirect
 *    buffer per printed line, so `status` on a busy server arrives as
 *    ~20 datagrams. There is no length and no terminator: the reader
 *    stops when the socket goes QUIET.
 *
 * 3. AN EMPTY REPLY IS A SUCCESS. A command that prints nothing still
 *    gets one datagram (`print\n` and nothing else) — the engine's
 *    redirect is flushed unconditionally — so "a reply that is empty"
 *    and "no reply at all" are two different things and mean two
 *    different things.
 *
 * 4. THE REPLY IS A CONCATENATION, NOT A JOIN. Each datagram's text
 *    already ENDS WITH A NEWLINE: the engine's redirect buffer does
 *    (`Rcon_Print` appends to it, and the flush sends the buffer as it
 *    is), so joining the datagrams with '\n' would put a blank line
 *    between every line — and would break any line the engine's
 *    2032-byte redirect cap had split in two. The repo's own reference
 *    client does the same thing (`tools/port/tsp-rs/xtask/src/a2s.rs`:
 *    `out.push_str(...)`).
 *
 * 5. THERE ARE TWO CLOCKS, NOT ONE. The quiet timer says "the reply is
 *    over"; it is the right rule and the only rule that works for a
 *    well-behaved engine. But every datagram RESTARTS it, so an engine
 *    that keeps talking never lets it fire, and the request hangs
 *    forever. The OVERALL DEADLINE is the second clock, and it settles
 *    the promise whatever the traffic.
 *
 * NEVER RETRY
 * -----------
 * The engine's own rate limiter takes a token on a FAILED attempt
 * only, so an automatic retry turns one mistake into a lockout. One
 * attempt per call, then report. (The SERVICE re-probes on the next
 * request; the cache's TTL is what bounds that rate — see
 * lib/fleet.mjs.)
 *
 * WHY A CONNECTED SOCKET
 * -----------------------
 * The socket is connected, which buys the one signal that separates
 * "the instance is down" from "the instance refused my password":
 *
 *   - The port is CLOSED (the container is stopped, the engine has
 *     not bound its socket yet): the host answers with an ICMP port
 *     unreachable, which a connected UDP socket reports as
 *     ECONNREFUSED. That is a DOWN instance.
 *   - The port is OPEN and the engine says nothing (the password is
 *     wrong, or RCON is disabled on that instance): the read times
 *     out with no error at all. That is a REFUSAL.
 *
 * Without that distinction the console would have to tell a
 * down server from a misconfigured one by guessing, and the two need
 * completely different answers from the operator.
 */

import dgram from 'node:dgram';
import { stripColourCodes } from './parse.mjs';

/** The four bytes that start every GoldSrc out-of-band packet. */
export const MAGIC = '\xff\xff\xff\xff';

/** How long to wait for the FIRST datagram of a reply. */
export const FIRST_REPLY_TIMEOUT_MS = 1_500;

/** How long the engine has to be quiet before the reply is complete. */
export const QUIET_TIMEOUT_MS = 300;

/**
 * How long the whole exchange may take, whatever the traffic.
 *
 * The quiet timer is a TERMINATOR, not a deadline: the reply has no
 * length and no terminator, so "the engine stopped talking" is the
 * only end-of-reply the protocol offers — and it is the right one. But
 * it is restarted by every datagram, so an instance that keeps
 * dribbling packets out (a flood, a stuck game thread, a peer that
 * never stops) keeps the promise pending INDEFINITELY: the HTTP
 * request hangs and the socket leaks. One misbehaving instance would
 * hang the whole fleet read.
 *
 * So this is a second, independent clock, and it settles the promise
 * whatever happens. It is armed BEFORE `socket.connect`, so a slow DNS
 * resolver is bounded too.
 */
export const OVERALL_DEADLINE_MS = 5_000;

/**
 * Why the engine said nothing at all.
 *
 * The protocol cannot tell these four apart, and the console must not
 * pretend it can:
 *
 *   - the RCON password is wrong;
 *   - RCON is disabled on that instance;
 *   - UDP is filtered between here and there;
 *   - the engine is busy and did not get to the command.
 *
 * A CLOSED port is a DIFFERENT observation — the host answers ICMP
 * port-unreachable, a connected socket reports that as ECONNREFUSED,
 * and the outcome is `unreachable` — so "the instance is not there" is
 * already separated out.
 */
const NO_REPLY_DETAIL =
  'the engine did not answer — the RCON password may be wrong, RCON may be disabled on that ' +
  'instance, UDP may be filtered, or the engine may be busy';

/**
 * What a GoldSrc build says when the password does not match.
 *
 * THE PINNED ENGINE NEVER SAYS IT. `SV_RemoteCommand` takes a token
 * from the rate limiter and RETURNS WITHOUT REPLYING when the password
 * is wrong, so on this engine a wrong password is a SILENCE, not a
 * sentence. The branch stays, because some builds do answer and the
 * string costs nothing to recognise — but it is not evidence about
 * the engine we ship.
 */
const BAD_PASSWORD = /bad rcon_password/i;

/**
 * Build the request datagram.
 *
 * `binary` is latin1: one byte per character, so the magic number
 * stays four bytes of 0xff. This is the whole trick.
 *
 * @param {string} password
 * @param {string} command
 * @returns {Buffer}
 */
export function buildRequest(password, command) {
  return Buffer.from(`${MAGIC}rcon ${password} ${command}\n`, 'binary');
}

/**
 * Decode one reply datagram.
 *
 * The body is `print\n<text>` (FWGS) or `l<text>` (older GoldSrc), and
 * the engine NUL-terminates the payload.
 *
 * @param {Buffer} buf
 * @returns {string} the printed text, without the header
 */
export function decodePacket(buf) {
  let text = buf.toString('binary');
  if (text.startsWith(MAGIC)) text = text.slice(MAGIC.length);
  if (text.startsWith('print\n')) text = text.slice('print\n'.length);
  else if (text.startsWith('l')) text = text.slice(1);
  const nul = text.indexOf('\0');
  if (nul !== -1) text = text.slice(0, nul);
  // The engine does not send CR, but a carriage return must never
  // reach a parser, and it costs one pass to take it out.
  return text.replace(/\r/g, '');
}

/**
 * Ask the engine one question and read the whole answer.
 *
 * @param {object} opts
 * @param {string} opts.host
 * @param {number} opts.port
 * @param {string} opts.password
 * @param {string} opts.command
 * @param {number} [opts.timeoutMs]   how long to wait for the first datagram
 * @param {number} [opts.quietMs]     how long the engine must be quiet
 * @param {number} [opts.deadlineMs]  how long the whole exchange may take
 * @returns {Promise<{
 *   outcome: 'ok'|'refused'|'unreachable',
 *   text: string,
 *   lines: string[],
 *   packets: number,
 *   empty: boolean,
 *   detail: string
 * }>}
 *
 * `outcome` is the honest report of what happened:
 *   - `ok`         the engine answered (possibly with nothing to say)
 *   - `refused`    the engine is there and would not talk to us
 *   - `unreachable` we have no usable answer: the instance is not
 *                  there, or it never finished the reply
 */
export async function rcon({
  host,
  port,
  password,
  command,
  timeoutMs = FIRST_REPLY_TIMEOUT_MS,
  quietMs = QUIET_TIMEOUT_MS,
  deadlineMs = OVERALL_DEADLINE_MS,
} = {}) {
  // An IPv6 target needs an IPv6 socket; everything else is v4.
  const socket = dgram.createSocket(String(host ?? '').includes(':') ? 'udp6' : 'udp4');
  const request = buildRequest(password, command);
  const parts = [];
  let packets = 0;
  let settled = false;
  /** The quiet / first-reply timer. */
  let timer = null;
  /** The overall deadline. A SEPARATE slot: it must survive every
   *  re-arm of the quiet timer, or it would never fire. */
  let deadline = null;

  return new Promise((resolve) => {
    const done = (result) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (deadline) clearTimeout(deadline);
      // The error path closes the socket itself; closing twice throws.
      try {
        socket.close();
      } catch {
        /* already closed */
      }
      resolve(result);
    };

    const arm = (ms) => {
      // A datagram that arrives after the promise settled must not
      // re-arm a timer on a closed socket: it would hold the event
      // loop for another quiet period, for nothing.
      if (settled) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(onQuiet, ms);
    };

    /**
     * The socket went quiet. That is the end of the reply: the engine
     * flushes one datagram per printed line and there is no terminator.
     */
    const onQuiet = () => {
      if (packets === 0) {
        // Nothing at all came back, and no ICMP came either, so the
        // port is open and the engine chose not to answer. Four things
        // look like this and the protocol cannot tell them apart.
        done({
          outcome: 'refused',
          text: '',
          lines: [],
          packets: 0,
          empty: false,
          detail: NO_REPLY_DETAIL,
        });
        return;
      }
      // Each datagram's text already ends with the engine's own
      // newline, so the reply is a CONCATENATION. Joining with '\n'
      // would insert a blank line between every line.
      const text = stripColourCodes(parts.join(''));
      const lines = text.split('\n').filter((l) => l.trim() !== '');
      if (BAD_PASSWORD.test(text)) {
        done({
          outcome: 'refused',
          text,
          lines,
          packets,
          empty: lines.length === 0,
          detail: 'the engine rejected the RCON password',
        });
        return;
      }
      done({
        outcome: 'ok',
        text,
        lines,
        packets,
        // A command that printed nothing is a SUCCESS with no output.
        empty: lines.length === 0,
        detail: '',
      });
    };

    /**
     * The overall deadline. The engine is talking and has not finished,
     * or has not said anything at all.
     */
    const onDeadline = () => {
      if (packets === 0) {
        // Nothing came back at all: the same "no reply" the quiet
        // timer reports, and the same four causes.
        done({
          outcome: 'refused',
          text: '',
          lines: [],
          packets: 0,
          empty: false,
          detail: NO_REPLY_DETAIL,
        });
        return;
      }
      // The engine IS talking and never finished. That is NOT a
      // refusal — a refusal means the engine did not answer at all —
      // and it is not an `ok` either: the reply is incomplete and the
      // console must not show half a player table as if it were the
      // whole thing. It is "no usable answer", which is what
      // `unreachable` means here.
      done({
        outcome: 'unreachable',
        text: '',
        lines: [],
        packets,
        empty: false,
        detail:
          'the instance kept talking but never finished the reply — the overall deadline of ' +
          `${deadlineMs}ms passed with ${packets} datagram(s) received`,
      });
    };

    socket.on('message', (buf) => {
      packets += 1;
      parts.push(decodePacket(buf));
      // The reply is a stream of datagrams; the next one restarts the
      // quiet clock.
      arm(quietMs);
    });

    socket.on('error', (err) => {
      // ECONNREFUSED is the host saying the port is closed: the
      // instance is down. ENETUNREACH/EHOSTUNREACH say the same about
      // the machine.
      done({
        outcome: 'unreachable',
        text: '',
        lines: [],
        packets,
        empty: false,
        detail: `the instance did not answer (${err.code || 'socket error'})`,
      });
    });

    socket.on('close', () => {
      if (!settled) {
        done({
          outcome: 'unreachable',
          text: '',
          lines: [],
          packets,
          empty: false,
          detail: 'the socket closed before the engine answered',
        });
      }
    });

    // The overall deadline is armed BEFORE the connect, so a DNS
    // resolver that takes forever is bounded too.
    if (Number.isFinite(deadlineMs) && deadlineMs > 0) {
      deadline = setTimeout(onDeadline, deadlineMs);
    }

    try {
      socket.connect(port, host, (connectErr) => {
        // NODE CALLS THIS CALLBACK WITH THE ERROR, AND THE ERROR IS
        // NOT OPTIONAL. A DNS failure, an unreachable network or a
        // refused bind all land here — and if the callback sends
        // anyway, `send()` on an UNCONNECTED socket reinterprets its
        // arguments: Node reads the 4-argument form as
        // (msg, port, address, callback), so the offset (0) becomes
        // the PORT and the length becomes the ADDRESS. It then throws
        // ERR_SOCKET_BAD_PORT ("Port should be > 0 and < 65536.
        // Received type number (0)") — and because this runs inside
        // an async callback, that throw is an UNCAUGHT EXCEPTION and
        // takes the whole service down.
        //
        // A connect that failed is an unreachable instance. Say so.
        if (connectErr) {
          done({
            outcome: 'unreachable',
            text: '',
            lines: [],
            packets: 0,
            empty: false,
            detail: `the instance did not answer (${connectErr.code || connectErr.message})`,
          });
          return;
        }
        try {
          socket.send(request, 0, request.length, (err) => {
            if (err) {
              // A send that failed AFTER a reply arrived is not a
              // failure to reach the instance: we HAVE the reply, and
              // the quiet timer settles it as `ok` with the real
              // packet count. Swallowing the error here is what keeps
              // a good reply from being thrown away.
              if (packets > 0) return;
              done({
                outcome: 'unreachable',
                text: '',
                lines: [],
                packets,
                empty: false,
                detail: `the instance did not answer (${err.code || 'send failed'})`,
              });
              return;
            }
            // The clock starts when the question is on the wire — but
            // only if the answer has not already started arriving. The
            // send callback can fire AFTER the first reply datagram
            // (a fast engine on a fast link), and arming the long
            // first-reply timeout then would overwrite the short quiet
            // timeout the reply had already armed, so a one-line reply
            // would take 1500ms instead of 300ms.
            if (packets === 0) arm(timeoutMs);
          });
        } catch (sendErr) {
          // Same reasoning: a throw from here would be uncaught.
          done({
            outcome: 'unreachable',
            text: '',
            lines: [],
            packets,
            empty: false,
            detail: `the instance did not answer (${sendErr.code || sendErr.message})`,
          });
        }
      });
    } catch (err) {
      // A bad PORT fails here, not in an event: `socket.connect`
      // throws ERR_SOCKET_BAD_PORT synchronously. A bad HOST does not
      // — it fails in the connect callback above.
      done({
        outcome: 'unreachable',
        text: '',
        lines: [],
        packets: 0,
        empty: false,
        detail: `the instance did not answer (${err.code || err.message})`,
      });
    }
  });
}
