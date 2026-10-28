/**
 * The kill log's on/off state.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * The leaderboard reads the engine's kill log, and the engine only
 * writes that log when its logging is ON. In server.cfg the setting is
 * a COMMAND — `log on` — and `log 1` is a command with an argument the
 * engine does not understand, so it does nothing.
 *
 * It reads like it should work. It sat in server.cfg looking correct,
 * and the leaderboard shipped with a kill log that was silently off.
 * Measured on production, 2026-10-27: a container restart at 16:24:55
 * stopped the kill lines dead, and they did not come back on their own.
 *
 * So the registry asks the engine, and this test holds the line on
 * reading the answer.
 *
 * WHAT IS ACTUALLY ASSERTED
 * -------------------------
 *   - the engine's "not currently logging" reply reads as OFF
 *   - the engine's "currently logging" reply reads as ON
 *   - a reply that says neither reads as null (NOT as off — a missing
 *     answer is not evidence, and acting on it would flip the setting
 *     on a server that never answered)
 *   - the substring trap: "not currently logging" CONTAINS "currently
 *     logging", so a naive search would report ON for both replies
 *   - the reply is found AFTER the marker, so a stale "currently
 *     logging" from an earlier poll cannot be mistaken for this one
 *   - the service actually ASKS the engine rather than guessing from
 *     an empty kill log, and turns it on when the answer is off
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { LOG_OFF, LOG_ON, parseLogState } from '../../services/registry/lib/log-state.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SERVICE = readFileSync(join(ROOT, 'services', 'registry', 'service.mjs'), 'utf8');
const SERVER_CFG = readFileSync(join(ROOT, 'tools', 'deploy', 'config', 'server.cfg'), 'utf8');

test('the engine saying "not currently logging" means OFF', () => {
  // Measured on production, 2026-10-27, from a probe container:
  //   [20:30:17] TSREGprobe2
  //   [20:30:17] Usage: log < on|off >
  //   [20:30:17] not currently logging
  const state = parseLogState(
    'Usage: log < on|off >\nnot currently logging\n',
  );
  assert.equal(state, LOG_OFF, 'the engine said it is not logging, so it is off');
});

test('the engine saying "currently logging" means ON', () => {
  // Measured on production, 2026-10-27, from the live server:
  //   [20:28:35] Usage: log < on|off >
  //   [20:28:35] currently logging
  const state = parseLogState(
    'Usage: log < on|off >\ncurrently logging\n',
  );
  assert.equal(state, LOG_ON, 'the engine said it is logging, so it is on');
});

test('the substring trap: "not currently logging" is not "currently logging"', () => {
  // THIS IS THE WHOLE POINT. "not currently logging" contains the
  // substring "currently logging", so a naive
  // /currently logging/.test(text) returns TRUE for the OFF reply —
  // and the registry would then believe every server was logging, and
  // never turn the log on for the one that was not.
  assert.ok(
    'not currently logging'.includes('currently logging'),
    'the trap must still be real, or this test is not testing anything',
  );
  assert.equal(parseLogState('not currently logging'), LOG_OFF);
  assert.equal(parseLogState('currently logging'), LOG_ON);
});

test('a reply that says neither is null, not off', () => {
  // A missing answer is not evidence. If the engine did not answer,
  // the caller must not conclude the log is off and go turning it on
  // on a server that is merely unreachable.
  assert.equal(parseLogState('Usage: log < on|off >\n'), null);
  assert.equal(parseLogState(''), null);
  assert.equal(parseLogState(null), null);
  assert.equal(parseLogState(undefined), null);
  assert.equal(
    parseLogState('some unrelated engine output\n'),
    null,
    'unrelated output must not be read as a state',
  );
});

test('the state is read from AFTER the marker', () => {
  // The log is a rolling window, so a "currently logging" from an
  // earlier poll is still in the text. Reading the whole text would
  // let a stale ON answer mask a fresh OFF one — which is exactly the
  // failure that leaves the kill log off forever.
  const text = [
    '[19:00:00] Usage: log < on|off >',
    '[19:00:00] currently logging',
    '[19:10:00] TSREGmarker',
    '[19:10:00] Usage: log < on|off >',
    '[19:10:00] not currently logging',
  ].join('\n');
  const at = text.indexOf('TSREGmarker');
  assert.ok(at > 0, 'the marker must be in the text');
  const after = text.slice(at + 'TSREGmarker'.length);
  assert.equal(
    parseLogState(after),
    LOG_OFF,
    'the fresh OFF answer after the marker must win over the stale ON',
  );
  // And the whole text still contains the stale ON — which is exactly
  // why the marker has to be used.
  assert.ok(text.includes('currently logging'));
});

test('server.cfg turns the kill log ON', () => {
  // `log 1` is a command with an argument the engine does not
  // understand, so it does NOTHING — it does not turn the log on, and
  // it does not turn it off either. It reads like it should work.
  assert.match(
    SERVER_CFG,
    /^\s*log on\s*$/m,
    'server.cfg must contain the `log on` command',
  );
  assert.doesNotMatch(
    SERVER_CFG,
    /^\s*log 1\s*$/m,
    'server.cfg must not contain `log 1` — it does nothing at all',
  );
});

test('the registry asks the engine, and turns the log on when it is off', () => {
  assert.match(
    SERVICE,
    /import \{[^}]*parseLogState[^}]*\} from '\.\/lib\/log-state\.mjs'/,
    'the registry must import the state parser',
  );
  // It asks with the `log` command over the console pipe.
  assert.match(
    SERVICE,
    /consoleWrite\(container, 'log'\)/,
    'the registry must ask the engine for its logging state',
  );
  // And it turns it on with the command that works.
  assert.match(
    SERVICE,
    /consoleWrite\(container, 'log on'\)/,
    'the registry must be able to turn the kill log on',
  );
});

test('the registry does not guess from an empty kill log', () => {
  // Turning the log on because the kill log is empty would be wrong:
  // a quiet server legitimately has no kills. The engine is asked, so
  // the question is answered by the thing that knows.
  assert.doesNotMatch(
    SERVICE,
    /if \(!log\.includes\('killed "'\)\) \{\s*await consoleWrite\(instance\.container, 'log on'\)/,
    'the registry must not turn the log on just because the kill log is empty',
  );
});

test('the registry does not INFER the log state from the kill log', () => {
  // THE SUBTLE ONE.
  //
  // `docker restart` keeps the container and its log FILE, so the kill
  // lines from before the restart are still in the tail the registry
  // reads. A check of the form "the tail has kill lines, so logging
  // is on" would therefore keep reporting ON forever after a restart
  // — while the engine, restarted with its config re-read, writes
  // nothing. That is exactly how the kill log stayed dead on
  // production after the 16:24:55 restart.
  //
  // So the state comes ONLY from the engine, and the cache is
  // re-checked on a timer rather than from the kill log.
  assert.doesNotMatch(
    SERVICE,
    /log\.includes\('killed "'\)/,
    'the log state must not be derived from the kill log contents',
  );
  assert.match(
    SERVICE,
    /LOG_CHECK_MS/,
    'the engine must be re-asked on a timer, so a restart is caught',
  );
});

test('the kill-log state module is in the registry image', () => {
  // A module that is imported but not COPYed into the image is a
  // module that fails at runtime — and the registry container is
  // replaced by the deploy, so it fails in production and nowhere
  // else. This exact bug happened with the leaderboard's own modules
  // (commit 514934a), and AGAIN with console-ask.mjs on 2026-10-28.
  //
  // The whole lib/ directory is copied now, so the module is in the
  // image because its directory is. The general guard for both
  // services — every module imported, every module copied, every
  // module allowed by the .dockerignore — is
  // tests/unit/service-image-files.test.mjs.
  const dockerfile = readFileSync(
    join(ROOT, 'services', 'registry', 'Dockerfile.registry'),
    'utf8',
  );
  assert.match(
    dockerfile,
    /COPY services\/registry\/lib\//,
    'the registry image must copy the whole lib/ directory',
  );
});

test('every module the registry copies is also ALLOWED by the dockerignore', () => {
  // The build context is allowlisted: `.dockerignore` starts with `**`
  // (everything excluded) and then re-includes each file the image
  // needs. So a module that is COPYed but not re-included is NOT IN
  // THE IMAGE — and the build fails with a checksum error.
  //
  // That is not hypothetical: this exact omission shipped once
  // already (the leaderboard's own modules, commit 514934a), and it
  // happened AGAIN with the log-state module — the Dockerfile copied
  // it, the allowlist did not, and the Docker build failed.
  //
  // The two lists are kept in step HERE, so the next module added
  // cannot be silently left out.
  const dockerfile = readFileSync(
    join(ROOT, 'services', 'registry', 'Dockerfile.registry'),
    'utf8',
  );
  const dockerignore = readFileSync(
    join(ROOT, 'services', 'registry', 'Dockerfile.registry.dockerignore'),
    'utf8',
  );

  // Every path the Dockerfile copies out of the repo.
  const copied = [...dockerfile.matchAll(/^COPY\s+(\S+)\s+\S+$/gm)].map((m) => m[1]);
  assert.ok(
    copied.includes('services/registry/lib/'),
    'the Dockerfile should copy the lib/ directory',
  );

  // Every path the allowlist re-includes.
  const allowed = new Set(
    [...dockerignore.matchAll(/^!(\S+)$/gm)].map((m) => m[1]),
  );

  const missing = copied.filter((p) => !allowed.has(p));
  assert.deepEqual(
    missing,
    [],
    `these files are COPYed into the registry image but not allowed by ` +
      'Dockerfile.registry.dockerignore, so the build will fail: ' +
      missing.join(', '),
  );
});
