/**
 * STRIP THE COMMENTS, PROPERLY.
 *
 * WHY THIS EXISTS
 * ---------------
 * Six test files needed to read the client's TypeScript without its
 * comments, and each of them grew its own copy of:
 *
 *     src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
 *
 * which is WRONG on this codebase, and wrong in a way that lies:
 * `xash-loader.ts` has a line comment that mentions `resource/*.res`,
 * and the `/*` in it starts a "block comment" that never ends -- so the
 * stripper swallows the REST OF THE FILE, including the code the test
 * is looking for. It only worked by luck: the stray `/*` happened to
 * come after the last real block comment, so the tail survived.
 *
 * That luck ran out on 2026-11-20, when a doc comment moved the
 * pairing and a test that counts the unload guard in the loader began
 * reporting zero. The bug was in the instrument, not in the loader.
 *
 * THE RULE
 * --------
 * Read the source the way a compiler does: a string is a string until
 * its closing quote, and a comment starts only outside one. Everything
 * else -- `//`, `/* */`, a `/*` inside a line comment, a `//` inside a
 * URL -- is then unambiguous.
 *
 * The strings are KEPT, because a test that looks for an identifier
 * must not match one that only appears inside a string literal.
 */
export function stripComments(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const ch = src[i];
    const next = src[i + 1];
    // A LINE COMMENT runs to the end of the line.
    if (ch === '/' && next === '/') {
      while (i < n && src[i] !== '\n') i += 1;
      continue;
    }
    // A BLOCK COMMENT runs to its close.
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }
    // A STRING is copied through untouched.
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      out += ch;
      i += 1;
      while (i < n) {
        if (src[i] === '\\') {
          out += src[i] + (src[i + 1] || '');
          i += 2;
          continue;
        }
        out += src[i];
        if (src[i] === quote) {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}
