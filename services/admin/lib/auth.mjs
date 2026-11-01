/**
 * admin — the password: one scrypt hash, and the verifier.
 *
 * ONE PASSWORD, NO USERNAME
 * --------------------------
 * There is one administrator, so there is one secret. A username box
 * would imply a multi-user system that does not exist, and it would
 * imply a "wrong user" answer that tells a guesser something they
 * already know.
 *
 * THIS IS THE ADMINISTRATOR'S PASSWORD, NOT THE ENGINE'S
 * ------------------------------------------------------
 * There are two passwords on this service, and they have nothing to
 * do with each other:
 *
 *   - the RCON password is the ENGINE's. It has to be a plaintext
 *     string at runtime, because the engine compares it on the wire.
 *     It is `rconPassword` in the factory and `RCON_PASSWORD` in the
 *     environment.
 *   - the ADMIN password is this one. It is never a plaintext string
 *     anywhere: it is a scrypt record on disk, handed to the service
 *     as `auth` (a record or a store) and named `ADMIN_AUTH_FILE` in
 *     the environment.
 *
 * They must never be swapped, and the names are what keeps them
 * apart: the one that is a string is named after the thing it is,
 * and the one that is a record is not called `password` at all.
 *
 * THE PLAINTEXT NEVER TOUCHES THE DISK
 * ------------------------------------
 * The record on the host is a scrypt hash with a per-password salt.
 * The plaintext exists in two places only: the moment the
 * administrator types it into `adminctl hash`, and the moment it is
 * compared against the hash at login. Everywhere else it is a Buffer
 * that gets thrown away.
 *
 * THE HASH IS A RECORD, NOT A STRING
 * ----------------------------------
 * The stored record carries the parameters it was made with:
 *
 *   {version, algo, N, r, p, keylen, salt, hash}
 *
 * A verifier that hard-codes N, r and p cannot read a hash written
 * with different ones — and a hash file that does not carry its own
 * parameters cannot be migrated to a stronger setting without
 * re-provisioning every password. So the record says what it was made
 * with, and the verifier reads them from the record.
 *
 * (`adminctl set-password` is stricter on purpose: it only writes the
 * parameters THIS build supports, because a record it cannot verify
 * is a record it should not put on the host.)
 *
 * THE COMPARISON IS CONSTANT-TIME
 * -------------------------------
 * `===` on a hash is a timing oracle: an attacker who can measure how
 * long a comparison takes learns how many leading bytes matched.
 * `crypto.timingSafeEqual` compares the whole buffer without an early
 * exit — but it THROWS when the lengths differ, so the lengths are
 * checked first (the length of a hash is public; the length of the
 * candidate is not).
 *
 * A CORRUPT RECORD FAILS THE LOGIN, NOT THE SERVICE
 * --------------------------------------------------
 * The auth file is on a disk. A disk file can be truncated, edited by
 * hand, or written by a build with different parameters. A verifier
 * that throws on a malformed record turns a bad file into a service
 * that answers 500 to every login — and the administrator's way back
 * in is to fix the file, which they cannot do while it is 500ing.
 * So the verifier returns false for anything it cannot read, and it
 * spends the same work doing it, so a corrupt file is not even a
 * timing oracle.
 */

import { randomBytes, scrypt, scryptSync, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';

/** The algorithm this build writes. */
export const ALGO = 'scrypt';

/** The record format this build writes. */
export const RECORD_VERSION = 1;

/** The scrypt parameters this build writes. */
export const SCRYPT_PARAMS = Object.freeze({
  N: 16384,
  r: 8,
  p: 1,
  keylen: 32,
});

/** The salt length, in bytes — 16 bytes of randomness per password. */
export const SALT_BYTES = 16;

/** Where the record lives on the host. */
export const DEFAULT_AUTH_FILE = '/srv/ts-admin/auth.json';

/** A hex string, and nothing else. */
const HEX = /^[0-9a-f]+$/;

/**
 * The memory ceiling scrypt is given.
 *
 * scrypt needs about `128 * N * r` bytes of memory, and Node's own
 * default ceiling is 32 MB — which is enough for these parameters
 * (16 MB) but not for a record written with a bigger N. The ceiling
 * is derived from the record's own parameters, so a bigger record is
 * read rather than refused, and it is doubled so the allocator does
 * not fail on the boundary.
 *
 * @param {{N: number, r: number}} params
 * @returns {number}
 */
function maxmemFor(params) {
  return Math.max(32 * 1024 * 1024, 256 * params.N * params.r);
}

/**
 * Is this a hex string of exactly `bytes` bytes?
 *
 * `Buffer.from('zz', 'hex')` is an EMPTY buffer, not a throw — Node
 * stops at the first character that is not hex. So the length of the
 * decoded buffer is not enough to validate the input, and the hex is
 * checked before it is decoded.
 *
 * @param {unknown} value
 * @param {number} bytes
 * @returns {boolean}
 */
export function isHexOfBytes(value, bytes) {
  return (
    typeof value === 'string' &&
    value.length === bytes * 2 &&
    HEX.test(value)
  );
}

/**
 * The scrypt parameters of a record, if they are usable.
 *
 * The bounds are there so a corrupt record cannot ask for a gigabyte
 * of memory (a denial of service through the login endpoint), and so
 * that a hand-edited record with `N: "many"` does not become a
 * `NaN` further down.
 *
 * @param {unknown} record
 * @returns {{N: number, r: number, p: number, keylen: number}|null}
 */
export function readParams(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return null;
  if (record.algo !== ALGO) return null;
  if (record.version !== RECORD_VERSION) return null;
  const N = Number(record.N);
  const r = Number(record.r);
  const p = Number(record.p);
  const keylen = Number(record.keylen);
  if (!Number.isInteger(N) || N < 2 || N > 1 << 20) return null;
  // N is a power of two, and the scrypt spec requires it.
  if ((N & (N - 1)) !== 0) return null;
  if (!Number.isInteger(r) || r < 1 || r > 32) return null;
  if (!Number.isInteger(p) || p < 1 || p > 16) return null;
  if (!Number.isInteger(keylen) || keylen < 16 || keylen > 64) return null;
  return { N, r, p, keylen };
}

/**
 * The record, parsed.
 *
 * The salt may be any sane length here — the verifier reads what the
 * record says, so a record written by another build is still
 * readable. `checkRecord` is the strict one, and it is what the CLI
 * uses before it writes anything.
 *
 * @param {unknown} record
 * @returns {{params: object, salt: Buffer, hash: Buffer}|null}
 */
export function parseRecord(record) {
  const params = readParams(record);
  if (!params) return null;
  const saltHex = record.salt;
  const hashHex = record.hash;
  if (typeof saltHex !== 'string' || typeof hashHex !== 'string') return null;
  if (saltHex.length % 2 !== 0 || saltHex.length < 16 || saltHex.length > 128) return null;
  if (!HEX.test(saltHex)) return null;
  if (!isHexOfBytes(hashHex, params.keylen)) return null;
  return {
    params,
    salt: Buffer.from(saltHex, 'hex'),
    hash: Buffer.from(hashHex, 'hex'),
  };
}

/**
 * Is this record one this build can write?
 *
 * `adminctl set-password` refuses anything else: a record the
 * verifier cannot read, or one written with parameters this build
 * does not support, is a record that should not land on the host.
 *
 * @param {unknown} record
 * @returns {{ok: boolean, reason: string}}
 */
export function checkRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return { ok: false, reason: 'the record is not an object' };
  }
  if (record.algo !== ALGO) {
    return { ok: false, reason: `the algorithm must be '${ALGO}'` };
  }
  if (record.version !== RECORD_VERSION) {
    return { ok: false, reason: `the version must be ${RECORD_VERSION}` };
  }
  const params = readParams(record);
  if (!params) {
    return { ok: false, reason: 'the scrypt parameters are not usable' };
  }
  if (
    params.N !== SCRYPT_PARAMS.N ||
    params.r !== SCRYPT_PARAMS.r ||
    params.p !== SCRYPT_PARAMS.p ||
    params.keylen !== SCRYPT_PARAMS.keylen
  ) {
    return {
      ok: false,
      reason:
        `this build only supports N=${SCRYPT_PARAMS.N}, r=${SCRYPT_PARAMS.r}, ` +
        `p=${SCRYPT_PARAMS.p}, keylen=${SCRYPT_PARAMS.keylen}`,
    };
  }
  if (!isHexOfBytes(record.salt, SALT_BYTES)) {
    return { ok: false, reason: `the salt must be ${SALT_BYTES} bytes of hex` };
  }
  if (!isHexOfBytes(record.hash, params.keylen)) {
    return { ok: false, reason: `the hash must be ${params.keylen} bytes of hex` };
  }
  return { ok: true, reason: '' };
}

/**
 * Derive the key, synchronously.
 *
 * @param {string} password
 * @param {Buffer} salt
 * @param {{N: number, r: number, p: number, keylen: number}} params
 * @returns {Buffer}
 */
function deriveSync(password, salt, params) {
  return scryptSync(String(password ?? ''), salt, params.keylen, {
    N: params.N,
    r: params.r,
    p: params.p,
    maxmem: maxmemFor(params),
  });
}

/**
 * Derive the key, asynchronously.
 *
 * The service uses this one: scrypt with these parameters takes tens
 * of milliseconds, and doing it synchronously would stall the whole
 * event loop — every other request, including the ones that are
 * already probing the fleet, would wait for a password check.
 *
 * @param {string} password
 * @param {Buffer} salt
 * @param {{N: number, r: number, p: number, keylen: number}} params
 * @returns {Promise<Buffer>}
 */
function deriveAsync(password, salt, params) {
  return new Promise((resolve, reject) => {
    scrypt(
      String(password ?? ''),
      salt,
      params.keylen,
      { N: params.N, r: params.r, p: params.p, maxmem: maxmemFor(params) },
      (err, key) => (err ? reject(err) : resolve(key)),
    );
  });
}

/**
 * Spend the work of a real comparison on a record we cannot read.
 *
 * A malformed record must not be FASTER to reject than a wrong
 * password: otherwise the login endpoint becomes an oracle for "is
 * the auth file broken?", which is exactly the question an attacker
 * would like answered before they start guessing.
 *
 * @param {string} password
 * @returns {void}
 */
function burnSync(password) {
  const salt = Buffer.alloc(SALT_BYTES, 0);
  const derived = deriveSync(password, salt, SCRYPT_PARAMS);
  // The comparison is real, against a hash nobody has.
  timingSafeEqual(derived, Buffer.alloc(SCRYPT_PARAMS.keylen, 0));
}

/**
 * Spend the work of a real comparison on a record we cannot read.
 *
 * @param {string} password
 * @returns {Promise<void>}
 */
async function burnAsync(password) {
  const salt = Buffer.alloc(SALT_BYTES, 0);
  const derived = await deriveAsync(password, salt, SCRYPT_PARAMS);
  timingSafeEqual(derived, Buffer.alloc(SCRYPT_PARAMS.keylen, 0));
}

/**
 * Make a password record.
 *
 * The salt is 16 random bytes, per password: two records for the same
 * password are different records, so the file does not say whether
 * two hosts have the same password.
 *
 * @param {string} password
 * @param {object} [opts]
 * @param {object} [opts.params] the scrypt parameters
 * @param {Buffer} [opts.salt] the salt (for tests)
 * @returns {object} the record
 */
export function createPasswordRecord(password, { params = SCRYPT_PARAMS, salt = null } = {}) {
  const text = String(password ?? '');
  if (!text.length) {
    throw new Error('the password must not be empty');
  }
  const p = { ...SCRYPT_PARAMS, ...params };
  const saltBytes = salt ?? randomBytes(SALT_BYTES);
  const derived = deriveSync(text, saltBytes, p);
  return {
    version: RECORD_VERSION,
    algo: ALGO,
    N: p.N,
    r: p.r,
    p: p.p,
    keylen: p.keylen,
    salt: saltBytes.toString('hex'),
    hash: derived.toString('hex'),
  };
}

/**
 * Does this password match this record?
 *
 * It does not throw. A record that cannot be read is a failed login.
 *
 * @param {unknown} record
 * @param {string} password
 * @returns {boolean}
 */
export function verifyPassword(record, password) {
  const parsed = parseRecord(record);
  if (!parsed) {
    burnSync(password);
    return false;
  }
  let derived;
  try {
    derived = deriveSync(password, parsed.salt, parsed.params);
  } catch {
    return false;
  }
  return timingSafeEqual(derived, parsed.hash);
}

/**
 * Does this password match this record? (Asynchronously.)
 *
 * @param {unknown} record
 * @param {string} password
 * @returns {Promise<boolean>}
 */
export async function verifyPasswordAsync(record, password) {
  const parsed = parseRecord(record);
  if (!parsed) {
    await burnAsync(password);
    return false;
  }
  let derived;
  try {
    derived = await deriveAsync(password, parsed.salt, parsed.params);
  } catch {
    return false;
  }
  return timingSafeEqual(derived, parsed.hash);
}

/**
 * Read the record off the disk.
 *
 * A missing file is not an error — it is a console that has not been
 * given a password yet — so this returns null rather than throwing.
 * A file that is there but corrupt is also null, for the same reason:
 * the login fails, and the operator sees a failed login.
 *
 * @param {string} file
 * @returns {object|null}
 */
export function readPasswordRecord(file) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Where the password record comes from.
 *
 * The store is the seam the service is given, so the tests can put a
 * record in memory and the host can read a file. The file is read at
 * the moment of the login, not once at startup — so a password set
 * with `adminctl set-password` takes effect without a restart, which
 * is the difference between "the operator restarts the service" and
 * "the operator does not have to remember to".
 *
 * `load()` is synchronous and returns the record, or null.
 *
 * The option is `file`, and a stale `path` is REFUSED rather than
 * ignored: a store that quietly read the default file instead of the
 * one that was asked for is a console that cannot be logged into, and
 * the reason is not visible from where it happened.
 *
 * @param {object} [opts]
 * @param {string} [opts.file] the file on the host
 * @param {object|null} [opts.record] an in-memory record
 * @returns {{file: string, load: () => (object|null)}}
 */
export function createAuthStore(opts = {}) {
  if ('path' in opts) {
    throw new Error(
      "the option is 'file', not 'path': the auth store reads the " +
        "administrator's scrypt record out of a file, and the name says which one",
    );
  }
  const { file = DEFAULT_AUTH_FILE, record = null } = opts;
  return {
    file,
    load() {
      if (record) return record;
      return readPasswordRecord(file);
    },
  };
}
