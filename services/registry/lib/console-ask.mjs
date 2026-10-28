/**
 * Asking the engine a question over its console.
 *
 * WHY A QUESTION CAN COME BACK EMPTY
 * ----------------------------------
 * The registry asks the game server things — the tickrate, the bot
 * quota, the map timer — by writing a command into the server's console
 * FIFO and reading the answer back out of the container's Docker log.
 *
 * The write is `printf 'cmd\n' | docker exec -i ts-0 sh -c 'cat >
 * /tmp/console.pipe'`, and a FIFO delivers what is written to exactly
 * ONE waiting reader. The container's entrypoint holds that FIFO open
 * **read-write** on fd 3, so PID 1 is a reader as well as the `cat` that
 * feeds the engine. When the kernel hands the command to PID 1's fd
 * instead of to `cat`, the command is consumed and discarded: it never
 * reaches the engine, the engine never echoes the marker, and the
 * answer never arrives.
 *
 * MEASURED on production, against the running container:
 *
 *   - a single question, asked on its own: 2 of 12 NEVER answered, in
 *     25 seconds. Not slow — never.
 *   - the registry's real pattern, three in parallel: the tickrate
 *     question missed in 2 of 10 rounds, and when it missed all three
 *     missed together.
 *
 * That is a 20% failure rate on the registry's PROOF OF LIFE. And a
 * failed console read is read as 'down' (see lib/liveness.mjs), so three
 * of those in a row mark the instance stale, and the public server list
 * — which is `rows.filter((r) => !r.stale)` — goes EMPTY. A player who
 * presses PLAY in that window gets a dead button and "No servers
 * answered. Check back in a moment — the fleet may be restarting."
 *
 * THE FIX, IN TWO PLACES
 * ----------------------
 *   1. Here: ask again. The question is retried when its MARKER never
 *      appears in the log, which is the signature of a swallowed
 *      command. A question that is merely SLOW is not retried — the
 *      marker is in the log, so the engine has it, and the answer is on
 *      its way.
 *   2. tools/deploy/entrypoint.sh: stop holding the FIFO open
 *      read-write, so PID 1 stops being a reader at all. That is the
 *      root cause, and it ships with the next ts-server image build.
 *
 * The question is only ever asked about a CVAR, so asking twice is
 * harmless: `sys_ticrate`, `ts_bot_quota` and `mp_timeleft` all just
 * print a value.
 */

import { findAnswerAfterMarker } from './console-log.mjs';

/** How long one attempt waits for its answer before the question is re-asked. */
export const ATTEMPT_MS = 2_000;

/** How long to wait for the marker itself before calling the command swallowed. */
export const MARKER_GRACE_MS = 1_000;

/** How often the log is re-read while waiting. */
export const POLL_MS = 150;

let markerSeq = 0;

/**
 * A marker that is unique for every attempt.
 *
 * The original was `TSREG${Date.now().toString(36)}`, which has
 * millisecond resolution — two attempts in the same millisecond would
 * share a marker, and `findAnswerAfterMarker` takes the FIRST occurrence,
 * so one attempt could read the other's answer. The sequence number
 * makes every marker unique, which matters more now that a question can
 * be asked more than once.
 */
export function makeMarker(prefix = 'TSREG') {
  markerSeq = (markerSeq + 1) % 1_000_000;
  return `${prefix}${Date.now().toString(36)}${markerSeq.toString(36)}`;
}

/**
 * Ask the engine a question and wait for its answer.
 *
 * @param {object} opts
 * @param {(line: string) => Promise<void>} opts.write  write one line to the console
 * @param {() => Promise<string>} opts.read              the container's log tail
 * @param {string} opts.command                          the command to ask
 * @param {RegExp} opts.pattern                          what the answer looks like
 * @param {number} [opts.timeoutMs]                      the whole deadline
 * @param {number} [opts.attemptMs]                      one attempt's window
 * @param {number} [opts.markerGraceMs]                  how long to wait for the marker
 * @param {number} [opts.pollMs]                         how often to re-read the log
 * @param {() => string} [opts.marker]                   the marker factory
 * @param {() => number} [opts.now]                      the clock
 * @param {(ms: number) => Promise<void>} [opts.sleep]   the sleep
 * @returns {Promise<RegExpMatchArray|null>}
 */
export async function askConsole(opts) {
  const {
    write,
    read,
    command,
    pattern,
    timeoutMs = 6_000,
    attemptMs = ATTEMPT_MS,
    markerGraceMs = MARKER_GRACE_MS,
    pollMs = POLL_MS,
    marker = makeMarker,
    now = Date.now,
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  } = opts;

  const deadline = now() + timeoutMs;

  while (now() < deadline) {
    const thisMarker = marker();
    await write(`echo ${thisMarker}`);
    await write(command);

    const attemptUntil = Math.min(deadline, now() + attemptMs);
    const markerDeadline = now() + markerGraceMs;

    while (now() < attemptUntil) {
      const text = await read();
      const answer = findAnswerAfterMarker(text, thisMarker, pattern);
      if (answer) return answer;
      // The marker is NOT in the log: the command was swallowed by the
      // wrong reader and the engine never saw it. Asking again is the
      // only way to get an answer.
      if (now() > markerDeadline && !text.includes(thisMarker)) break;
      await sleep(pollMs);
    }
  }

  return null;
}
