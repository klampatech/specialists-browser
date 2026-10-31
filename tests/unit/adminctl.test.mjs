/**
 * adminctl: the password, hashed and set by hand.
 *
 * THE CLI IS RUN AS A CHILD PROCESS
 * ---------------------------------
 * Not because the functions are hard to call — they are not — but
 * because the things that matter here are about the PROCESS: the
 * password comes from stdin and not from argv, `--help` works without
 * one, and the exit code says what happened.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkRecord, createAuthStore, createPasswordRecord } from '../../services/admin/lib/auth.mjs';
import { createAdminService } from '../../services/admin/service.mjs';
import { checkWriteTarget } from '../../services/admin/adminctl.mjs';

const CLI = fileURLToPath(new URL('../../services/admin/adminctl.mjs', import.meta.url));

/**
 * Run the CLI.
 *
 * @param {string[]} args
 * @param {string} [input] what is on stdin
 * @returns {{status: number, stdout: string, stderr: string}}
 */
function run(args, input = '') {
  const res = spawnSync(process.execPath, [CLI, ...args], {
    input,
    encoding: 'utf8',
  });
  return { status: res.status, stdout: res.stdout ?? '', stderr: res.stderr ?? '' };
}

/**
 * A scratch directory the CLI may write into.
 *
 * @returns {string}
 */
function scratch() {
  return mkdtempSync(join(tmpdir(), 'adminctl-'));
}

test('hash prints one line of JSON', () => {
  const res = run(['hash'], 'hunter2\n');
  assert.equal(res.status, 0);
  assert.equal(res.stdout.trim().split('\n').length, 1);
  const record = JSON.parse(res.stdout);
  assert.deepEqual(checkRecord(record), { ok: true, reason: '' });
  assert.equal(record.algo, 'scrypt');
});

test('hash reads the password from stdin, and never from argv', () => {
  // A password in argv is in `ps` output and in the shell history, so
  // the CLI does not take one.
  const res = run(['hash', 'hunter2'], '');
  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /unknown command|unknown argument/);
  assert.equal(res.stdout.includes('"hash"'), false);
});

test('hash refuses an empty password', () => {
  const res = run(['hash'], '\n');
  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /must not be empty/);
});

test('--help works, and needs no password', () => {
  const res = run(['--help']);
  assert.equal(res.status, 0);
  assert.match(res.stdout, /adminctl hash/);
  assert.match(res.stdout, /adminctl set-password/);
  // And it says why the password is not an argument.
  assert.match(res.stdout, /never read from the command line/i);
});

test('set-password writes the record, 0600', () => {
  const dir = scratch();
  const path = join(dir, 'auth.json');
  const record = JSON.stringify(createPasswordRecord('hunter2'));
  const res = run(['set-password', '--path', path], `${record}\n`);
  assert.equal(res.status, 0);
  assert.match(res.stdout, /wrote /);
  assert.equal(statSync(path).mode & 0o777, 0o600);
  assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')), JSON.parse(record));
});

test('set-password refuses a malformed record, and leaves the file alone', () => {
  const dir = scratch();
  const path = join(dir, 'auth.json');
  const good = JSON.stringify(createPasswordRecord('hunter2'));
  writeFileSync(path, good);

  const malformed = [
    'not json at all',
    JSON.stringify({ algo: 'bcrypt', version: 1 }),
    JSON.stringify({ ...JSON.parse(good), N: 32768 }),
    JSON.stringify({ ...JSON.parse(good), salt: 'ab' }),
    JSON.stringify({ ...JSON.parse(good), hash: 'zz' }),
    '',
  ];
  for (const input of malformed) {
    const res = run(['set-password', '--path', path], input);
    assert.notEqual(res.status, 0, `the record ${input} must be refused`);
    // And the file is exactly as it was.
    assert.equal(readFileSync(path, 'utf8').trim(), good);
  }
});

test('set-password refuses a directory that does not exist', () => {
  const dir = scratch();
  const path = join(dir, 'nope', 'auth.json');
  const res = run(['set-password', '--path', path], JSON.stringify(createPasswordRecord('hunter2')));
  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /does not exist/);
});

test('the write refuses to run as root, and refuses a directory it does not own', () => {
  const dir = scratch();
  // Root: refused, whatever the directory is.
  assert.throws(() => checkWriteTarget(join(dir, 'auth.json'), { uid: 0 }), /root/);
  // Another uid: the directory is not ours to write into.
  const owner = statSync(dir).uid;
  assert.throws(
    () => checkWriteTarget(join(dir, 'auth.json'), { uid: owner + 1 }),
    /owned by uid/,
  );
  // Our own directory: fine.
  assert.equal(checkWriteTarget(join(dir, 'auth.json'), { uid: owner }), dir);
});

test('hash and set-password round trip, and the service logs in with it', async () => {
  const dir = scratch();
  const path = join(dir, 'auth.json');
  const password = 'a-long-passphrase with spaces';

  const hashed = run(['hash'], `${password}\n`);
  assert.equal(hashed.status, 0);
  const written = run(['set-password', '--path', path], hashed.stdout);
  assert.equal(written.status, 0);

  // The service reads the file the CLI wrote, and logs in with the
  // password that was hashed.
  const service = createAdminService({
    port: 0,
    count: 1,
    auth: createAuthStore({ path }),
  });
  await new Promise((resolve) => service.server.listen(0, '127.0.0.1', resolve));
  try {
    const port = service.server.address().port;
    const res = await fetch(`http://127.0.0.1:${port}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    // And the wrong password does not.
    const wrong = await fetch(`http://127.0.0.1:${port}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: `${password}x` }),
    });
    assert.equal(wrong.status, 401);
  } finally {
    await new Promise((resolve) => service.server.close(resolve));
  }
});

test('the file the CLI writes is read back by the store', () => {
  const dir = scratch();
  const path = join(dir, 'auth.json');
  const record = createPasswordRecord('hunter2');
  run(['set-password', '--path', path], JSON.stringify(record));
  const store = createAuthStore({ path });
  assert.deepEqual(store.load(), record);
});
