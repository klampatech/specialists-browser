// NOTHING IN THE PERF TOOLS MAY DEPEND ON WHERE IT WAS RUN.
//
// WHY
//
// The two tests I added at the end of the perf work hardcoded the
// repo root to an absolute path on Kyle's machine. That path exists
// there, so the whole suite passed locally — 701 green — and then
// failed on the CI runner, where the repo lives somewhere else
// entirely:
//
//     Error: ENOENT: no such file or directory,
//       scandir '.../tools/perf'
//
// **THE LOCAL SUITE COULD NOT SEE THE BUG, BECAUSE THE PATH IT
// HARDCODED IS EXACTLY THE PATH THAT EXISTED.** A test that depends
// on where it was run is not a test; it is a snapshot of one machine.
//
// So the tools derive their paths from their own location, and THIS
// test is the guard: if a future tool hardcodes an absolute path
// again, this fails on Kyle's machine too — before it ever reaches CI.
//
// THE DOCS ARE EXEMPT, AND SO ARE COMMENTS. HANDOFF.md and
// tools/perf/README.md name absolute paths on purpose, because they
// are instructions for a human on this machine. A comment that
// explains why a hardcoded path was removed is prose too, so only
// CODE LINES are scanned.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

/** The absolute path that must never appear in a line of code. */
const HARD_CODED = '/home/kyle/Development/specialists-browser';

/**
 * A path into the LOCAL user's home directory is the same mistake
 * wearing a hat — but ONLY the local one.
 *
 * `/home/ubuntu/ci-stack.sh` is a path on the REMOTE CI server, where
 * the stack script really does live, and flagging that would be
 * flagging something correct. So the pattern is built from the home
 * directory of whoever is running the suite: `kyle` here, `runner` on
 * CI.
 */
const LOCAL_HOME_NAME = basename(homedir());
const HOME_LIKE = new RegExp(
  `/home/${LOCAL_HOME_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`,
);

/** The directories that are code, as opposed to prose. */
const CODE_DIRS = [join(ROOT, 'tools', 'perf'), join(ROOT, 'tests', 'unit')];

/** This file names the path on purpose — to forbid it. */
const SELF = fileURLToPath(import.meta.url);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (/\.(cjs|mjs|js|ts|sh)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * THE CODE LINES OF A FILE — the comments left out.
 *
 * A line whose first non-space characters are a comment marker is
 * prose. `//`, `*` and `/*` for JavaScript; `#` for shell.
 */
function codeLines(text) {
  return text
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (trimmed.startsWith('//')) return false;
      if (trimmed.startsWith('*')) return false;
      if (trimmed.startsWith('/*')) return false;
      if (trimmed.startsWith('#')) return false;
      return true;
    });
}

const codeFiles = CODE_DIRS.filter((d) => {
  try {
    return statSync(d).isDirectory();
  } catch {
    return false;
  }
})
  .flatMap((d) => walk(d))
  .filter((f) => f !== SELF);

test('there are perf tools to check', () => {
  assert.ok(codeFiles.length >= 10, `expected the perf tools, found ${codeFiles.length}`);
});

test('no tool or test hardcodes the repo path', () => {
  const offenders = [];
  for (const file of codeFiles) {
    for (const line of codeLines(readFileSync(file, 'utf8'))) {
      if (line.includes(HARD_CODED)) {
        offenders.push(`${relative(ROOT, file)}: ${line.trim().slice(0, 70)}`);
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `these hardcode an absolute repo path, which works on one machine and nowhere else:\n${offenders.join('\n')}`,
  );
});

test('no tool or test hardcodes a home directory', () => {
  const offenders = [];
  for (const file of codeFiles) {
    for (const line of codeLines(readFileSync(file, 'utf8'))) {
      if (HOME_LIKE.test(line)) {
        offenders.push(`${relative(ROOT, file)}: ${line.trim().slice(0, 70)}`);
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `these hardcode somebody's home directory:\n${offenders.join('\n')}`,
  );
});

test('the two tests that read the perf tools resolve their own root', () => {
  // THE EXACT BUG, AS A TEST.
  //
  // If either of these goes back to a hardcoded root, the suite fails
  // on CI with an ENOENT instead of failing here with a sentence.
  for (const name of ['perf-reporting.test.mjs', 'perf-scripts.test.mjs']) {
    const text = readFileSync(join(ROOT, 'tests', 'unit', name), 'utf8');
    assert.ok(
      text.includes("new URL('../../', import.meta.url)"),
      `${name} must derive its root from its own location`,
    );
  }
});
