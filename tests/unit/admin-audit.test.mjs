/**
 * The audit line: one line per event, appended, never rewritten.
 *
 * THE LINE IS A CONTRACT
 * ----------------------
 * Four fields in a fixed order — TIMESTAMP, ACTION, TARGET, OUTCOME —
 * on one line. It has to be greppable today and parseable later, so
 * the fields cannot contain spaces (a target in phase 4 is a player
 * name, and a player name may contain one).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createAuditSink,
  DEFAULT_AUDIT_PATH,
  formatAuditLine,
  sanitizeField,
} from '../../services/admin/lib/audit.mjs';

test('a line is a timestamp, an action, a target and an outcome', () => {
  const line = formatAuditLine({
    timestamp: '2026-10-31T15:04:05.123Z',
    action: 'login',
    target: '10.0.0.4',
    outcome: 'fail',
  });
  assert.equal(line, '2026-10-31T15:04:05.123Z login 10.0.0.4 fail');
  // Four fields, space separated.
  assert.equal(line.split(' ').length, 4);
});

test('a field with a space in it cannot make the line ambiguous', () => {
  const line = formatAuditLine({
    timestamp: '2026-10-31T15:04:05.123Z',
    action: 'kick',
    target: 'Some Player',
    outcome: 'ok',
  });
  assert.equal(line, '2026-10-31T15:04:05.123Z kick Some_Player ok');
  assert.equal(line.split(' ').length, 4);
  assert.equal(sanitizeField('a b\tc'), 'a_b_c');
});

test('a field cannot fill the disk', () => {
  assert.equal(sanitizeField('x'.repeat(1000)).length, 200);
});

test('the sink writes the line to the file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'admin-audit-'));
  const path = join(dir, 'actions.log');
  const when = 1_767_204_245_123;
  const sink = createAuditSink({ path, now: () => when });
  assert.equal(sink.record('login', '10.0.0.4', 'ok'), true);
  const text = readFileSync(path, 'utf8');
  assert.equal(text, `${new Date(when).toISOString()} login 10.0.0.4 ok\n`);
});

test('the file is created 0600, and it is only appended to', () => {
  const dir = mkdtempSync(join(tmpdir(), 'admin-audit-'));
  const path = join(dir, 'actions.log');
  const sink = createAuditSink({ path, now: () => 1_767_204_245_123 });

  sink.record('login', '10.0.0.4', 'ok');
  const mode = statSync(path).mode & 0o777;
  assert.equal(mode, 0o600, 'the audit log is not world-readable');

  sink.record('logout', '10.0.0.4', 'ok');
  const lines = readFileSync(path, 'utf8').trim().split('\n');
  assert.equal(lines.length, 2);
  // The first line is still the first line: the file is appended to,
  // never rewritten.
  assert.match(lines[0], / login 10\.0\.0\.4 ok$/);
  assert.match(lines[1], / logout 10\.0\.0\.4 ok$/);
});

test('the sink is injectable, so the tests can capture the lines', () => {
  const lines = [];
  const when = 1_767_204_245_123;
  const stamp = new Date(when).toISOString();
  const sink = createAuditSink({
    path: '/nowhere/actions.log',
    now: () => when,
    appendFile: (path, line) => lines.push(line),
  });
  sink.record('login', '10.0.0.4', 'fail');
  sink.record('login-locked-out', '10.0.0.4', 'locked');
  assert.equal(lines.length, 2);
  assert.equal(lines[0], `${stamp} login 10.0.0.4 fail`);
  assert.equal(lines[1], `${stamp} login-locked-out 10.0.0.4 locked`);
});

test('a write that fails is reported, and does not throw', () => {
  const sink = createAuditSink({
    path: '/nowhere/actions.log',
    appendFile: () => {
      throw new Error('EACCES');
    },
  });
  assert.equal(sink.record('login', '10.0.0.4', 'ok'), false);
});

test('the log lives next to the password record', () => {
  assert.equal(DEFAULT_AUDIT_PATH, '/srv/ts-admin/actions.log');
});
