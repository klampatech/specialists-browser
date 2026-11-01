/**
 * adminctl — the console's password, set by hand on the host.
 *
 *   adminctl hash            read the password, print the record
 *   adminctl set-password    read the record, write it to the host
 *
 * THE PASSWORD IS NEVER AN ARGUMENT
 * ---------------------------------
 * `adminctl hash hunter2` would put the password in `ps` output and
 * in the shell history, and both of those are readable by other
 * users on the box. So the password is read from STDIN, and the
 * terminal's echo is turned OFF while it is being typed: a password
 * that appears on the screen is a password that ends up in a
 * screenshot, in a screen share, and in the scrollback of the
 * terminal emulator.
 *
 * THE RECORD IS NOT A SECRET, BUT IT IS A PASSWORD
 * -------------------------------------------------
 * The record is a scrypt hash with a salt. It cannot be turned back
 * into the password, but it IS the thing that gets written to disk,
 * so `set-password` reads it from stdin too — there is no reason for
 * it to be in a shell history either, and a hash in a history file is
 * a hash an attacker can take offline.
 *
 * THIS IS THE ADMINISTRATOR'S PASSWORD, NOT THE ENGINE'S
 * ------------------------------------------------------
 * There are two passwords on this service and they are not
 * interchangeable. The **RCON** password is the engine's, it has to
 * be a plaintext string at runtime, and it is `RCON_PASSWORD` in the
 * environment. The one this CLI sets is the **administrator's**, and
 * it is never a plaintext string anywhere — it is the scrypt record
 * this CLI writes. The file it writes is the one the service reads
 * as `ADMIN_AUTH_FILE`.
 *
 * WHY THE WRITE REFUSES TO RUN AS ROOT
 * ------------------------------------
 * The record lands in the console's state directory, and that
 * directory belongs to the uid the console runs as. Running the CLI
 * as root would write a root-owned file into a directory the service
 * user may not be able to read — and a file the service cannot read
 * is a console nobody can log into. So the write checks that the
 * directory exists, that it is owned by the uid doing the writing,
 * and that the uid is not root.
 *
 * THE WRITE IS ATOMIC
 * -------------------
 * The record is written to a temporary file in the SAME directory and
 * then renamed over the target. A rename within a filesystem is
 * atomic, so the service never reads a half-written record: it reads
 * the old one or the new one.
 *
 * A MALFORMED RECORD IS REFUSED, NOT WRITTEN
 * -----------------------------------------
 * The record is checked before anything is written: the algorithm
 * must be scrypt, the parameters must be the ones this build
 * supports, and the salt and the hash must decode as hex of the
 * right length. A record that fails the check leaves the existing
 * file exactly as it was.
 */

import { randomBytes } from 'node:crypto';
import {
  closeSync,
  existsSync,
  fchmodSync,
  fsyncSync,
  openSync,
  realpathSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkRecord,
  createPasswordRecord,
  DEFAULT_AUTH_FILE,
} from './lib/auth.mjs';

/** The mode the record file is written with. */
const AUTH_MODE = 0o600;

const USAGE = `adminctl — the admin console's password, set by hand on the host

  adminctl hash           read the password from stdin (echo off) and print
                          the scrypt record as one line of JSON
  adminctl set-password   read that record from stdin and write it to
                          ${DEFAULT_AUTH_FILE} (mode 0600, atomically)
  adminctl --help         this text

Options:
  --path <file>   the record file to write (default ${DEFAULT_AUTH_FILE})

The password is NEVER read from the command line: argv is in \`ps\` output and
in the shell history.`;

/**
 * Read a stream to the end.
 *
 * @param {NodeJS.ReadableStream} stream
 * @returns {Promise<string>}
 */
async function readAll(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

/**
 * Read the password, with the echo off.
 *
 * On a terminal the raw mode is used and NOTHING is echoed — not even
 * asterisks, because the length of the password is a small piece of
 * information about it. On a pipe (a script, a test) the bytes are
 * read as they are.
 *
 * @param {NodeJS.ReadStream} input
 * @returns {Promise<string>}
 */
async function readPassword(input) {
  if (!input.isTTY) {
    // A pipe: one trailing newline is the end of the password, and
    // nothing else is touched — a password may contain spaces.
    const text = await readAll(input);
    return text.replace(/\r?\n$/, '');
  }

  return new Promise((resolve, reject) => {
    let password = '';
    const wasRaw = Boolean(input.isRaw);
    input.setRawMode(true);
    input.resume();

    /**
     * Put the terminal back the way it was.
     */
    function restore() {
      input.setRawMode(Boolean(wasRaw));
      input.pause();
    }

    /**
     * A keypress.
     *
     * @param {Buffer} chunk
     */
    function onData(chunk) {
      for (const byte of chunk) {
        // Ctrl-C: the operator changed their mind.
        if (byte === 0x03) {
          restore();
          input.off('data', onData);
          reject(new Error('cancelled'));
          return;
        }
        // Enter: the password is done.
        if (byte === 0x0d || byte === 0x0a) {
          restore();
          input.off('data', onData);
          resolve(password);
          return;
        }
        // Backspace.
        if (byte === 0x7f || byte === 0x08) {
          password = password.slice(0, -1);
          continue;
        }
        // Anything that is not a control character.
        if (byte >= 0x20) {
          password += String.fromCharCode(byte);
        }
      }
    }

    input.on('data', onData);
  });
}

/**
 * The directory the record file lives in, checked.
 *
 * @param {string} path the record file
 * @param {object} [opts]
 * @param {number} [opts.uid] the uid that is doing the writing
 * @returns {string} the directory
 */
export function checkWriteTarget(path, { uid = process.getuid?.() ?? -1 } = {}) {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    throw new Error(
      `${dir} does not exist: the console's state directory has to be there ` +
        'before the password is set (phase 5 provisions it)',
    );
  }
  let stat;
  try {
    stat = statSync(dir);
  } catch (err) {
    throw new Error(`${dir} cannot be read: ${err.message}`);
  }
  if (!stat.isDirectory()) {
    throw new Error(`${dir} is not a directory`);
  }
  if (uid === 0) {
    throw new Error(
      'adminctl set-password refuses to run as root: the record belongs to the ' +
        'uid the console runs as, and a root-owned file is a file the service ' +
        'may not be able to read',
    );
  }
  if (stat.uid !== uid) {
    throw new Error(
      `${dir} is owned by uid ${stat.uid}, not by uid ${uid}: the record must be ` +
        'written by the uid that reads it',
    );
  }
  return dir;
}

/**
 * Write the record, atomically.
 *
 * @param {string} path
 * @param {object} record
 * @returns {void}
 */
export function writeAuthRecord(path, record) {
  const dir = checkWriteTarget(path);
  // The temporary file is in the SAME directory, so the rename is a
  // rename within one filesystem — and therefore atomic.
  const tmp = join(dir, `.${randomBytes(8).toString('hex')}.tmp`);
  try {
    const fd = openSync(tmp, 'wx', AUTH_MODE);
    try {
      // The mode a file is CREATED with is masked by the process's
      // umask, and the umask on the host is not ours to choose.
      fchmodSync(fd, AUTH_MODE);
      writeFileSync(fd, `${JSON.stringify(record)}\n`);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    renameSync(tmp, path);
  } catch (err) {
    try {
      if (existsSync(tmp)) unlinkSync(tmp);
    } catch {
      // The temporary file is already gone. Nothing to clean up.
    }
    throw err;
  }
}

/**
 * `adminctl hash` — print the record.
 *
 * @returns {Promise<number>} the exit code
 */
async function cmdHash() {
  const password = await readPassword(process.stdin);
  if (!password.length) {
    console.error('the password must not be empty');
    return 1;
  }
  const record = createPasswordRecord(password);
  // One line of JSON, so it can be piped into `set-password`.
  console.log(JSON.stringify(record));
  return 0;
}

/**
 * `adminctl set-password` — write the record.
 *
 * @param {string} path
 * @returns {Promise<number>} the exit code
 */
async function cmdSetPassword(path) {
  const text = (await readAll(process.stdin)).trim();
  if (!text) {
    console.error('no record on stdin: pipe the output of `adminctl hash` in');
    return 1;
  }
  let record;
  try {
    record = JSON.parse(text);
  } catch (err) {
    console.error(`the record is not JSON: ${err.message}`);
    return 1;
  }
  const check = checkRecord(record);
  if (!check.ok) {
    // The existing file is NOT touched.
    console.error(`the record was refused: ${check.reason}`);
    return 1;
  }
  try {
    writeAuthRecord(path, record);
  } catch (err) {
    console.error(err.message);
    return 1;
  }
  console.log(`wrote ${path}`);
  return 0;
}

/**
 * Run the CLI.
 *
 * @param {string[]} argv the arguments, without the node and the script
 * @returns {Promise<number>} the exit code
 */
export async function main(argv = process.argv.slice(2)) {
  const args = [...argv];
  let path = DEFAULT_AUTH_FILE;
  let command = null;

  // The OPTIONS are read first, and the command afterwards, so
  // `--help` works without a password and `--path` works on either
  // side of the command.
  const rest = [];
  while (args.length) {
    const arg = args.shift();
    if (arg === '--help' || arg === '-h') {
      console.log(USAGE);
      return 0;
    }
    if (arg === '--path') {
      const next = args.shift();
      if (!next) {
        console.error('--path needs a file');
        return 1;
      }
      path = next;
      continue;
    }
    if (arg.startsWith('--path=')) {
      path = arg.slice('--path='.length);
      continue;
    }
    rest.push(arg);
  }

  if (rest.length > 1) {
    console.error(`unknown argument: ${rest[1]}`);
    console.error(USAGE);
    return 1;
  }
  command = rest[0] ?? null;

  if (command === 'hash') {
    return cmdHash();
  }
  if (command === 'set-password') {
    return cmdSetPassword(path);
  }
  if (command) {
    console.error(`unknown command: ${command}`);
    console.error(USAGE);
    return 1;
  }

  console.error('no command: `hash` or `set-password`');
  console.error(USAGE);
  return 1;
}

/**
 * Is this module the process's entry point?
 *
 * @param {string} [entry] the entry path
 * @returns {boolean}
 */
export function isMainModule(entry = process.argv[1]) {
  if (!entry) {
    return false;
  }
  try {
    return realpathSync(entry) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (isMainModule()) {
  main().then(
    (code) => {
      process.exitCode = code;
    },
    (err) => {
      console.error(err?.message ?? String(err));
      process.exitCode = 1;
    },
  );
}
