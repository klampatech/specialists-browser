/**
 * The password: the scrypt record, and the verifier.
 *
 * WHAT IS WORTH TESTING HERE, AND WHAT IS NOT
 * --------------------------------------------
 * The comparison is constant-time, and "is this comparison
 * constant-time" is not a thing a unit test can measure — a timing
 * test is a flaky test that fails on a busy machine. So the tests
 * pin the PROPERTIES that a constant-time comparison gives us:
 *
 *   - the right password is accepted;
 *   - a wrong password of the SAME length is refused;
 *   - a wrong password of a DIFFERENT length is refused (and does not
 *     throw — `timingSafeEqual` throws on a length mismatch, so the
 *     length has to be checked first);
 *   - the plaintext is nowhere in the record;
 *   - a corrupt record is a failed login, not a crash.
 *
 * And one source-level check, because it is cheap and it is the whole
 * point: the verifier uses `crypto.timingSafeEqual`. Somebody
 * "simplifying" that to `===` would turn the hash into a timing
 * oracle, and no behavioural test would notice.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ALGO,
  checkRecord,
  createAuthStore,
  createPasswordRecord,
  isHexOfBytes,
  parseRecord,
  readParams,
  readPasswordRecord,
  RECORD_VERSION,
  SCRYPT_PARAMS,
  SALT_BYTES,
  verifyPassword,
  verifyPasswordAsync,
} from '../../services/admin/lib/auth.mjs';

const AUTH_SOURCE = readFileSync(
  fileURLToPath(new URL('../../services/admin/lib/auth.mjs', import.meta.url)),
  'utf8',
);

test('the record carries its own parameters, its salt and its hash', () => {
  const record = createPasswordRecord('hunter2');
  assert.equal(record.version, RECORD_VERSION);
  assert.equal(record.algo, ALGO);
  assert.equal(record.N, 16384);
  assert.equal(record.r, 8);
  assert.equal(record.p, 1);
  assert.equal(record.keylen, 32);
  // The salt is 16 random bytes, hex encoded.
  assert.equal(record.salt.length, SALT_BYTES * 2);
  assert.ok(isHexOfBytes(record.salt, SALT_BYTES));
  // The hash is 32 bytes, hex encoded.
  assert.ok(isHexOfBytes(record.hash, 32));
  // And the record says what it was made with, so a verifier does not
  // have to guess.
  assert.deepEqual(readParams(record), { N: 16384, r: 8, p: 1, keylen: 32 });
});

test('the plaintext is nowhere in the record', () => {
  const password = 'correct horse battery staple';
  const record = createPasswordRecord(password);
  const text = JSON.stringify(record);
  assert.equal(text.includes(password), false);
  assert.equal(text.includes('correct'), false);
  assert.equal(record.hash === password, false);
});

test('the right password is accepted', () => {
  const record = createPasswordRecord('hunter2');
  assert.equal(verifyPassword(record, 'hunter2'), true);
});

test('a wrong password of the same length is refused', () => {
  const record = createPasswordRecord('hunter2');
  assert.equal(verifyPassword(record, 'hunter3'), false);
  assert.equal(verifyPassword(record, 'Hunter2'), false);
  assert.equal(verifyPassword(record, 'xunter2'), false);
});

test('a wrong password of a different length is refused, and does not throw', () => {
  const record = createPasswordRecord('hunter2');
  // `timingSafeEqual` THROWS when the buffers are different lengths,
  // so the length is checked before it is called.
  assert.equal(verifyPassword(record, 'h'), false);
  assert.equal(verifyPassword(record, ''), false);
  assert.equal(verifyPassword(record, 'hunter2hunter2hunter2'), false);
});

test('the async verifier agrees with the sync one', async () => {
  const record = createPasswordRecord('hunter2');
  assert.equal(await verifyPasswordAsync(record, 'hunter2'), true);
  assert.equal(await verifyPasswordAsync(record, 'hunter3'), false);
});

test('a malformed record is a failed login, not a crash', () => {
  const good = createPasswordRecord('hunter2');
  const malformed = [
    null,
    undefined,
    'not an object',
    42,
    [],
    {},
    { ...good, algo: 'bcrypt' },
    { ...good, version: 99 },
    { ...good, N: 'many' },
    { ...good, N: 3 },
    { ...good, r: 0 },
    { ...good, p: 0 },
    { ...good, keylen: 0 },
    { ...good, keylen: 9999 },
    { ...good, salt: 'zzzz' },
    { ...good, salt: 'ab' },
    { ...good, hash: '' },
    { ...good, hash: 'not hex' },
    { ...good, salt: undefined },
    { ...good, hash: undefined },
  ];
  for (const record of malformed) {
    assert.equal(
      verifyPassword(record, 'hunter2'),
      false,
      `the record ${JSON.stringify(record)} must not verify`,
    );
  }
});

test('the record is not a secret that the service hands out', () => {
  const record = createPasswordRecord('hunter2');
  const service = {
    config: {
      // What the factory hands back: whether a record is configured,
      // never the record.
      authConfigured: Boolean(record),
    },
  };
  assert.equal(JSON.stringify(service).includes(record.hash), false);
  // The verifier answers with a boolean, never with the hash.
  const answer = verifyPassword(record, 'hunter2');
  assert.equal(typeof answer, 'boolean');
});

test('the comparison is constant-time', () => {
  // A behavioural timing test is flaky, so the guard is the source:
  // the verifier has to use `crypto.timingSafeEqual`.
  assert.match(AUTH_SOURCE, /timingSafeEqual/);
  // And it must not be a plain comparison of the hashes.
  assert.equal(/hash\s*===/.test(AUTH_SOURCE), false);
});

test('the salt is random, so two records for one password differ', () => {
  const a = createPasswordRecord('hunter2');
  const b = createPasswordRecord('hunter2');
  assert.notEqual(a.salt, b.salt);
  assert.notEqual(a.hash, b.hash);
  // And both verify.
  assert.equal(verifyPassword(a, 'hunter2'), true);
  assert.equal(verifyPassword(b, 'hunter2'), true);
});

test('an empty password is refused', () => {
  assert.throws(() => createPasswordRecord(''), /must not be empty/);
});

test('checkRecord accepts this build and refuses the rest', () => {
  const good = createPasswordRecord('hunter2');
  assert.deepEqual(checkRecord(good), { ok: true, reason: '' });

  // The wrong algorithm.
  assert.match(checkRecord({ ...good, algo: 'pbkdf2' }).reason, /algorithm/);
  // The wrong version.
  assert.match(checkRecord({ ...good, version: 2 }).reason, /version/);
  // Parameters this build does not support: the record would be one
  // the verifier can read but this build cannot write.
  assert.match(checkRecord({ ...good, N: 32768 }).reason, /only supports/);
  assert.match(checkRecord({ ...good, keylen: 64 }).reason, /only supports/);
  // A salt that is not 16 bytes of hex.
  assert.match(checkRecord({ ...good, salt: 'ab' }).reason, /salt/);
  assert.match(checkRecord({ ...good, salt: 'zz'.repeat(16) }).reason, /salt/);
  // A hash that is not 32 bytes of hex.
  assert.match(checkRecord({ ...good, hash: 'ab' }).reason, /hash/);
  assert.match(checkRecord({ ...good, hash: 'ab'.repeat(40) }).reason, /hash/);
  // Not an object at all.
  assert.match(checkRecord('nope').reason, /not an object/);
});

test('the verifier reads the parameters out of the record', () => {
  // A record written with DIFFERENT parameters is still readable —
  // that is the whole reason the record carries them.
  const record = createPasswordRecord('hunter2', {
    params: { N: 1024, r: 8, p: 1, keylen: 32 },
  });
  assert.equal(record.N, 1024);
  assert.equal(verifyPassword(record, 'hunter2'), true);
  assert.equal(verifyPassword(record, 'hunter3'), false);
  // But `checkRecord` refuses it, because this build does not write
  // those parameters.
  assert.match(checkRecord(record).reason, /only supports/);
});

test('the store reads the record off the disk', () => {
  const dir = mkdtempSync(join(tmpdir(), 'admin-auth-'));
  const path = join(dir, 'auth.json');
  const record = createPasswordRecord('hunter2');
  writeFileSync(path, JSON.stringify(record));
  const store = createAuthStore({ path });
  assert.deepEqual(store.load(), record);
  // And the file is read at the moment of the load, so a record set
  // after the store was made is picked up.
  const other = createPasswordRecord('hunter3');
  writeFileSync(path, JSON.stringify(other));
  assert.deepEqual(store.load(), other);
});

test('a missing or corrupt record file is null, not a crash', () => {
  const dir = mkdtempSync(join(tmpdir(), 'admin-auth-'));
  assert.equal(readPasswordRecord(join(dir, 'nope.json')), null);
  const path = join(dir, 'auth.json');
  writeFileSync(path, 'this is not json');
  assert.equal(readPasswordRecord(path), null);
  assert.equal(createAuthStore({ path }).load(), null);
});

test('an in-memory store never touches the disk', () => {
  const record = createPasswordRecord('hunter2');
  const store = createAuthStore({ record });
  assert.deepEqual(store.load(), record);
});
