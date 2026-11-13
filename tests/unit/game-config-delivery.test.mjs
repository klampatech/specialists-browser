/**
 * The game server's config reaches production.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * The game server's `server.cfg` lives in the repo, and it used to be
 * BAKED INTO THE `ts-server` image. The pipeline does not build that
 * image — its payload is the Rust port's compiled server DLL, which is
 * a build artifact and is deliberately not committed — so the game
 * image is built BY HAND on the host.
 *
 * That made every change to server.cfg undeliverable through the
 * deploy. A `log on` that is correct in the repo and absent in
 * production is the same class of bug as a route that lives in the repo
 * and is installed by hand: it drifts. And the drift is invisible — a
 * merged PR, a green CI, and a leaderboard whose kill log is off.
 *
 * So the config is MOUNTED (the Dockerfile's own run documentation
 * already showed `-v /srv/ts-config:/srv/config:ro`) and the deploy
 * ships it.
 *
 * WHAT IS ACTUALLY ASSERTED
 * -------------------------
 *   - run-instance.sh mounts the config volume
 *   - run-instance.sh REFUSES to start without it, so an empty volume
 *     is a loud failure rather than a server that boots without a
 *     map cycle
 *   - the deploy SHIPS the config files
 *   - the deploy creates the volume directory with the right ownership
 *     (the container reads it as uid 10001, gameserver)
 *   - a change to anything under tools/deploy/config/ triggers the
 *     services deploy — otherwise the config is shipped only when
 *     something else happens to change
 *   - deploy-services.sh can create the leaderboard's directory:
 *     /srv is root-owned, so without sudo the deploy dies at
 *     `mkdir` before replacing a single container
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { classifyChanges } from '../../tools/deploy/changed-paths.cjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const runInstance = readFileSync(
  join(ROOT, 'tools', 'deploy', 'run-instance.sh'),
  'utf8',
);
const deployServices = readFileSync(
  join(ROOT, 'tools', 'deploy', 'deploy-services.sh'),
  'utf8',
);
const deployYml = readFileSync(
  join(ROOT, '.github', 'workflows', 'deploy.yml'),
  'utf8',
);
const entrypoint = readFileSync(
  join(ROOT, 'tools', 'deploy', 'entrypoint.sh'),
  'utf8',
);
const botSay = readFileSync(join(ROOT, 'tools', 'deploy', 'config', 'bot_say.txt'));

test('the game server gets its config as a volume', () => {
  assert.match(
    runInstance,
    /-v "\$CONFIG:\/srv\/config:ro"/,
    'run-instance.sh must mount the config volume at /srv/config, ' +
      'which is where entrypoint.sh copies server.cfg from',
  );
});

test('the config volume is checked before the container is created', () => {
  // The entrypoint copies server.cfg, gameinfo.txt and mapcycle.txt
  // into the game directory and refuses to start without them. So an
  // empty or partial config volume takes the game server DOWN rather
  // than falling back to the image's baked-in copy. Checking it here
  // means the failure names the volume.
  for (const cfg of ['server.cfg', 'gameinfo.txt', 'mapcycle.txt']) {
    assert.ok(
      runInstance.includes(`"$CONFIG/$cfg"`),
      `run-instance.sh must check that $CONFIG/${cfg} exists`,
    );
  }
  assert.match(
    runInstance,
    /for cfg in server\.cfg gameinfo\.txt mapcycle\.txt/,
    'the config check must cover all three files the entrypoint needs',
  );
});

test('the deploy SHIPS the game server config', () => {
  for (const cfg of [
    'server.cfg',
    'gameinfo.txt',
    'mapcycle.txt',
    'bot_say.txt',
  ]) {
    assert.match(
      deployYml,
      new RegExp(`scp[^\\n]*config/${cfg}[^\\n]*prod:`),
      `the deploy must ship ${cfg} to the host`,
    );
  }
});

test('the deploy creates the config volume with the right ownership', () => {
  // The container runs as uid 10001 (gameserver). The volume is
  // root-owned like /srv itself, so it is made with sudo — and the
  // files inside have to be readable by that uid.
  assert.match(
    deployYml,
    /sudo mkdir -p \/srv\/ts-config/,
    'the deploy must create the config volume directory',
  );
  assert.match(
    deployYml,
    /10001:10001/,
    'the config volume must be owned by the uid the container reads it as',
  );
});

test('a change to the game server config triggers the services deploy', () => {
  // Without this the config is only shipped when something ELSE
  // changes — so a server.cfg fix could sit in the repo, merged and
  // CI-green, and never reach the host.
  for (const p of [
    'tools/deploy/config/server.cfg',
    'tools/deploy/config/gameinfo.txt',
    'tools/deploy/config/mapcycle.txt',
    'tools/deploy/config/bot_say.txt',
  ]) {
    const r = classifyChanges({ parentPaths: [p] });
    assert.equal(
      r.services,
      true,
      `a change to ${p} must trigger the services deploy — it is how ` +
        'the game server config reaches the host',
    );
  }
});

test('the deploy can create the leaderboard directory', () => {
  // /srv is root-owned and the deploy runs as `ubuntu`, so a plain
  // `mkdir -p /srv/ts-leaderboard` fails with "Permission denied" —
  // and under `set -e` that kills the deploy before a single
  // container is replaced. Measured on production, 2026-10-27.
  assert.match(
    deployServices,
    /sudo mkdir -p "\$LEADERBOARD_DIR"/,
    'the leaderboard directory must be created with sudo',
  );
  assert.doesNotMatch(
    deployServices,
    /^mkdir -p "\$LEADERBOARD_DIR"/m,
    'the leaderboard directory must NOT be created without sudo',
  );
});

test('the entrypoint installs OUR bot chat file over the stock one', () => {
  // The asset tree ships The Specialists' own bot_say.txt, and it is
  // profane in twenty of its lines. The banter is the charm; the
  // profanity is the noise — so ours replaces it in the game directory
  // and the asset tree keeps its copy (that tree is the operator's
  // pristine game install, and it is read-only).
  //
  // The order is the whole trick, and there are two ways to get it
  // wrong:
  //
  //   - cp BEFORE rm: the copy writes THROUGH the symlink into the
  //     read-only asset volume, and the boot dies with "Read-only
  //     file system".
  //   - cp BEFORE the asset symlink loop: the loop's `ln -sfn` puts
  //     the stock file straight back over ours.
  const rm = entrypoint.indexOf('rm -f "$GAME_TS/bot_say.txt"');
  const cp = entrypoint.indexOf(
    'cp "$CONFIG/bot_say.txt" "$GAME_TS/bot_say.txt"',
  );
  const loop = entrypoint.indexOf('ln -sfn "$entry" "$GAME_TS/$name"');

  assert.ok(rm > -1, 'the entrypoint must remove the stock symlink');
  assert.ok(cp > -1, 'the entrypoint must copy our bot_say.txt in');
  assert.ok(
    rm < cp,
    'the symlink must be removed BEFORE the copy — otherwise the copy ' +
      'writes through it into the read-only asset volume and the boot aborts',
  );
  assert.ok(
    loop < cp,
    'our copy must come AFTER the asset symlink loop — the loop ' +
      'symlinks the stock file, and `ln -sfn` over our copy would put it back',
  );
});

test('a missing bot chat file cannot take the game server down', () => {
  // The file is OPTIONAL: the bots fall back to the stock one, and a
  // config volume that is one deploy behind must not stop an instance
  // from starting. So the copy is guarded, and the guard has an arm
  // that says what happened.
  const guard = entrypoint.indexOf('if [ -f "$CONFIG/bot_say.txt" ]; then');
  const cp = entrypoint.indexOf(
    'cp "$CONFIG/bot_say.txt" "$GAME_TS/bot_say.txt"',
  );
  const fi = entrypoint.indexOf('fi', guard);

  assert.ok(guard > -1, 'the copy must be guarded by a test for the file');
  assert.ok(
    guard < cp && cp < fi,
    'the copy must be INSIDE the guard — an unguarded copy of a file ' +
      'that may not be there takes the instance down',
  );
  assert.match(
    entrypoint,
    /no bot_say\.txt in the config volume/,
    'the else arm must say that the bots will be silent, so the log ' +
      'names the cause instead of showing a silent server',
  );
});

test('the shipped bot chat file is the reviewed artifact, byte for byte', () => {
  // The artifact was reviewed as 2215 bytes of CRLF with a known
  // sha256. `core.autocrlf=input` normalises CRLF to LF when a file
  // is added, and that would silently make the repository's copy a
  // DIFFERENT file from the one that was reviewed — which is how the
  // two vendored TS 2.1 files drifted (see .gitattributes).
  //
  // The hash is here so that a change to the file is a DELIBERATE
  // one: it has to be made in the same commit as the new hash, and
  // the diff says so.
  assert.equal(
    createHash('sha256').update(botSay).digest('hex'),
    '953b0f8f46a13e7e3c6323064f4e470dff4066b953b5bab4382281c8dd9a7fa5',
    'the shipped bot_say.txt must be the reviewed artifact — if it ' +
      'changed on purpose, update this hash in the same commit',
  );
  assert.equal(botSay.length, 2215, 'the artifact is 2215 bytes');

  const text = botSay.toString('latin1');
  const lf = (text.match(/\n/g) || []).length;
  const crlf = (text.match(/\r\n/g) || []).length;
  assert.equal(
    lf,
    crlf,
    'every newline must be a CRLF — the artifact is a Windows file',
  );
});

test('the shipped bot chat file has the shape the port\'s parser expects', () => {
  // The port reads this file in three sections, and its own test
  // asserts the shipped counts are [25, 29, 42]. Ours has to keep
  // that shape: the parser substitutes the other player's name into
  // the FIRST `%s` only, and a line that is longer than the 63-byte
  // slot overflows into the next one.
  const lines = botSay
    .toString('latin1')
    .split('\r\n')
    .filter((l, i, a) => !(i === a.length - 1 && l === ''));

  const counts = {};
  let section = null;
  for (const line of lines) {
    const s = line.trim();
    if (s === 'offense' || s === 'freetime' || s === 'killed') {
      section = s;
      counts[section] = 0;
      continue;
    }
    if (section !== null && s !== '') counts[section] += 1;
  }
  assert.deepEqual(
    counts,
    { offense: 25, freetime: 29, killed: 42 },
    'the section counts must be the ones the port expects',
  );

  // The one long line is the KNOWN TS quirk: the shipped file's line
  // 29 is 65 bytes, one too many for the char[64] slot, and it
  // overflows into the next one. The port truncates it at 63. It is
  // kept byte-identical on purpose, so the port behaves exactly as it
  // does with the stock file.
  const long = lines
    .map((l, i) => [i + 1, l.length])
    .filter(([, n]) => n > 63);
  assert.deepEqual(
    long,
    [[29, 65]],
    'exactly one line may exceed 63 bytes, and it is the known quirk ' +
      'at line 29 — do not "fix" it, that is what keeps the port ' +
      'identical to stock',
  );
});

test('the leaderboard directory is owned by the registry, not world-writable', () => {
  // The registry runs as uid 10004 and has to be able to write the
  // board. The old `chmod 0777` made it writable by everyone on the
  // host; owning it by the registry's uid is both sufficient and
  // tighter.
  assert.match(
    deployServices,
    /sudo chown 10004:10004 "\$LEADERBOARD_DIR"/,
    'the leaderboard directory must be owned by the registry uid',
  );
  assert.doesNotMatch(
    deployServices,
    /chmod 0777 "\$LEADERBOARD_DIR"/,
    'the leaderboard directory must not be world-writable',
  );
});
