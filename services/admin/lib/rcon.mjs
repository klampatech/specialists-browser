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
 * FOUR THINGS THAT WILL BITE
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
 * 4. NEVER RETRY. The engine's own rate limiter takes a token on a
 *    FAILED attempt only, so an automatic retry turns one mistake into
 *    a lockout. One attempt per call, then report.
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

/** What a GoldSrc build says when the password does not match. */
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
 * @param {number} [opts.timeoutMs]  how long to wait for the first datagram
 * @param {number} [opts.quietMs]    how long the engine must be quiet
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
 *   - `unreachable` the instance is not there
 */
export async function rcon({
  host,
  port,
  password,
  command,
  timeoutMs = FIRST_REPLY_TIMEOUT_MS,
  quietMs = QUIET_TIMEOUT_MS,
} = {}) {
  // An IPv6 target needs an IPv6 socket; everything else is v4.
  const socket = dgram.createSocket(String(host ?? '').includes(':') ? 'udp6' : 'udp4');
  const request = buildRequest(password, command);
  const parts = [];
  let packets = 0;
  let settled = false;
  let timer = null;

  return new Promise((resolve) => {
    const done = (result) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      // The error path closes the socket itself; closing twice throws.
      try {
        socket.close();
      } catch {
        /* already closed */
      }
      resolve(result);
    };

    const arm = (ms) => {
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
        // port is open and the engine chose not to answer: the
        // password was refused, or RCON is disabled on that instance.
        done({
          outcome: 'refused',
          text: '',
          lines: [],
          packets: 0,
          empty: false,
          detail: 'the engine did not answer — the RCON password is refused, or RCON is disabled on that instance',
        });
        return;
      }
      const text = stripColourCodes(parts.join('\n'));
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

    try {
      socket.connect(port, host, () => {
        socket.send(request, 0, request.length, (err) => {
          if (err) {
            done({
              outcome: 'unreachable',
              text: '',
              lines: [],
              packets: 0,
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
      });
    } catch (err) {
      // A bad host or port fails here, not in an event.
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
