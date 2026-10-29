/**
 * BUILD THE BOOKMARKLET SAFELY.
 *
 * THE BUG THIS FIXES
 * ------------------
 * The bookmarklet was previously built by collapsing the diagnostic's
 * source to a single line with `replace(/\s+/g, ' ')`. That is what a
 * `javascript:` URL needs -- but it silently DESTROYS the source,
 * because every `//` line comment then swallows the rest of the file:
 *
 *     // COUNT THE ENGINE'S RENDERED FRAMES.
 *     // The engine clears the framebuffer once per frame...
 *     let engineFrames = 0;
 *
 * collapses to one line, where the FIRST `//` comments out everything
 * after it. The result was a bookmarklet that was syntactically
 * invalid and did nothing at all.
 *
 * It went unnoticed because the verification harness evaluated the
 * SOURCE FILE rather than the generated bookmarklet. The lesson: verify
 * the artefact you actually ship, not the thing you built it from.
 *
 * WHY ESBUILD
 * -----------
 * Stripping comments correctly requires a real parser: a regex cannot
 * tell a `//` inside a string from a comment, and the diagnostic
 * contains regex literals and nested template literals. The first
 * attempt used a hand-rolled scanner and got it wrong.
 *
 * esbuild is already in the repo (a Vite dependency), so it is used
 * here rather than a home-grown parser.
 *
 * WHAT THIS DOES
 * --------------
 * 1. Extracts the diagnostic's code.
 * 2. Runs it through esbuild (a real parser) to strip comments and
 *    collapse it to one line.
 * 3. SYNTAX-CHECKS the result and refuses to write a broken file.
 * 4. Asserts the result is one line with no stray comment markers.
 *
 * USAGE
 *   node tools/perf/build-bookmarklet.cjs
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DIR = __dirname;
const SRC = path.join(DIR, 'diagnose-fullscreen.js');
const OUT = path.join(DIR, 'diagnose-fullscreen.bookmarklet.txt');

function loadEsbuild() {
  const candidates = [
    path.join(DIR, '../../webxash/node_modules/esbuild'),
    path.join(DIR, '../../node_modules/esbuild'),
    'esbuild',
  ];
  for (const c of candidates) {
    try {
      return require(c);
    } catch (e) {
      /* try the next one */
    }
  }
  console.error('esbuild not found.');
  console.error('Tried:');
  for (const c of candidates) console.error('  ' + c);
  process.exit(1);
}

const esbuild = loadEsbuild();

const src = fs.readFileSync(SRC, 'utf8');

// The code is AFTER the first '*/' (the leading block comment).
// `split('*/', 1)` returns the part BEFORE the delimiter -- a trap that
// bit this twice.
const code = src.split('*/').slice(1).join('*/').trim();
if (!code.startsWith('(() => {')) {
  console.error('EXTRACTION FAILED -- the diagnostic source changed shape.');
  process.exit(1);
}

// esbuild: parse and re-emit. `minify: true` with `minifyWhitespace`
// strips comments and collapses to one line. It is a real parser, so
// it gets comments-in-strings right.
let oneLine;
try {
  const out = esbuild.transformSync(code, {
    minify: true,
    minifyWhitespace: true,
    minifyIdentifiers: false,
    minifySyntax: false,
    target: 'es2020',
    legalComments: 'none',
  });
  oneLine = out.code.trim();
} catch (e) {
  console.error('ESBUILD FAILED to transform the diagnostic:');
  console.error(e.message || e);
  process.exit(1);
}

// esbuild emits a statement, not an expression, so it may have wrapped
// the IIFE. It is still a valid single statement to eval.
try {
  new vm.Script(oneLine);
} catch (e) {
  console.error('SYNTAX ERROR in the generated bookmarklet:', e.message);
  console.error('NOT writing a broken bookmarklet.');
  process.exit(1);
}

// ESBUILD LEAVES NEWLINES INSIDE TEMPLATE LITERALS.
//
// The diagnostic builds its report with `lines.join(`\n`)`, and esbuild
// correctly preserves the literal newline inside that template. But a
// bookmarklet must be ONE line -- a raw newline in a `javascript:` URL
// truncates it.
//
// A raw newline inside a template literal is the ONLY place one can
// legally appear in the emitted code (a raw newline in a quoted string
// is a syntax error), so replacing every raw newline with the two
// characters `\n` is semantically identical -- the template still
// evaluates to a newline -- and makes the output a single line.
if (/[\r\n]/.test(oneLine)) {
  const before = (oneLine.match(/[\r\n]/g) || []).length;
  oneLine = oneLine.replace(/[\r\n]/g, '\\n');
  console.log(`  escaped ${before} newline(s) inside template literals`);
}

// It must still parse after the escaping.
try {
  new vm.Script(oneLine);
} catch (e) {
  console.error('SYNTAX ERROR after newline escaping:', e.message);
  console.error('NOT writing a broken bookmarklet.');
  process.exit(1);
}

// No line comment may survive. `//` inside a string is fine, so strip
// the strings before checking.
const withoutStrings = oneLine
  .replace(/"(?:[^"\\]|\\.)*"/g, '""')
  .replace(/'(?:[^'\\]|\\.)*'/g, "''")
  .replace(/`(?:[^`\\]|\\.)*`/g, '``');
if (withoutStrings.includes('//') || withoutStrings.includes('/*')) {
  console.error('A comment marker survived into the bookmarklet.');
  console.error('NOT writing a broken bookmarklet.');
  process.exit(1);
}

const bookmarklet = 'javascript:' + oneLine;
fs.writeFileSync(OUT, bookmarklet + '\n');

console.log('built ' + path.basename(OUT));
console.log('  bytes:  ' + bookmarklet.length);
console.log('  syntax: OK (checked with vm.Script)');
console.log('  lines:  1 (verified)');

// The built file must read back byte-identical to what was written.
const onDisk = fs.readFileSync(OUT, 'utf8').trim();
console.log(
  '  round-trip: ' + (onDisk === bookmarklet ? 'OK' : 'MISMATCH'),
);
