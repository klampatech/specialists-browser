/**
 * The two passwords, and the names that keep them apart.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * There are TWO passwords on this service, and they are not the same
 * kind of thing:
 *
 *   - the RCON password is the ENGINE's. It has to be a plaintext
 *     string at runtime, because the engine compares it on the wire.
 *   - the administrator's password is never a plaintext string
 *     anywhere: it is a scrypt record, on disk.
 *
 * A reader in phase 4 must not be able to pass one where the other
 * belongs. The names are what stop it — and the factory REFUSES the
 * ambiguous ones outright, because an option that is quietly ignored
 * is a service that starts with the wrong secret and refuses every
 * instance for a reason nobody can see.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthStore, createPasswordRecord } from '../../services/admin/lib/auth.mjs';
import { createAdminService, readConfig } from '../../services/admin/service.mjs';

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

test('the factory REFUSES the ambiguous `password` option', () => {
  // Not ignored — refused, with a message that says what to use.
  assert.throws(() => createAdminService({ password: 'hunter2' }), /rconPassword/);
  // And the message says why the two are not interchangeable.
  assert.throws(() => createAdminService({ password: 'hunter2' }), /scrypt record/);
});

test("the factory REFUSES `adminPassword` — the admin password is not a string", () => {
  assert.throws(() => createAdminService({ adminPassword: 'hunter2' }), /adminPassword/);
  assert.throws(() => createAdminService({ adminPassword: 'hunter2' }), /scrypt record/);
});

test('the RCON password is `rconPassword`, and it is the engine’s', () => {
  const service = createAdminService({ rconPassword: 'SUPERSECRET' });
  assert.equal(service.config.rconConfigured, true);
  // The secret itself is not in the returned config.
  assert.equal(service.config.rconPassword, undefined);
  assert.equal(containsSecret(service, 'SUPERSECRET'), false);
});

test('the redacted config says whether a login is possible, and carries no secret', () => {
  const withRecord = createAdminService({
    rconPassword: 'SUPERSECRET',
    auth: createAuthStore({ record: createPasswordRecord('the-admin-password') }),
  });
  assert.equal(withRecord.config.authConfigured, true);
  assert.equal(withRecord.config.rconConfigured, true);
  // Neither flag is a secret, and neither secret is in the config.
  assert.equal(containsSecret(withRecord, 'SUPERSECRET'), false);
  assert.equal(containsSecret(withRecord, 'the-admin-password'), false);

  // With no record, the operator can see that nobody can log in.
  const without = createAdminService({ rconPassword: 'SUPERSECRET' });
  assert.equal(without.config.authConfigured, false);
  assert.equal(without.config.rconConfigured, true);
});

test('the redacted config names the auth file, and the audit file', () => {
  const service = createAdminService({
    rconPassword: 'pw',
    authFile: '/srv/ts-admin/auth.json',
    auditPath: '/srv/ts-admin/actions.log',
  });
  assert.equal(service.config.authFile, '/srv/ts-admin/auth.json');
  assert.equal(service.config.auditPath, '/srv/ts-admin/actions.log');
});

test('the auth store REFUSES a stale `path` option', () => {
  // A store that quietly read the default file instead of the one
  // that was asked for is a console nobody can log into.
  assert.throws(() => createAuthStore({ path: '/tmp/auth.json' }), /'file'/);
});

test('the environment: RCON_PASSWORD is the engine’s, ADMIN_AUTH_FILE is the record', () => {
  const config = readConfig({
    RCON_PASSWORD: 'hunter2',
    ADMIN_AUTH_FILE: '/srv/ts-admin/auth.json',
  });
  assert.equal(config.rconPassword, 'hunter2');
  assert.equal(config.authFile, '/srv/ts-admin/auth.json');
  // And the RCON password is NOT called `password` anywhere in it.
  assert.equal(config.password, undefined);
});

test('the environment refuses the old ADMIN_AUTH_PATH name', () => {
  assert.throws(
    () => readConfig({ ADMIN_AUTH_PATH: '/srv/ts-admin/auth.json' }),
    /ADMIN_AUTH_FILE/,
  );
});

test('the environment refuses ADMIN_PASSWORD — there is no plaintext admin password', () => {
  assert.throws(() => readConfig({ ADMIN_PASSWORD: 'hunter2' }), /scrypt record/);
});

test('the RCON password still cannot contain whitespace, and says so', () => {
  // The wording does good work: it names the environment variable
  // and says what the engine does with it.
  assert.throws(
    () => createAdminService({ rconPassword: 'two words' }),
    /RCON_PASSWORD must not contain whitespace/,
  );
  assert.throws(
    () => readConfig({ RCON_PASSWORD: 'two words' }),
    /RCON_PASSWORD must not contain whitespace/,
  );
});
