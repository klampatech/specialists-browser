/**
 * admin — the console's OWN id-ban store.
 *
 * WHY THE CONSOLE HAS A STORE AT ALL
 * ----------------------------------
 * The engine can be asked for its IP filter (`listip` — it prints, and
 * the fleet runs at `developer 1`). The engine CANNOT be asked for its
 * id bans: `listid` goes through `Con_Reportf`, which the engine only
 * emits at `developer 2` and above, and the fleet runs at
 * `developer 1` (`tools/deploy/entrypoint.sh:192`). Measured empty on
 * the CI instance — and "empty" there means SILENT, not "no id bans".
 *
 * So the id-ban list the console shows is its OWN, and it is EMPTY:
 * the ban endpoint is a stub (§5.1) and nothing can create a ban.
 *
 * AND IT STAYS EMPTY
 * ------------------
 * There is no `add()`. A store with a method nobody can reach is a
 * store that will be reached by accident one day, and a ban written
 * by accident is a ban that removes every browser player on the
 * instance (§2.5). So the store holds a list, the list is empty, and
 * the only way to put something in it is to write that code
 * deliberately — in the phase where the identity exists.
 *
 * The IP filter is NOT here: it is the engine's, and it is read-only
 * everywhere.
 */

/** Why the id-ban list is empty, in the operator's words. */
export const ID_BANS_NOTE =
  "The id-ban list is the console's own store, and it is empty: the ban " +
  'endpoint is a stub (docs/ADMIN-CONSOLE.md §5.1) and nothing can create a ' +
  "ban. The engine's own `listid` is silent at the fleet's `developer 1` " +
  'verbosity, so the engine cannot be asked for its id-ban list. The IP ' +
  "filter below is the engine's `listip` — read-only.";

/**
 * The console's own id-ban store.
 *
 * @param {object} [opts]
 * @param {object[]} [opts.bans] the bans, when there are any. There
 *   are not — today the store is empty — but the store takes its
 *   contents as an argument so a test can say so plainly.
 * @returns {{list: () => object[], size: () => number}}
 */
export function createBanStore({ bans = [] } = {}) {
  // A COPY, so a caller that mutates the array it was given cannot
  // change what the next caller sees — the same rule the ban stub's
  // body follows (lib/ban.mjs).
  const store = Array.isArray(bans) ? bans.map((b) => ({ ...b })) : [];

  return {
    /**
     * The id bans the console knows about.
     *
     * @returns {object[]}
     */
    list() {
      return store.map((b) => ({ ...b }));
    },
    /**
     * How many there are.
     *
     * @returns {number}
     */
    size() {
      return store.length;
    },
  };
}
