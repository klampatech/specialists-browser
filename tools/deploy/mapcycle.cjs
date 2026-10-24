/**
 * The map cycle file.
 *
 * WHY THIS EXISTS
 * ---------------
 * The TS asset tree ships the STOCK Half-Life map cycle — undertow,
 * snark_pit, boot_camp, lambda_bunker, datacore, stalkyard — and not one
 * of those maps exists in a TS install. The port reads that file, skips
 * every entry it cannot find ("not a valid map"), and ends up with an
 * empty cycle: the server runs one map forever and says nothing about
 * it. The TS folder's own mapcycle.txt is empty, for the same reason.
 *
 * So the cycle is OURS: a file in this repo, copied into the game dir at
 * container start (see entrypoint.sh). This module is the parser and the
 * rules that file has to satisfy, so "we shipped a cycle that cannot
 * work" is a failing test rather than a production surprise.
 *
 * THE FORMAT (what the port's COM_Parse actually reads)
 * ------------------------------------------------------
 * One map per line. A line may carry a rules buffer after the map name:
 *
 *     ts_lobby
 *     ts_casa \minplayers\2\maxplayers\8
 *
 * `//` starts a comment. The map name is resolved by the engine, so it has
 * to be a map that exists in the TS install.
 */

/**
 * The maps in the stock Half-Life cycle. None of them is a TS map, so a
 * cycle that contains one of these can only produce a broken rotation.
 */
const STOCK_HL1_MAPS = [
  'undertow',
  'snark_pit',
  'boot_camp',
  'lambda_bunker',
  'datacore',
  'stalkyard',
];

/** A map name the engine can resolve: no spaces, no path separators. */
const MAP_NAME = /^[A-Za-z0-9_]+$/;

/**
 * Parse a map cycle file.
 *
 * Returns `{ entries, errors }`. `entries` is what the engine would see;
 * `errors` is everything about this file that would make the rotation
 * misbehave. A parse never throws — a broken file is a list of problems.
 *
 * @param {string} text the file contents
 * @returns {{entries: Array<{map: string, rules: string|null, line: number}>, errors: string[]}}
 */
function parseMapCycle(text) {
  const entries = [];
  const errors = [];
  const lines = String(text ?? '').split(/\r?\n/);

  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (line === '') return;
    if (line.startsWith('//')) return;

    // A rules buffer is a quoted token after the map name; the port's
    // COM_Parse reads the map, then an optional second token.
    const match = line.match(/^(\S+)(?:\s+(.*))?$/);
    if (!match) {
      errors.push(`line ${i + 1}: cannot read a map name out of ${JSON.stringify(raw)}`);
      return;
    }
    const map = match[1];
    const rules = match[2] ? match[2].trim() : null;
    if (!MAP_NAME.test(map)) {
      errors.push(`line ${i + 1}: ${JSON.stringify(map)} is not a map name the engine can resolve`);
      return;
    }
    entries.push({ map, rules, line: i + 1 });
  });

  return { entries, errors };
}

/**
 * Check a map cycle file against the rules.
 *
 * @param {string} text the file contents
 * @param {{required?: string[]}} [options]
 * @returns {{ok: boolean, entries: Array<object>, errors: string[]}}
 */
function validateMapCycle(text, options = {}) {
  const required = options.required ?? [];
  const { entries, errors } = parseMapCycle(text);
  const problems = [...errors];

  if (entries.length === 0) {
    problems.push('the cycle is empty — the server will run one map forever');
  }

  const seen = new Set();
  for (const entry of entries) {
    if (STOCK_HL1_MAPS.includes(entry.map.toLowerCase())) {
      problems.push(
        `${entry.map} is a stock Half-Life map (line ${entry.line}) — it does not exist in a TS install, ` +
          'so the port skips it and the cycle can never rotate'
      );
    }
    if (!entry.map.toLowerCase().startsWith('ts_')) {
      problems.push(
        `${entry.map} (line ${entry.line}) is not a TS map — this is a The Specialists server`
      );
    }
    if (seen.has(entry.map.toLowerCase())) {
      problems.push(`${entry.map} (line ${entry.line}) is in the cycle twice`);
    }
    seen.add(entry.map.toLowerCase());
  }

  for (const map of required) {
    if (!seen.has(map.toLowerCase())) {
      problems.push(`${map} is required but is not in the cycle`);
    }
  }

  return { ok: problems.length === 0, entries, errors: problems };
}

module.exports = { STOCK_HL1_MAPS, MAP_NAME, parseMapCycle, validateMapCycle };
