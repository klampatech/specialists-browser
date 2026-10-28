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
  for (const cfg of ['server.cfg', 'gameinfo.txt', 'mapcycle.txt']) {
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
