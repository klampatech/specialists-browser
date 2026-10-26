/**
 * Log rotation, and the path that delivers it.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * Every container on the production host logs through docker's
 * `json-file` driver, and the default for that driver is ONE file with
 * NO size limit. The game server's log grew at 268 bytes/second
 * (measured on production 2026-10-26 — ~22 MB/day from one instance)
 * and nothing ever rotated it.
 *
 * The obvious fix is `--log-opt max-size` / `--log-opt max-file` on
 * the `docker run` that creates the container. That part is easy, and it
 * is what the first half of this test checks.
 *
 * The part that is NOT easy is that the fix has to REACH PRODUCTION.
 * There are two containers created by two scripts, and both of them had
 * a delivery problem:
 *
 *   1. `run-instance.sh` — the script that creates the GAME servers —
 *      was not shipped by the deploy AT ALL. Only `deploy-services.sh`
 *      was scp'd to the host, so the game server's definition had to be
 *      copied by hand. A fix to it could be merged, reviewed, CI-green
 *      and still never touch a running container.
 *
 *   2. Neither script was classified as a "services" change by
 *      `changed-paths.cjs`, so a change to either one did not even
 *      trigger the control-plane deploy that would have shipped it.
 *
 * Both are invisible in a review — the diff looks right, CI is green,
 * and production keeps doing the old thing. A test that only checked
 * the flags would have passed while the fix was inert.
 *
 * WHAT IS ACTUALLY ASSERTED
 * -------------------------
 *   - both container-creating scripts pass bounded log options
 *   - neither can drift: they must use the SAME limit
 *   - the limit is actually a limit (parsed, not just present)
 *   - the deploy SHIPS run-instance.sh
 *   - the deploy RECREATES the orchestrator after shipping it, because
 *     a bind mount pins the inode and a replaced file is invisible
 *     inside the running container (measured 2026-10-26)
 *   - a change to either script is classified as a services change
 *   - the shell scripts are syntax-checked by CI
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { classifyChanges } from '../../tools/deploy/changed-paths.cjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RUN_INSTANCE = join(ROOT, 'tools', 'deploy', 'run-instance.sh');
const DEPLOY_SERVICES = join(ROOT, 'tools', 'deploy', 'deploy-services.sh');
const DEPLOY_YML = join(ROOT, '.github', 'workflows', 'deploy.yml');
const CI_YML = join(ROOT, '.github', 'workflows', 'ci.yml');

const runInstance = readFileSync(RUN_INSTANCE, 'utf8');
const deployServices = readFileSync(DEPLOY_SERVICES, 'utf8');
const deployYml = readFileSync(DEPLOY_YML, 'utf8');
const ciYml = readFileSync(CI_YML, 'utf8');

/**
 * The size limit the script asks docker for, in bytes.
 *
 * `10m` is the form docker accepts. This parses it so the test asserts
 * a BOUND rather than the presence of a flag — a script that passed
 * `--log-opt max-size=0` would be "rotating" in name only.
 */
function parseLogMaxSize(src) {
  const m = src.match(/LOG_MAX_SIZE="\$\{TS_LOG_MAX_SIZE:-([0-9]+[kKmMgG]?)\}"/);
  assert.ok(m, 'the script must define LOG_MAX_SIZE with a default');
  const raw = m[1];
  const unit = raw.slice(-1).toLowerCase();
  const n = Number(unit ? raw.slice(0, -1) : raw);
  const mult = { k: 1024, m: 1024 * 1024, g: 1024 * 1024 * 1024 }[unit] ?? 1;
  return n * mult;
}

test('the game server container rotates its log', () => {
  // The game server is created by run-instance.sh.
  assert.match(
    runInstance,
    /--log-driver json-file/,
    'run-instance.sh must set the log driver explicitly',
  );
  assert.match(
    runInstance,
    /--log-opt max-size="\$LOG_MAX_SIZE"/,
    'run-instance.sh must pass a bounded max-size',
  );
  assert.match(
    runInstance,
    /--log-opt max-file="\$LOG_MAX_FILE"/,
    'run-instance.sh must bound the number of files too',
  );
});

test('the control-plane containers rotate their logs', () => {
  assert.match(
    deployServices,
    /--log-driver json-file/,
    'deploy-services.sh must set the log driver explicitly',
  );
  assert.match(
    deployServices,
    /--log-opt max-size="\$LOG_MAX_SIZE"/,
    'deploy-services.sh must pass a bounded max-size',
  );
  assert.match(
    deployServices,
    /--log-opt max-file="\$LOG_MAX_FILE"/,
    'deploy-services.sh must bound the number of files too',
  );
});

test('the limit is a real limit, and the two scripts agree on it', () => {
  const game = parseLogMaxSize(runInstance);
  const control = parseLogMaxSize(deployServices);
  assert.equal(
    game,
    control,
    'the game server and the control plane must use the same limit — ' +
      'a rule that lives in one script and not the other is half-applied',
  );
  assert.ok(game > 0, 'the limit must be positive');
  // 10 MB x 3 files = 30 MB per container. Eight instances must not be
  // able to fill the 38 GB disk, and a day of history must survive.
  assert.ok(
    game <= 64 * 1024 * 1024,
    `the per-file limit (${game} bytes) is larger than 64 MB — the disk is 38 GB`,
  );
});

test('the number of files is bounded', () => {
  for (const [name, src] of [
    ['run-instance.sh', runInstance],
    ['deploy-services.sh', deployServices],
  ]) {
    const m = src.match(/LOG_MAX_FILE="\$\{TS_LOG_MAX_FILE:-([0-9]+)\}"/);
    assert.ok(m, `${name} must define LOG_MAX_FILE with a default`);
    const n = Number(m[1]);
    assert.ok(n >= 2, `${name}: one file is not rotation, it is just a log`);
    assert.ok(n <= 10, `${name}: ${n} files of 10 MB is a lot of disk`);
  }
});

test('the deploy SHIPS the script that creates the game servers', () => {
  // THE DELIVERY BUG. `run-instance.sh` was never scp'd to the host, so
  // the game server's definition was a file that had to be copied by
  // hand — and a change to it could never reach production.
  assert.match(
    deployYml,
    /scp[^\n]*run-instance\.sh[^\n]*prod:/,
    'the deploy must ship run-instance.sh to the host',
  );
});

test('the deploy recreates the orchestrator after shipping the script', () => {
  // The orchestrator bind-mounts run-instance.sh from the host. A bind
  // mount pins the INODE, so replacing the file on the host is NOT
  // visible inside the running container (measured 2026-10-26) — the
  // orchestrator would keep running the OLD script. It only picks the
  // new one up when the container is recreated, and the mount is redone.
  //
  // So the order in the deploy has to be: ship, then recreate.
  const ship = deployYml.indexOf('run-instance.sh prod:');
  // The INVOCATION of the script, not the scp of it: the scp line also
  // contains the path, and matching that would compare two scp lines.
  const invoke = deployYml.search(/^\s*\/home\/ubuntu\/deploy-services\.sh\s*$/m);
  assert.ok(ship > 0, 'run-instance.sh must be shipped');
  assert.ok(invoke > 0, 'deploy-services.sh must be run on the host');
  assert.ok(
    ship < invoke,
    'the script must be shipped BEFORE the control plane is recreated',
  );
  // The recreate is what re-does the bind mount.
  assert.match(
    deployServices,
    /replace orchestrator/,
    'the orchestrator must be recreated so the new bind mount is made',
  );
});

test('a change to either container-creating script triggers the services deploy', () => {
  // Without this, a fix to the container definition is merged, reviewed
  // and CI-green, and then never shipped: the deploy does not even
  // rebuild the control plane.
  for (const p of [
    'tools/deploy/run-instance.sh',
    'tools/deploy/deploy-services.sh',
  ]) {
    const r = classifyChanges({ parentPaths: [p] });
    assert.equal(
      r.services,
      true,
      `a change to ${p} must trigger the services deploy — it is how ` +
        'every container on the host is created',
    );
  }
});

test('CI syntax-checks the shell scripts', () => {
  // The shell scripts are what create every container on the host, and
  // the syntax-check step only looked for .mjs and .cjs. A syntax error
  // in run-instance.sh means no game server can start, and CI said
  // nothing.
  assert.match(
    ciYml,
    /bash -n/,
    'CI must syntax-check the shell scripts',
  );
  assert.match(
    ciYml,
    /-name '\*\.sh'/,
    'the shell syntax check must actually find the .sh files',
  );
});
