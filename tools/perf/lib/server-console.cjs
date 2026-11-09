/**
 * Talk to the CI game server's console.
 *
 * WHY THIS EXISTS
 * ---------------
 * A perf measurement has to pin the VIEWPOINT, and the angles are only
 * half of it. The server picks the spawn point at RANDOM
 * (`crates/server/src/rules/spawnpoint.rs:98` uses `eng.random_long`),
 * so two runs of the same map can put the player somewhere completely
 * different — and the engine's per-frame cost is dominated by what is
 * VISIBLE. Measured on ts_casa, same map, same bundle, same machine,
 * same angles: **1.87 ms** in one run and **9.12 ms** in another.
 *
 * The server's `ts_tp <player#> <x> <y> <z> [yaw] [pitch]` sets the
 * origin AND the angles in one command. So the harness asks the server
 * where the player is (`ts_status`, which prints every player's index
 * and origin), then teleports that player to the fixture position.
 *
 * HOW THE CONSOLE IS REACHED
 * --------------------------
 * A GoldSrc dedicated server takes commands on stdin. The container
 * runs it with a FIFO at /tmp/console.pipe, and the repo's own runbook
 * says how to use it:
 *
 *     printf 'ts_status\n' | docker exec -i ts-0 sh -c 'cat > /tmp/console.pipe'
 *
 * The server's answer goes to its stdout, which is the container's
 * log — so the output is read back from `docker logs`.
 *
 * THE CHEATS FLAG
 * ---------------
 * `ts_tp` refuses to run unless `sv_cheats 1`. The shared production
 * `server.cfg` has `sv_cheats 0`, and that file is the SOURCE of the
 * CI instance's config — so the CI stack derives its own copy with
 * `sv_cheats 1` and production is untouched.
 */
'use strict';

const { execFile } = require('node:child_process');

const DEFAULTS = {
  host: 'bb-prod',
  container: 'ts-ci-0',
  timeoutMs: 20000,
};

/**
 * Run one shell command over SSH and return its stdout.
 */
function ssh(host, command, timeoutMs) {
  return new Promise((resolve) => {
    execFile(
      'ssh',
      ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', host, command],
      { timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout, stderr) => {
        resolve({ code: err ? (err.code ?? 1) : 0, stdout: stdout || '', stderr: stderr || '' });
      }
    );
  });
}

/**
 * Send a command to the CI server's console.
 *
 * @param {string} cmd         the console command, e.g. `ts_status`
 * @param {object} [opts]
 * @param {string} [opts.host]
 * @param {string} [opts.container]
 * @param {RegExp} [opts.expect]  a pattern the answer must contain
 * @param {number} [opts.timeoutMs]
 * @returns {Promise<{ok: boolean, output: string, reason?: string}>}
 */
async function serverCommand(cmd, opts = {}) {
  const { host, container, timeoutMs } = { ...DEFAULTS, ...opts };

  // ONE shell command on the host does the whole exchange: it stamps
  // the time, sends the command into the container's console pipe, and
  // then reads the container's log from that stamp.
  //
  // The stamp has to be taken ON THE HOST and used with the SAME
  // `--since` in the read - mixing `--since 1s` for the "before" count
  // with `--tail 200` for the read gives two different windows, and the
  // line arithmetic silently drops the answer.
  const expect = opts.expect ? opts.expect.source : null;
  const attempts = Math.max(1, Math.ceil(timeoutMs / 1500));
  // THE SHELL-SIDE CHECK HAS TO BE POSIX, NOT JAVASCRIPT.
  //
  // The pattern below is a JavaScript regular expression's SOURCE, and
  // GNU grep's ERE does not know JavaScript's escapes: `\d` matches a
  // literal "d", and `\s` a literal "s". The check therefore never
  // matched, every console command burned its whole timeout, and the
  // caller saw a "the server did not answer" failure even though the
  // answer was there.
  //
  // So the JavaScript-only escapes are translated into the POSIX
  // classes before the pattern reaches the shell. The authoritative
  // check is still the JavaScript one below -- this is only there to
  // stop the poll early.
  const posixExpect = expect
    ? expect.replace(/\\d/g, '[0-9]').replace(/\\s/g, '[[:space:]]').replace(/\\w/g, '[A-Za-z0-9_]')
    : null;
  const script = [
    `TS=$(date -u +%Y-%m-%dT%H:%M:%S.%NZ)`,
    `printf '%s\\n' ${shellSingleQuote(cmd)} | docker exec -i ${container} sh -c 'cat > /tmp/console.pipe'`,
    `OUT=""`,
    `for i in $(seq 1 ${attempts}); do`,
    `  OUT=$(docker logs --since "$TS" ${container} 2>&1)`,
    ...(posixExpect
      ? [`  if printf '%s' "$OUT" | grep -qE ${shellSingleQuote(posixExpect)}; then break; fi`]
      : []),
    `  sleep 1`,
    `done`,
    `printf '%s' "$OUT"`,
  ].join('\n');

  const res = await ssh(host, script, timeoutMs + 10000);
  const output = res.stdout || '';
  if (opts.expect && !opts.expect.test(output)) {
    return {
      ok: false,
      output,
      reason: `the server did not answer with ${opts.expect.source} within ${timeoutMs} ms`,
    };
  }
  if (res.code !== 0 && !output) {
    return { ok: false, output, reason: `the console exchange failed: ${res.stderr.trim()}` };
  }
  return { ok: true, output };
}

/**
 * Quote a string for a POSIX shell, safely.
 */
function shellSingleQuote(s) {
  return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

/**
 * Find a player by name in the server's status output.
 *
 * `ts_status` prints one line per player:
 *
 *     [ts]  #3 PerfProbe      alive hp=100 ar=0 frags=0 ... org=(12.0 34.0 56.0)
 *
 * @param {string} output the `ts_status` answer
 * @param {string} name   the player's name
 * @returns {{index: number, origin: [number,number,number]}|null}
 */
function findPlayer(output, name) {
  for (const line of String(output || '').split('\n')) {
    // The name is a FIXED 16-column field, padded with spaces
    // (`crates/server/src/rules/commands.rs`: the name is padded to 16
    // like `{:<16}`). Reading it as a whitespace-delimited word would
    // match "PerfProbe" against a player called "PerfProbe (1)" —
    // which is exactly what the harness's own reconnects produce.
    const m = /\[ts\]\s+#(\d+)\s(.{16})\s+.*?org=\((-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\)/.exec(
      line
    );
    if (!m) continue;
    if (m[2].trim() !== name) continue;
    return {
      index: Number.parseInt(m[1], 10),
      origin: [Number.parseFloat(m[3]), Number.parseFloat(m[4]), Number.parseFloat(m[5])],
    };
  }
  return null;
}

module.exports = { serverCommand, findPlayer, ssh };
