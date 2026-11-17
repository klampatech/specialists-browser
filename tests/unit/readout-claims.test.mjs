/**
 * THE READOUT'S CLAIMS: the wording lint.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * The truth gate (`tools/perf/verify-readout-truth.cjs`) checks the
 * NUMBERS the panel prints. This one checks the SENTENCES — because a
 * number can be right and the sentence around it still wrong.
 *
 * The class of error it exists for is the class Kyle caught in the
 * screenshot: a readout that asserted a CAUSE it could not know. The
 * browser cannot see whether Energy Saver is on, cannot see whether an
 * overlay is running, and cannot tell a machine being interrupted from
 * an engine missing its own deadline. It can see a rate, a cost, a
 * frame count and a renderer string — and everything it says has to
 * live inside that.
 *
 * THE TWO RULES
 * -------------
 *   1. THE BANNED SENTENCES — specific assertions that were shipped
 *      and were wrong, kept here so they cannot come back. They are
 *      checked against the policy's STRING LITERALS, not against the
 *      file: a comment that explains the bug is not a claim to the
 *      player, and the policy's comments quote the bug on purpose.
 *
 *   2. THE HEDGE — a sentence that names something the page CANNOT
 *      SEE (a browser setting, an overlay, a download) AND the symptom
 *      it is being blamed for has to say "can" or "may", not "is".
 *
 *      A general fact about how overlays work is not a claim about
 *      this player, so it is allowed: the rule needs BOTH the cause
 *      and the symptom in the same sentence.
 *
 * WHERE IT READS FROM
 * -------------------
 * The policy lives in the `webxash` submodule: `src/services/perf-check.ts`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WEBXASH = join(ROOT, 'webxash');
const PERF_CHECK_TS = join(WEBXASH, 'src', 'services', 'perf-check.ts');

if (!existsSync(WEBXASH)) {
  throw new Error(
    'the webxash submodule is not checked out — run ' +
      '`git submodule update --init --recursive`. This test reads the ' +
      'frontend source, so it cannot pass without it.'
  );
}

const source = readFileSync(PERF_CHECK_TS, 'utf8');

/**
 * THE POLICY WITH ITS COMMENTS TAKEN OUT.
 *
 * The comments are left out on purpose: the policy's comments quote the
 * old sentences to explain why they are gone. And they have to come
 * out before the strings are read, because a comment's apostrophe
 * ("Kyle's screenshot said…") makes the next apostrophe look like the
 * start of a string literal — and the prose between them is then read
 * as something the player can be shown.
 */
const code = source
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ');

/** THE POLICY'S STRING LITERALS — the words the player can be shown. */
const literals = [...code.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]);

/**
 * THE BANNED SENTENCES.
 *
 * Every entry is a sentence that WAS SHIPPED, and the reason it was
 * wrong. The date is when it was caught.
 */
const BANNED = [
  {
    re: /not the game being slow/i,
    why:
      'the readout cannot tell a machine being interrupted from an engine ' +
      'missing its own deadline — it knows the frames were uneven, and ' +
      'nothing more',
    shipped: '2026-11-16',
  },
  {
    re: /is usually this/i,
    why:
      'a statistic about how often a browser setting causes a stutter is ' +
      'not something a page can know',
    shipped: '2026-11-16',
  },
  {
    re: /your browser was holding the game back/i,
    why:
      'the original bug: the summary blamed the browser while the browser ' +
      'was delivering every refresh',
    shipped: '2026-11-07',
  },
];

/**
 * THE THINGS THE PAGE CANNOT SEE.
 *
 * A sentence that names one of these is talking about a cause the
 * readout has not observed.
 */
const UNOBSERVABLE = [
  /energy saver/i,
  /low power mode/i,
  /memory saver/i,
  /overlay/i,
  /antivirus/i,
  /a download/i,
];

/** THE SYMPTOMS the readout CAN see, and so can be blamed on. */
const SYMPTOM = [/stutters/i, /judder/i, /slow/i, /late frames/i, /evenly/i, /refreshes/i];

/** A HEDGE: the sentence admits it might not be the case. */
const HEDGE = /\b(can|may|might|could|if)\b/i;

// ── the banned sentences ─────────────────────────────────────────────
for (const banned of BANNED) {
  test(`the policy does not say: ${banned.re.source}`, () => {
    const hit = literals.find((s) => banned.re.test(s));
    assert.equal(
      hit,
      undefined,
      `the policy still says "${hit}" — ${banned.why} (shipped ${banned.shipped})`
    );
  });
}

// ── the hedge ────────────────────────────────────────────────────────
test('a sentence that blames something the page cannot see is worded as a possibility', () => {
  // The checklist's `why` strings are the sentences a player reads to
  // decide what to do, so they are the ones that must not assert a
  // cause. They are read as TEXT, because the policy's shape is not
  // this test's business — its WORDS are.
  const whys = [];
  const re = /why:\s*((?:\s*'[^']*'\s*\+?)+)/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    const parts = m[1].match(/'([^']*)'/g) || [];
    whys.push(parts.join('').replace(/'\s*\+\s*'/g, ' ').replace(/'/g, ''));
  }
  assert.ok(whys.length > 0, 'the policy has checklist items with a "why"');

  const offenders = [];
  for (const why of whys) {
    const namesACause = UNOBSERVABLE.some((u) => u.test(why));
    const namesTheSymptom = SYMPTOM.some((s) => s.test(why));
    if (!namesACause || !namesTheSymptom) continue;
    if (!HEDGE.test(why)) offenders.push(why.trim());
  }
  assert.deepEqual(
    offenders,
    [],
    `these sentences blame something the page cannot see, and say it as a fact:\n  - ${offenders.join('\n  - ')}`
  );
});

test('a general fact about how a setting works is not a claim about this player', () => {
  // The rule above needs BOTH a cause and a symptom. These are the
  // sentences that name a cause and say nothing about this player's
  // game, and they are allowed — and the lint has to keep allowing
  // them, or it will push the policy into saying nothing at all.
  const whys = [];
  const re = /why:\s*((?:\s*'[^']*'\s*\+?)+)/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    const parts = m[1].match(/'([^']*)'/g) || [];
    whys.push(parts.join('').replace(/'\s*\+\s*'/g, ' ').replace(/'/g, ''));
  }
  const general = whys.filter(
    (w) =>
      UNOBSERVABLE.some((u) => u.test(w)) &&
      !SYMPTOM.some((s) => s.test(w)) &&
      !HEDGE.test(w)
  );
  assert.ok(
    general.length > 0,
    'the policy still explains what a browser setting does, in general'
  );
});

// ── and the things that MUST still be there ──────────────────────────
//
// A lint that only deletes things is a way to make the panel say
// nothing. So the facts the panel is FOR have to survive it.
test('the panel still names the things a player can act on', () => {
  const musts = [
    'chrome://settings/performance',
    'chrome://settings/system',
    'chrome://gpu',
    'about:config',
    'Low Power Mode',
  ];
  for (const m of musts) {
    assert.ok(source.includes(m), `the policy still names ${m}`);
  }
});

test('the policy still reports the renderer, the budget and the frame rate', () => {
  for (const m of ['Renderer:', 'budget', 'fps']) {
    assert.ok(source.includes(m), `the policy still says something about ${m}`);
  }
});
