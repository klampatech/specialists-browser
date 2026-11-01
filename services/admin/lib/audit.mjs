/**
 * admin — the audit line: one line per event, appended, never
 * rewritten.
 *
 * A LINE OF TEXT IS CHEAP INSURANCE
 * ---------------------------------
 * A kick and a ban are destructive and irreversible, and the console
 * is the thing that does them. So every mutating action appends one
 * line to `/srv/ts-admin/actions.log`:
 *
 *   2026-10-31T15:04:05.123Z login admin ok
 *   2026-10-31T15:04:07.881Z login 10.0.0.4 fail
 *   2026-10-31T15:06:02.004Z login-locked-out 10.0.0.4 locked
 *   2026-10-31T15:09:44.117Z logout admin ok
 *
 * Four fields, space separated, in a fixed order: TIMESTAMP, ACTION,
 * TARGET, OUTCOME. One line, one event, machine-parseable — so
 * `grep` works on it today and a parser will work on it later.
 *
 * WHY THE FIELDS CANNOT HOLD A SECRET
 * -----------------------------------
 * The target of a login is the SOURCE ADDRESS, never the password.
 * The session token and the CSRF token are never written down. A log
 * file that a support engineer can read is a file that a stolen
 * session cannot be recovered from — so the rule is that the audit
 * line is about EVENTS, and the service is what decides what goes
 * in it.
 *
 * (The audit sink cannot enforce that by itself: it is handed a
 * target and it writes what it is given. The tests are what hold
 * the line — there is one that reads the captured lines and asserts
 * that no password, session token or CSRF token is in any of them.)
 *
 * APPEND-ONLY
 * -----------
 * The file is opened for appending and never rewritten. A log that
 * can be rewritten is a log that can be edited, and an edited log is
 * worth nothing in the one situation it exists for: somebody asking
 * "was this me?" months later.
 *
 * The file is created 0600, because the target of a login is an
 * address and the operator's address is not a secret worth
 * publishing — and because the file sits next to the password file,
 * and it should not be the one that is world-readable.
 */

import { appendFileSync, closeSync, existsSync, fchmodSync, openSync } from 'node:fs';

/** Where the audit log lives on the host. */
export const DEFAULT_AUDIT_PATH = '/srv/ts-admin/actions.log';

/** The mode the audit log is created with. */
export const AUDIT_MODE = 0o600;

/** The longest a field may be, so one event cannot fill the disk. */
const MAX_FIELD = 200;

/**
 * Make a field safe to put in a line.
 *
 * Whitespace would make the line ambiguous (the target of a login is
 * an address, but a target in phase 4 is a player name, and a player
 * name may contain a space), and control characters would make the
 * line unreadable in a terminal. Both are replaced with an
 * underscore.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function sanitizeField(value) {
  return String(value ?? '')
    .replace(/\s+/g, '_')
    .split('')
    .filter((ch) => ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) !== 127)
    .join('')
    .slice(0, MAX_FIELD);
}

/**
 * The line, as it is written.
 *
 * @param {object} parts
 * @param {string} parts.timestamp the ISO timestamp
 * @param {string} parts.action
 * @param {string} parts.target
 * @param {string} parts.outcome
 * @returns {string}
 */
export function formatAuditLine({ timestamp, action, target, outcome }) {
  return [
    sanitizeField(timestamp),
    sanitizeField(action),
    sanitizeField(target),
    sanitizeField(outcome),
  ].join(' ');
}

/**
 * Append one line to the audit file.
 *
 * @param {string} path
 * @param {string} line
 * @returns {void}
 */
export function appendAuditFile(path, line) {
  if (!existsSync(path)) {
    // Created 0600 — and chmod'ed afterwards, because the mode a file
    // is CREATED with is masked by the process's umask, and the
    // umask on the host is not ours to choose.
    const fd = openSync(path, 'a', AUDIT_MODE);
    try {
      fchmodSync(fd, AUDIT_MODE);
    } finally {
      closeSync(fd);
    }
  }
  appendFileSync(path, `${line}\n`, { mode: AUDIT_MODE });
}

/**
 * The audit sink.
 *
 * The sink is INJECTABLE — both the file it writes to and the write
 * itself — so the tests can capture the lines instead of writing to
 * `/srv`, and so the service can be pointed at a scratch file.
 *
 * A write that FAILS does not throw at the caller: an unwritable
 * audit file must not be able to lock the administrator out of the
 * console. The service says so on stderr instead.
 *
 * @param {object} [opts]
 * @param {string} [opts.path] the file
 * @param {() => number} [opts.now] the clock, in epoch milliseconds
 * @param {(path: string, line: string) => void} [opts.appendFile] the write
 * @returns {{path: string, record: (action: string, target: string, outcome: string) => boolean}}
 */
export function createAuditSink({
  path = DEFAULT_AUDIT_PATH,
  now = () => Date.now(),
  appendFile = appendAuditFile,
} = {}) {
  return {
    path,
    /**
     * Write one event.
     *
     * @param {string} action
     * @param {string} target
     * @param {string} outcome
     * @returns {boolean} whether it was written
     */
    record(action, target, outcome) {
      const line = formatAuditLine({
        timestamp: new Date(now()).toISOString(),
        action,
        target,
        outcome,
      });
      try {
        appendFile(path, line);
        return true;
      } catch {
        return false;
      }
    },
  };
}
