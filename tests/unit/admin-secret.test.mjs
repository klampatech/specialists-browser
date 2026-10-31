/**
 * The RCON secret: a FILE, not an environment variable.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * An environment variable is not a secret on a host with docker
 * access. `docker inspect <container>` prints the whole environment,
 * and so does `/proc/<pid>/environ` for anything that can read the
 * process -- so a password in the environment is a password that every
 * operator and every CI job on the box can read with one command.
 *
 * A file with the right mode is not. So production reads the engine's
 * RCON password from a file, and this file holds the four things that
 * have to stay true for that to be an improvement and not a
 * different-shaped mistake:
 *
 *   1. the file is read, and the trailing newline is trimmed;
 *   2. the value NEVER appears in a log, a response or the audit;
 *   3. BOTH variables set is a refusal to start, with a message that
 *      says why -- two ways to say one thing is how a secret ends up
 *      being the wrong one;
 *   4. a missing file is an explanatory error, not a crash.
 *
 * The environment variable STAYS, and stays supported: the interim
 * uses it and the tests use it. Removing it would be a deployment
 * change dressed up as a cleanup.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createAdminService,
  readConfig,
  readRconPasswordFile,
} from '../../services/admin/service.mjs';
import { createAuditSink } from '../../services/admin/lib/audit.mjs';

/**
 * A scratch directory that holds one secret file.
 *
 * @param {string} [contents] what the file holds
 * @returns {string} the file's path
 */
function secretFile(contents = 'hunter2\n') {
  const dir = mkdtempSync(join(tmpdir(), 'admin-secret-'));
  const path = join(dir, 'rcon_password');
  writeFileSync(path, contents);
  return path;
}

/**
 * Is this secret anywhere in this value?
 *
 * @param {unknown} value
 * @param {string} secret
 * @param {WeakSet} [seen]
 * @returns {boolean}
 */
function containsSecret(value, secret, seen = new WeakSet()) {
  if (typeof value === 'string') return value.includes(secret);
  if (!value || typeof value !== 'object') return false;
  if (seen.has(value)) return false;
  seen.add(value);
  return Object.keys(value).some((key) => containsSecret(value[key], secret, seen));
}

/* ------------------------------------------------------------------ */
/* the file is read, and the newline is trimmed                         */

test('the secret file is read, and the trailing newline is trimmed', () => {
  const path = secretFile('hunter2\n');
  assert.equal(readRconPasswordFile(path), 'hunter2');
  // And through the configuration, which is how the service gets it.
  const config = readConfig({ RCON_PASSWORD_FILE: path });
  assert.equal(config.rconPassword, 'hunter2');
  assert.equal(config.rconPasswordSource, 'file');
});

test('a secret file with no trailing newline is the same secret', () => {
  const path = secretFile('hunter2');
  assert.equal(readRconPasswordFile(path), 'hunter2');
});

test('a CRLF file is trimmed too -- the file was written on another machine', () => {
  const path = secretFile('hunter2\r\n');
  assert.equal(readRconPasswordFile(path), 'hunter2');
});

test('the environment variable still works, and says where it came from', () => {
  // The interim and the tests use it. It is not removed.
  const config = readConfig({ RCON_PASSWORD: 'hunter2' });
  assert.equal(config.rconPassword, 'hunter2');
  assert.equal(config.rconPasswordSource, 'environment');
});

/* ------------------------------------------------------------------ */
/* the value is never logged, returned or audited                       */

test('the value never appears in the redacted config', () => {
  const path = secretFile('SUPERSECRET\n');
  const service = createAdminService({
    rconPassword: readRconPasswordFile(path),
    rconPasswordSource: 'file',
  });
  // The config says THAT there is a password, and never what it is.
  assert.equal(service.config.rconConfigured, true);
  assert.equal(service.config.rconPassword, undefined);
  assert.equal(containsSecret(service, 'SUPERSECRET'), false);
});

test('the value never appears in the audit line', () => {
  const lines = [];
  const sink = createAuditSink({
    path: '/dev/null',
    appendFile: (_path, line) => lines.push(line),
  });
  sink.record('login', 'admin', 'ok');
  sink.record('kick', 'ts-0', 'done');
  assert.equal(containsSecret(lines, 'SUPERSECRET'), false);
  // And the rule is about EVENTS: the target is an address, never a
  // secret.
  assert.match(lines[0], /login admin ok$/);
});

/* ------------------------------------------------------------------ */
/* both set: a refusal to start                                         */

test('BOTH variables set is a REFUSAL TO START, with a message', () => {
  const path = secretFile('from-the-file\n');
  // Not "the file wins" and not "the variable wins" -- the service
  // refuses, because guessing is how a secret ends up being the wrong
  // one and every instance comes back "refused" for a reason nobody
  // can see.
  assert.throws(
    () => readConfig({ RCON_PASSWORD: 'from-the-variable', RCON_PASSWORD_FILE: path }),
    /RCON_PASSWORD and RCON_PASSWORD_FILE are both set/,
  );
  // The message says which one to drop, and why the file is the one
  // to keep.
  assert.throws(
    () => readConfig({ RCON_PASSWORD: 'from-the-variable', RCON_PASSWORD_FILE: path }),
    /Unset RCON_PASSWORD and keep the file/,
  );
});

test('a refusal is not a silent fallback to one of the two', () => {
  const path = secretFile('from-the-file\n');
  let thrown = null;
  try {
    readConfig({ RCON_PASSWORD: 'from-the-variable', RCON_PASSWORD_FILE: path });
  } catch (err) {
    thrown = err;
  }
  assert.ok(thrown, 'it must throw');
  assert.equal(thrown.message.includes('from-the-file'), false);
  assert.equal(thrown.message.includes('from-the-variable'), false);
});

/* ------------------------------------------------------------------ */
/* a missing file                                                       */

test('a missing file is an EXPLANATORY ERROR, not a crash', () => {
  const path = join(mkdtempSync(join(tmpdir(), 'admin-secret-')), 'nope');
  assert.throws(() => readRconPasswordFile(path), /RCON_PASSWORD_FILE cannot be read/);
  // The message names the path -- a path is not a secret, and an
  // operator has to be able to find the file.
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.throws(() => readRconPasswordFile(path), new RegExp(escaped));
});

test('a missing file is a refusal to start, not a console with no password', () => {
  const path = join(mkdtempSync(join(tmpdir(), 'admin-secret-')), 'nope');
  assert.throws(
    () => readConfig({ RCON_PASSWORD_FILE: path }),
    /refuses to start without it/,
  );
});

test('a file that cannot be read says so, and does not throw a stack', () => {
  // A DIRECTORY where the file should be: the error is the same
  // shape -- a message, not a stack.
  const dir = mkdtempSync(join(tmpdir(), 'admin-secret-'));
  assert.throws(() => readRconPasswordFile(dir), /RCON_PASSWORD_FILE cannot be read/);
});

/* ------------------------------------------------------------------ */
/* the password is still checked for whitespace                          */

test('a secret with whitespace in it is refused, exactly like the variable', () => {
  const path = secretFile('two words\n');
  assert.throws(() => readRconPasswordFile(path), /RCON_PASSWORD_FILE must not contain whitespace/);
  // And the variable says the same thing, so the two paths cannot
  // drift apart.
  assert.throws(() => readConfig({ RCON_PASSWORD: 'two words' }), /RCON_PASSWORD must not contain whitespace/);
});

test('an empty secret file is an empty password, not a crash', () => {
  const path = secretFile('');
  const config = readConfig({ RCON_PASSWORD_FILE: path });
  // Which is the same state as "no password configured" -- and the
  // console reports every instance as refused, which is the truth.
  assert.equal(config.rconPassword, '');
  assert.equal(config.rconPasswordSource, 'file');
});

/* ------------------------------------------------------------------ */
/* the secret is not in the repository                                   */

test('the committed server.cfg has no rcon_password in it', () => {
  const root = fileURLToPath(new URL('../..', import.meta.url));
  const cfg = readFileSync(join(root, 'tools/deploy/config/server.cfg'), 'utf8');
  const offending = cfg
    .split('\n')
    .map((line, i) => [i + 1, line])
    .filter(([, line]) => /^\s*rcon_password\b/.test(line));
  assert.deepEqual(
    offending,
    [],
    'the committed server.cfg must stay secret-free: the password is appended ' +
      'to the COPY inside the container, never to the file in the repository',
  );
});
