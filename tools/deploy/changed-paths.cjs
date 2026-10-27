/**
 * Which parts of production does a change touch?
 *
 * WHY THIS IS A SEPARATE MODULE
 * -----------------------------
 * Because the deploy had a silent FALSE NEGATIVE, and it shipped a green
 * build.
 *
 * The frontend is a git SUBMODULE (`webxash/`). When the parent repo's
 * pointer to that submodule moves, `git diff --name-only` prints exactly
 * one line:
 *
 *     webxash
 *
 * — the submodule path, with NO trailing slash and none of the files
 * inside it. The deploy's rule was `grep -qE '^webxash/'`, which
 * requires the slash. So a pointer move did not match, the frontend was
 * not rebuilt, the build step was skipped, the deploy reported success,
 * and the previous bundle stayed live.
 *
 * That is how the keyboard double-delivery fix sat in a merged PR and
 * never reached production: green CI, green deploy, green browser check,
 * old code serving. The bug had been quietly swallowing every
 * submodule-driven deploy.
 *
 * So this module does two things:
 *
 *  1. The frontend is rebuilt on EVERY deploy. Not on "when it changed".
 *     The build is about a minute and the bundle is 130 KB; a path filter
 *     for it buys nothing, and a path filter is exactly what ate the
 *     release. There is no filter here to get wrong.
 *
 *  2. The control-plane images are still filtered — they are expensive to
 *     build and they restart the fleet — but the filter now sees the
 *     submodule's INTERIOR. A pointer move is expanded into the paths that
 *     actually changed inside `webxash/`, so a change to
 *     `webxash/vite-a2s-plugin.mjs` is recognised as a change to the
 *     bridge image.
 *
 * If the submodule's interior cannot be read, we rebuild the images
 * anyway. Rebuilding too much costs a minute; rebuilding too little
 * ships a stale bridge and looks exactly like success.
 */

/**
 * Paths that mean "the control-plane images need rebuilding".
 *
 * `webxash/vite-a2s-plugin.mjs` is in the list because the BRIDGE image
 * embeds it — the A2S parser that talks to the game server is not only
 * part of the web bundle.
 *
 * `tools/deploy/run-instance.sh` and `tools/deploy/deploy-services.sh`
 * are in the list because THEY ARE WHAT CREATES THE CONTAINERS. The
 * deploy ships them to the host and runs them there, so a change to
 * either is a change to how every container on the box is created — the
 * log rotation lives in exactly those two files, and a rotation rule
 * that never reaches the host is not a rule at all.
 *
 * This was a live chicken-and-egg bug: `run-instance.sh` was not even
 * SHIPPED by the deploy (only `deploy-services.sh` was — measured on the
 * production host, 2026-10-26), so it had to be copied by hand, and
 * nothing in the deploy classified a change to either script as needing
 * the control plane rebuilt. A fix to the container definition could be
 * merged, reviewed, CI-green and still never touch a running container.
 */
const SERVICES_PATTERN =
  /^(services\/|tools\/port\/tsp-rs\/scripts\/ts-udp-bridge|tools\/deploy\/Dockerfile\.bridge|tools\/deploy\/(run-instance|deploy-services)\.sh|webxash\/vite-a2s-plugin)/;

/**
 * Classify a change.
 *
 * @param {object} input
 * @param {string[]} [input.parentPaths]   paths changed in the parent repo
 * @param {string[]} [input.submodulePaths] paths changed inside webxash/
 * @param {boolean}  [input.submoduleDiffUnknown] true when the submodule's
 *        interior could not be diffed, so we cannot know what moved.
 * @returns {{frontend: boolean, services: boolean}}
 */
function classifyChanges({
  parentPaths = [],
  submodulePaths = [],
  submoduleDiffUnknown = false,
} = {}) {
  // The submodule's interior paths are namespaced so that the parent's
  // rules can be written once and mean the same thing for both repos.
  const all = [
    ...parentPaths,
    ...submodulePaths.map((p) => `webxash/${p}`),
  ];

  // The frontend always rebuilds. See the note at the top of this file.
  const frontend = true;

  // If we could not read the submodule's interior, we do not know whether
  // the bridge image's inputs moved — so we rebuild it.
  const services =
    submoduleDiffUnknown || all.some((p) => SERVICES_PATTERN.test(p));

  return { frontend, services };
}

module.exports = { classifyChanges, SERVICES_PATTERN };

// ── the command line ──────────────────────────────────────────────────
//
// The workflow needs the answer in the form GitHub Actions wants:
//
//     frontend=1
//     services=0
//
// so it can append it straight to $GITHUB_OUTPUT. The changed-path lists
// come in as FILES because they are newline-separated and a shell
// argument list is a bad place for that.

if (require.main === module) {
  const fs = require('fs');

  const argv = process.argv.slice(2);
  const opt = (name) => {
    const i = argv.indexOf(`--${name}`);
    return i === -1 ? '' : argv[i + 1] || '';
  };

  const readLines = (file) => {
    if (!file) return [];
    let text = '';
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      return [];
    }
    return text.split('\n').map((l) => l.trim()).filter(Boolean);
  };

  const { frontend, services } = classifyChanges({
    parentPaths: readLines(opt('parent')),
    submodulePaths: readLines(opt('submodule')),
    submoduleDiffUnknown: opt('unknown') === '1',
  });

  process.stdout.write(`frontend=${frontend ? 1 : 0}\nservices=${services ? 1 : 0}\n`);
}
