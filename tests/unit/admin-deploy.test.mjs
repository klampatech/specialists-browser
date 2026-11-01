/**
 * The deployment: the image, the deploy script, the boot config and the
 * tunnel.
 *
 * WHAT IS WORTH TESTING HERE
 * --------------------------
 * These are the files that decide what runs on the production box, and
 * three of the four mistakes they can make are INVISIBLE to a service
 * that starts and answers:
 *
 *   - the image carries a secret, or a game asset, and nothing says so
 *     until somebody reads `docker history`;
 *   - the console is bound to a public address, or is given the docker
 *     socket, and the deployment looks exactly like the one that was
 *     reviewed;
 *   - the RCON password ends up in the COMMITTED server.cfg, which is
 *     in the git history forever;
 *   - the boot config loses the password at the first map change,
 *     because the engine re-execs server.cfg.
 *
 * So the properties are pinned here, in the same way the other
 * regression tests in this repository pin the properties that bit us.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import net from 'node:net';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

const DOCKERFILE = join(repoRoot, 'services/admin/Dockerfile.admin');
const DEPLOY = join(repoRoot, 'tools/deploy/deploy-services.sh');
const ENTRYPOINT = join(repoRoot, 'tools/deploy/entrypoint.sh');
const RUN_INSTANCE = join(repoRoot, 'tools/deploy/run-instance.sh');
const TUNNEL = join(repoRoot, 'tools/admin/tunnel.sh');
const SERVER_CFG = join(repoRoot, 'tools/deploy/config/server.cfg');

const dockerfile = readFileSync(DOCKERFILE, 'utf8');
const deploy = readFileSync(DEPLOY, 'utf8');

/**
 * The source paths a Dockerfile copies.
 *
 * A path ending in `/` is a directory: every file under it is copied.
 * A path without one is a single file.
 *
 * @param {string} text
 * @returns {string[]}
 */
function copySources(text) {
  const sources = [];
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*COPY\s+(?:--\S+\s+)*(\S+)(?:\s+(\S+))?\s*$/);
    if (m) sources.push(m[1]);
  }
  return sources;
}

/* ================================================================== */
/* the image                                                            */
/* ================================================================== */

test('the image copies the modules and the UI as DIRECTORIES', () => {
  const sources = copySources(dockerfile);
  // One COPY per directory, not one per file: adding a module must
  // not mean remembering to add a line here (the registry shipped an
  // image that could not import its own module, and crash-looped in
  // production for it).
  assert.ok(sources.includes('services/admin/lib/'), 'the lib/ directory');
  assert.ok(sources.includes('services/admin/public/'), 'the public/ directory');
});

test('the image has no npm install step', () => {
  // The service has no dependencies at all. A Dockerfile that grows an
  // install step is a service that can fail to be built.
  //
  // The COMMENTS are not instructions: the header explains WHY there is
  // no install step, and it says the words "npm install" while doing it.
  // So the check is against the Dockerfile's instructions only -- the
  // lines that are not comments.
  const instructions = dockerfile
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('#'))
    .join('\n');
  assert.doesNotMatch(instructions, /npm (install|ci)\b/);
  assert.doesNotMatch(instructions, /yarn|pnpm/i);
});

test('the image runs as a NON-ROOT user with its own uid', () => {
  const m = dockerfile.match(/useradd[^\n]*--uid (\d+)/);
  assert.ok(m, 'the image must create its own user');
  const uid = Number(m[1]);
  // 10006: the block is 10001 gameserver, 10002 a2s, 10003 bridge,
  // 10004 registry, 10005 orchestrator.
  assert.equal(uid, 10006);
  // And it is the USER the container runs as.
  const users = [...dockerfile.matchAll(/^USER\s+(\S+)/gm)].map((x) => x[1]);
  assert.ok(users.length > 0, 'the image must say who it runs as');
  assert.notEqual(users[users.length - 1], 'root');
});

test('the admin uid is not another service\'s uid', () => {
  // Two services with the same uid can read each other's files on the
  // host, and the audit log and the password record are the whole
  // point of the separation.
  const others = ['services/registry/Dockerfile.registry', 'services/orchestrator/Dockerfile.orchestrator', 'tools/deploy/Dockerfile.bridge', 'tools/deploy/Dockerfile.ts-server', 'services/a2s/Dockerfile.a2s'];
  const taken = new Set();
  for (const file of others) {
    const text = readFileSync(join(repoRoot, file), 'utf8');
    for (const m of text.matchAll(/--uid (\d+)/g)) taken.add(Number(m[1]));
  }
  assert.ok(!taken.has(10006), `10006 is already used by another service`);
});

test('the image copies no secret and no game asset', () => {
  for (const src of copySources(dockerfile)) {
    assert.doesNotMatch(src, /rcon_password|auth\.json|actions\.log|secret/i);
    assert.doesNotMatch(src, /\.(bsp|pak|mdl|wav|spr)$/i);
  }
  // And the build context is allowlisted to the console's own files.
  const ignore = readFileSync(`${DOCKERFILE}.dockerignore`, 'utf8');
  assert.match(ignore, /^\*\*$/m);
  assert.match(ignore, /^!services\/admin\/lib\/$/m);
  assert.match(ignore, /^!services\/admin\/public\/$/m);
});

/**
 * Is docker usable here?
 *
 * @returns {boolean}
 */
function dockerWorks() {
  const r = spawnSync('docker', ['version', '--format', '{{.Server.Version}}'], {
    encoding: 'utf8',
  });
  return r.status === 0 && String(r.stdout).trim().length > 0;
}

test(
  'the image BUILDS, and carries no game assets and no secret',
  { skip: dockerWorks() ? false : 'docker is not available here' },
  () => {
    const build = spawnSync(
      'docker',
      ['build', '-f', 'services/admin/Dockerfile.admin', '-t', 'admin:test', '.'],
      { cwd: repoRoot, encoding: 'utf8' },
    );
    assert.equal(build.status, 0, `the image must build:\n${build.stderr}`);

    const inspect = spawnSync(
      'docker',
      [
        'run',
        '--rm',
        '--entrypoint',
        'sh',
        'admin:test',
        '-c',
        'find / -xdev \\( -name "*.bsp" -o -name "*.pak" -o -name "*.mdl" -o -name "rcon_password*" -o -name "auth.json" \\) 2>/dev/null | head -5',
      ],
      { encoding: 'utf8' },
    );
    assert.equal(inspect.status, 0);
    assert.equal(
      inspect.stdout.trim(),
      '',
      `the image must carry no assets and no secret:\n${inspect.stdout}`,
    );

    // And it runs as the uid it says it does, with the shared group.
    const who = spawnSync(
      'docker',
      ['run', '--rm', '--entrypoint', 'id', 'admin:test'],
      { encoding: 'utf8' },
    );
    assert.match(who.stdout, /uid=10006\(/);
    // The shared secret group: the file is owned by root and read by
    // this group, and the game server is added to it at run time.
    assert.match(who.stdout, /10007\(tsrcon\)/);
  },
);

/* ================================================================== */
/* the deploy script                                                    */
/* ================================================================== */

/**
 * The `replace admin` block, as the script writes it.
 *
 * @returns {string}
 */
function adminBlock() {
  const m = deploy.match(/replace admin \\\n[\s\S]*?\n\s*"\$ADMIN_IMAGE"/);
  assert.ok(m, 'the deploy script must have a `replace admin` block');
  return m[0];
}

test('the admin container binds LOOPBACK ONLY', () => {
  const block = adminBlock();
  assert.match(block, /-e ADMIN_HOST=127\.0\.0\.1/);
  assert.match(block, /-e ADMIN_PORT=8095/);
  // And it publishes no port at all: it is on the host's own network
  // namespace, and the only way in is the tunnel.
  assert.doesNotMatch(block, /(?:^|\s)-p\s/);
  assert.doesNotMatch(block, /EXPOSE/);
});

test('the admin container gets the fleet\'s real shape', () => {
  const block = adminBlock();
  assert.match(block, /-e TS_PORT_BASE=27015/);
  assert.match(block, /-e TS_INSTANCE_COUNT=8/);
});

test('the admin container is told where the ORCHESTRATOR is', () => {
  const block = adminBlock();
  // The fleet comes from the orchestrator's deployed list, and the
  // orchestrator is on the host's own loopback.
  assert.match(block, /-e ORCHESTRATOR_URL=http:\/\/127\.0\.0\.1:8090/);
  // And it is still a loopback url: the console reaches nothing else.
  assert.doesNotMatch(block, /-e ORCHESTRATOR_URL=http:\/\/(?!127\.0\.0\.1)/);
});

test('the admin container mounts the secret READ-ONLY', () => {
  const block = adminBlock();
  assert.match(block, /-v "\$RCON_SECRET:\/srv\/ts-admin\/rcon_password:ro"/);
  // The secret is a FILE, and the file is read-only.
  assert.match(block, /-e RCON_PASSWORD_FILE=/);
  // And the environment variable is NOT used: it is visible in
  // `docker inspect` and in /proc/<pid>/environ.
  assert.doesNotMatch(block, /-e RCON_PASSWORD=/);
  assert.doesNotMatch(deploy, /-e RCON_PASSWORD=/);
});

test('the admin container gets NO docker socket', () => {
  // The console uses RCON precisely so that it does not need one
  // (docs/ADMIN-CONSOLE.md §3.3). The socket is root-equivalent on
  // the host.
  const block = adminBlock();
  assert.doesNotMatch(block, /docker\.sock/);
  assert.doesNotMatch(block, /--group-add "\$DOCKER_GID"/);
});

test('the administrator\'s record is read-only and the audit log is writable', () => {
  const block = adminBlock();
  // The record is mounted as a DIRECTORY, read-only: adminctl writes
  // it atomically, and a rename replaces the directory entry, so a
  // bind-mounted FILE would keep pointing at the old inode.
  assert.match(block, /-v "\$ADMIN_DIR\/auth:\/srv\/ts-admin\/auth:ro"/);
  // The audit log's directory is writable, so the console creates its
  // own file as its own uid and the log survives the container.
  assert.match(block, /-v "\$ADMIN_DIR\/audit:\/srv\/ts-admin\/audit"/);
  assert.doesNotMatch(block, /-v "\$ADMIN_DIR\/audit:[^"]*:/);
});

test('the deploy SKIPS the console when the secret is not provisioned', () => {
  // A console with no RCON password reports every instance as
  // "refused", which looks like a network fault -- and the service
  // refuses to start, so the container would crash-loop.
  //
  // But the console has NOT been cut over yet, and the registry, the
  // orchestrator and the bridge have PLAYERS on them. So a deploy that
  // stopped over a console nobody is using yet would be a worse outage
  // than the one it prevents: the deploy SKIPS the console, loudly, and
  // deploys the rest.
  assert.match(deploy, /if ! sudo test -f "\$RCON_SECRET"; then/);
  assert.match(deploy, /ADMIN_READY=0/);
  assert.match(deploy, /SKIPPING the admin console/);
  assert.match(deploy, /ADMIN-CONSOLE-RUNBOOK/);
  // And the block itself is inside the "ready" branch, so a skipped
  // console never gets a container.
  assert.match(deploy, /if \[ "\$ADMIN_READY" = "1" \]; then\n  replace admin/);
});

test('the deploy STOPS on a secret that is empty or world-readable', () => {
  // An empty file is a provisioning accident -- `touch` and a forgotten
  // `cat` -- and a world-readable file is a leaked password. Neither is
  // something to deploy around: the operator has to fix it.
  assert.match(deploy, /elif ! sudo test -s "\$RCON_SECRET"; then/);
  assert.match(deploy, /world-accessible/);
});

test('the deploy asks about the secret WITH AUTHORITY', () => {
  // THIS IS A REGRESSION TEST FOR A BUG THAT SHIPPED.
  //
  // The state directory is 0700 and owned by the console's own uid
  // (10006). The deploy script runs as the deploy user (ubuntu), who is
  // neither that uid nor in the shared group -- so it CANNOT TRAVERSE
  // into /srv/ts-admin. A plain `[ -f "$RCON_SECRET" ]` therefore
  // answers "no such file" for a secret that is provisioned and correct,
  // and the deploy skipped the console on 2026-11-01 with the message
  // "the RCON secret is not provisioned".
  //
  // The directory being private is CORRECT -- it is the secret's home.
  // So the gate has to ask the question with the authority to ask it.
  // Every check on the secret must be sudo, and none of them may be the
  // bare form.
  assert.match(deploy, /sudo test -f "\$RCON_SECRET"/);
  assert.match(deploy, /sudo test -s "\$RCON_SECRET"/);
  assert.match(deploy, /sudo stat -c '%a' "\$RCON_SECRET"/);
  // And the bare forms must be gone: one of them coming back is the
  // bug coming back.
  assert.doesNotMatch(deploy, /\[ ! -f "\$RCON_SECRET" \]/);
  assert.doesNotMatch(deploy, /\[ ! -s "\$RCON_SECRET" \]/);
  // The lookbehind matters: `sudo stat -c ...` CONTAINS `stat -c ...`,
  // so a plain negative pattern would fail on the FIXED line and pass
  // on the broken one, which is exactly backwards.
  assert.doesNotMatch(deploy, /(?<!sudo )stat -c '%a' "\$RCON_SECRET"/);
  // The runbook pins the directory's mode, so the two facts cannot
  // drift apart: 0700 is what makes the unprivileged check a lie.
  const runbook = readFileSync(join(repoRoot, 'docs/ADMIN-CONSOLE-RUNBOOK.md'), 'utf8');
  assert.match(runbook, /chmod 0700 \/srv\/ts-admin \/srv\/ts-admin\/auth/);
});

test('the state directory the deploy makes is PRIVATE to the console', () => {
  // The other half of the same fact, pinned on the deploy side: the
  // deploy creates the state directory 0700 and owned by the console's
  // uid. If this ever becomes 0755 the gate's sudo would be
  // unnecessary -- and if it becomes 0777 the secret is exposed to
  // every uid on the box.
  assert.match(deploy, /sudo chmod 0700 "\$ADMIN_DIR" "\$ADMIN_DIR\/auth"/);
  assert.match(deploy, /sudo chown "\$ADMIN_UID:\$ADMIN_GID" "\$ADMIN_DIR"/);
});

test('the deploy builds the admin image when the repository is here', () => {
  // A deploy that starts a container from an image that happened to be
  // on the host is a deploy that can ship a stale console.
  assert.match(deploy, /docker build -f "\$ADMIN_CONTEXT\/services\/admin\/Dockerfile\.admin"/);
});

/* ================================================================== */
/* the boot config                                                      */
/* ================================================================== */

/**
 * A fake game tree for the entrypoint: the asset volume, the config
 * volume, the server DLL and an empty game directory.
 *
 * @returns {string} the scratch directory
 */
function entrypointFixture() {
  const root = mkdtempSync(join(tmpdir(), 'admin-entrypoint-'));
  mkdirSync(join(root, 'assets/ts/maps'), { recursive: true });
  writeFileSync(join(root, 'assets/ts/maps/ts_casa.bsp'), 'bsp');
  mkdirSync(join(root, 'assets/valve'), { recursive: true });
  mkdirSync(join(root, 'config'), { recursive: true });
  writeFileSync(join(root, 'config/server.cfg'), 'sv_aim 0\nmp_timelimit 15\n');
  writeFileSync(join(root, 'config/gameinfo.txt'), 'gameinfo\n');
  writeFileSync(join(root, 'config/mapcycle.txt'), 'ts_casa\n');
  mkdirSync(join(root, 'server'), { recursive: true });
  writeFileSync(join(root, 'server/ts_amd64_amd64.so'), 'dll');
  mkdirSync(join(root, 'ts'), { recursive: true });
  mkdirSync(join(root, 'valve'), { recursive: true });
  return root;
}

/**
 * Signal a child's whole process group.
 *
 * @param {import('node:child_process').ChildProcess} child
 * @param {NodeJS.Signals} signal
 */
function killGroup(child, signal) {
  try {
    process.kill(-child.pid, signal);
  } catch {
    // The group is already gone -- which is the state we wanted.
    try {
      child.kill(signal);
    } catch {
      // Nothing left to kill.
    }
  }
}

/**
 * Run the entrypoint against a fake game tree, and stop it once the
 * engine has started.
 *
 * @param {string} root the fixture
 * @param {string|null} secret the secret file, or null for none
 * @returns {Promise<{out: string, started: boolean}>}
 */
function runEntrypoint(root, secret) {
  const marker = join(root, 'engine-started');
  const fakeEngine = join(root, 'fake-engine.sh');
  // `exec`, so the engine IS the sleep: when the entrypoint is stopped,
  // the sleep dies with it. A child sleep would survive, keep the
  // output pipe open, and hang the test runner at the end of the file.
  writeFileSync(fakeEngine, `#!/bin/sh\ntouch "${marker}"\nexec sleep 300\n`);
  chmodSync(fakeEngine, 0o755);

  return new Promise((resolve) => {
    const child = spawn('sh', [ENTRYPOINT, fakeEngine], {
      // Its own process group: the entrypoint starts the engine in a
      // pipeline, and stopping the whole group is the only way to be
      // sure nothing is left running after the test.
      detached: true,
      env: {
        ...process.env,
        GAME_TS: join(root, 'ts'),
        GAME_VALVE: join(root, 'valve'),
        ASSETS: join(root, 'assets'),
        CONFIG: join(root, 'config'),
        SERVER_DLL: join(root, 'server/ts_amd64_amd64.so'),
        RCON_SECRET: secret ?? join(root, 'no-such-secret'),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    child.stdout.on('data', (d) => {
      out += d;
    });
    child.stderr.on('data', (d) => {
      out += d;
    });
    const deadline = Date.now() + 10_000;
    const poll = setInterval(() => {
      if (existsSync(marker) || Date.now() > deadline) {
        clearInterval(poll);
        killGroup(child, 'SIGTERM');
        setTimeout(() => {
          killGroup(child, 'SIGKILL');
          child.stdout?.destroy();
          child.stderr?.destroy();
          resolve({ out, started: existsSync(marker) });
        }, 300);
      }
    }, 50);
  });
}

test('the entrypoint puts the password in the COPY, not in the committed file', async () => {
  const root = entrypointFixture();
  const secret = join(root, 'rcon_password');
  writeFileSync(secret, 'the-boot-password\n');
  const before = readFileSync(join(root, 'config/server.cfg'), 'utf8');

  const { out, started } = await runEntrypoint(root, secret);
  assert.equal(started, true, `the engine must start:\n${out}`);

  // The COPY carries the password, in the form the engine execs.
  const copied = readFileSync(join(root, 'ts/server.cfg'), 'utf8');
  assert.match(copied, /^rcon_password "the-boot-password"$/m);

  // The committed file does not change. Not one byte.
  assert.equal(readFileSync(join(root, 'config/server.cfg'), 'utf8'), before);
  assert.doesNotMatch(before, /rcon_password/);
});

test('the entrypoint never prints the password', async () => {
  const root = entrypointFixture();
  const secret = join(root, 'rcon_password');
  writeFileSync(secret, 'the-boot-password\n');
  const { out } = await runEntrypoint(root, secret);
  assert.equal(out.includes('the-boot-password'), false, `the password was printed:\n${out}`);
});

test('a MISSING secret does not stop the fleet from booting', async () => {
  const root = entrypointFixture();
  const { out, started } = await runEntrypoint(root, null);
  // The engine starts. That is the whole point: a missing optional
  // secret must never stop a game server from starting, because that
  // would be a much worse outage than the one it prevents.
  assert.equal(started, true, `the engine must still start:\n${out}`);
  // And there is no rcon_password in the config, because there is no
  // password to put there.
  const copied = readFileSync(join(root, 'ts/server.cfg'), 'utf8');
  assert.doesNotMatch(copied, /rcon_password/);
});

test('the game container mounts the secret read-only, and only if it is there', () => {
  const script = readFileSync(RUN_INSTANCE, 'utf8');
  assert.match(script, /-v "\$RCON_SECRET:\/srv\/secrets\/rcon_password:ro"/);
  // The mount is conditional: docker creates a missing bind source as
  // a DIRECTORY, and a directory where a password file should be is a
  // trap.
  assert.match(script, /if \[ -f "\$RCON_SECRET" \]; then/);
  // And the game server is put in the group that can read it.
  assert.match(script, /--group-add "\$RCON_GID"/);
});

/* ================================================================== */
/* the tunnel                                                           */
/* ================================================================== */

/**
 * A free TCP port.
 *
 * @returns {Promise<number>}
 */
function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

/**
 * Is something listening on this port?
 *
 * @param {number} port
 * @returns {Promise<boolean>}
 */
function portIsOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 1000);
  });
}

test('the tunnel script REFUSES to start twice', async () => {
  const port = await freePort();
  // Something is already listening -- which is what a second tunnel
  // would find.
  const blocker = net.createServer(() => {});
  await new Promise((resolve) => blocker.listen(port, '127.0.0.1', resolve));

  try {
    const run = spawnSync('bash', [TUNNEL], {
      encoding: 'utf8',
      env: {
        ...process.env,
        ADMIN_TUNNEL_LOCAL_PORT: String(port),
        ADMIN_TUNNEL_KEY: '/dev/null',
      },
    });
    assert.notEqual(run.status, 0, 'it must fail');
    const message = `${run.stdout}${run.stderr}`;
    assert.match(message, /already listening/);
    // And it must not have started anything.
    assert.doesNotMatch(message, /the admin console is at/);
  } finally {
    await new Promise((resolve) => blocker.close(resolve));
  }
});

test('the tunnel script leaves NOTHING BEHIND', async () => {
  const port = await freePort();
  const dir = mkdtempSync(join(tmpdir(), 'admin-tunnel-'));
  const fakeSsh = join(dir, 'fake-ssh.mjs');
  // A stand-in for ssh: it holds the local port open, the way a
  // forward does.
  writeFileSync(
    fakeSsh,
    `import net from 'node:net';
const args = process.argv.slice(2);
let spec = '';
for (let i = 0; i < args.length; i += 1) if (args[i] === '-L') spec = args[i + 1];
const port = Number(spec.split(':')[0]);
net.createServer(() => {}).listen(port, '127.0.0.1');
setInterval(() => {}, 1 << 30);
`,
  );
  // The script runs the ssh binary as a single word, so the stand-in
  // is a WRAPPER: a path to an executable, not a command line.
  const fakeSshBin = join(dir, 'fake-ssh');
  writeFileSync(fakeSshBin, `#!/bin/sh\nexec node "${fakeSsh}" "$@"\n`);
  chmodSync(fakeSshBin, 0o755);
  const key = join(dir, 'key');
  writeFileSync(key, 'not a real key');

  const child = spawn('bash', [TUNNEL], {
    // Its own process group, so the SAFETY NET below can take the
    // whole thing down if an assertion fails first. The assertion
    // itself only ever signals the script.
    detached: true,
    env: {
      ...process.env,
      ADMIN_TUNNEL_LOCAL_PORT: String(port),
      ADMIN_TUNNEL_KEY: key,
      ADMIN_TUNNEL_SSH: fakeSshBin,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  child.stdout.on('data', (d) => {
    out += d;
  });
  child.stderr.on('data', (d) => {
    out += d;
  });

  try {
    // Wait for the forward AND for the script's own line. The URL is
    // printed once the forward is up, and a test that races the print
    // would fail for a reason that has nothing to do with the tunnel.
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      if (out.includes('the admin console is at') && (await portIsOpen(port))) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.equal(await portIsOpen(port), true, `the tunnel must come up:\n${out}`);
    assert.match(out, /the admin console is at http:\/\/127\.0\.0\.1:/);

    // Now stop it the way an operator stops it: SIGTERM to the script.
    child.kill('SIGTERM');
    if (child.exitCode === null && child.signalCode === null) {
      await new Promise((resolve) => child.on('exit', resolve));
    }

    // And the port is free again: nothing was left behind.
    const deadline2 = Date.now() + 5_000;
    while (Date.now() < deadline2) {
      if (!(await portIsOpen(port))) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.equal(
      await portIsOpen(port),
      false,
      'the tunnel must not leave a half-open forward behind',
    );
  } finally {
    // THE SAFETY NET. Whatever happened above, this test leaves no ssh
    // behind: a forward that outlives the test would keep the test
    // runner's output pipe open and hang the whole suite.
    killGroup(child, 'SIGKILL');
    child.stdout?.destroy();
    child.stderr?.destroy();
  }
});

/* ================================================================== */
/* the secret is not in the repository                                   */
/* ================================================================== */

/**
 * Every file in the repository that is ours to check.
 *
 * @returns {string[]}
 */
function repoFiles() {
  const out = [];
  const skip = new Set(['node_modules', '.git', 'webxash', 'dist', 'screenshots']);
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) out.push(full);
    }
  };
  walk(repoRoot);
  return out;
}

test('no file in the repository carries an rcon_password with a real value', () => {
  // A placeholder is fine -- the entrypoint writes one, and the
  // runbook shows the shape. A VALUE is not: it would be in the git
  // history forever.
  const isPlaceholder = (v) => /^(%s|<[^>]*>|\$\{?\w+\}?|\{?\w+\}?)$/.test(v.trim());
  const offenders = [];
  for (const file of repoFiles()) {
    // This file carries a FAKE password: it is the fixture the
    // entrypoint test writes and reads back. A fake password in a test
    // is not a secret; it is the thing that proves a real one is not
    // there.
    if (file === fileURLToPath(import.meta.url)) continue;
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/rcon_password\s+["']([^"'\n]+)["']/g)) {
      if (!isPlaceholder(m[1])) {
        offenders.push(`${file.replace(repoRoot, '.')}: ${m[0]}`);
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    'these files carry an rcon_password with a value in it — the secret ' +
      'belongs in a file on the host and nowhere else',
  );
});
