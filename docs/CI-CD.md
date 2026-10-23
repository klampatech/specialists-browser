# CI and CD

Three workflows, one of them standing in for a feature the plan does not
have yet.

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | PR to main, push to main | Typecheck, build, unit tests, image builds |
| `pr-required.yml` | push to main | Fails a commit that did not come from a pull request |
| `deploy.yml` | push to main | Ships to production, then verifies it in a real browser |

---

## Branch protection: the thing we cannot have yet

GitHub's branch protection and rulesets are only available on **private**
repositories under a paid plan. This repository is private and on the free
plan, so the API answers 403:

```
$ gh api repos/klampatech/specialists-browser/branches/main/protection
{
  "message": "Upgrade to GitHub Pro or make this repository public to
              enable this feature.",
  "status": "403"
}
```

Rulesets — the newer mechanism — are gated the same way.

**Two ways to fix it, and they are not equivalent:**

1. **GitHub Pro** (~$4/month). Enables real branch protection: require a
   pull request, require the CI check, block force pushes. This is the
   actual feature and it prevents the push rather than reporting it.
2. **Make the repository public.** Same effect, and it publishes the
   source — not a decision to make for a company repo by accident.

Until then, `pr-required.yml` is the substitute, and it is worth being
precise about what it does:

- It **detects** a direct push to main and turns the run red.
- It **blocks the deploy**, so a direct push does not reach production.
- It does **not** prevent the push. The commit is already on main by the
  time the workflow runs. Nothing on the free plan can do that.

The check is simple: a commit that came from a merged pull request is
associated with that pull request, and GitHub can be asked.

```bash
gh api "repos/$REPO/commits/$SHA/pulls" --jq 'length'
```

Zero means nobody opened a pull request for this commit.

---

## The regression suite

```bash
npm test
```

28 unit tests, and every one of them corresponds to a bug that reached
production. That is the design rule: **a test earns its place by locking
in a failure we actually had.** A test that covers a path we have never
had trouble with is maintenance, not protection.

| File | Locks in |
|---|---|
| `tests/unit/a2s-parser.test.mjs` | The bot count is at a byte offset in the GoldSrc reply. It was wrong once, and a wrong offset reports a *plausible* number rather than failing. |
| `tests/unit/bridge-allowlist.test.mjs` | The allowlist is a security boundary, not a convenience. Without it the bridge is an open UDP relay. An unknown target used to be accepted and closed afterwards, which a browser reads as "connected". |
| `tests/unit/fleet-logic.test.mjs` | Humans come from the bridge, not from A2S arithmetic. And an **empty** map from a reachable bridge means *zero humans*, not *unknown* — treating it as unknown brings the ghost problem straight back. |
| `tests/unit/slot.test.mjs` | Scale-out takes the lowest free index. "Highest + 1" walks off the end of a contiguous port range. |

### The frontend is a bun project

`webxash` has a `bun.lock`, not a `package-lock.json`. `npm ci` cannot
run there at all — there is no npm lockfile to install from.

Worse, two of its dependencies had been **unpublished from npm** on
2026-09-08:

```
$ npm view hlsdk-portable versions
npm error 404 Unpublished on 2026-09-08T14:17:21.709Z
```

Both were already stubbed out in the loader and neither was imported
anywhere, but both were still listed in `package.json` — so every fresh
install failed with a 404. The local build worked only because
`node_modules` was already populated. **Nothing in the repo could be
installed from scratch**, which is how the first CI run failed.

A dependency that cannot be installed is not a dependency. They are
removed, and `bun install --frozen-lockfile` now works from a clean
checkout.

To make the tests possible, four small pieces of logic moved into modules
of their own:

```
tools/port/tsp-rs/scripts/bridge-allowlist.cjs
services/registry/lib/fleet-logic.mjs
services/orchestrator/lib/slot.mjs
webxash/vite-a2s-plugin.mjs        (parseInfo is now exported)
```

**The trap to know about:** every one of those images copies its source
with an explicit `COPY` line, and each has an allowlist-style
`.dockerignore` (`**` then negate what is needed). A new module that is
not added to BOTH the Dockerfile and the `.dockerignore` produces an
image that starts and dies in the same second. `ci.yml` builds all three
images on every pull request for exactly this reason.

**A second trap, in the same family:** `public/hl/` holds three *tracked*
zips (168 MB) that are part of this repo, plus the TS archive and its
split parts (494 MB each) which are gitignored. So the build is 222 MB in
CI and 1.2 GB on a machine that has the archive lying around. The check
is for the specific files — `dist/hl/tsmod.zip` and `dist/hl/ts/` — and
not for `dist/hl` as a whole, because a blanket check fails on a clean
checkout for the wrong reason. The deploy excludes `hl/` regardless:
the archive is served from R2, not from the web bundle.

---

## The deploy

**What it deploys**

- the frontend bundle, always
- the control-plane images — `registry`, `orchestrator`, `bridge` — when
  their source changed

**What it does not deploy**

- **the game server image.** Its payload is the Rust port's compiled
  server DLL, which is a build artifact and is deliberately not committed
  (`.gitignore` has `*.so`). The game containers are also owned by the
  orchestrator, because scaling the fleet is a decision, not a
  deployment.
- **the game assets.** Those live in `/srv/ts-data` on the host and are
  mounted read-only. They are never in an image.

**How the images get there.** Streamed over SSH:

```bash
docker save "$img" | gzip -1 | ssh prod 'gunzip | docker load'
```

Not a registry, and that is a decision rather than an oversight. The
images contain our source, so a public package registry would publish
it; a private one would need a pull credential on the host for no
benefit at three images. The game server image is 176 MB and rarely
changes, and the control-plane images are small.

**The container definitions live in a script**, not in a shell history:

```
tools/deploy/deploy-services.sh
```

It is idempotent — running it with the same image tags leaves the fleet
exactly as it was — and it is the one place that knows how the control
plane is wired.

**The frontend is swapped, not overwritten.** Uploading to
`/srv/web.new` and renaming leaves no window where `index.html` is new
and the hashed assets it references are old, which is a blank page for
exactly as long as the upload takes.

**Restarting the bridge drops every open WebSocket.** The bridge holds
the players' connections, so it is recreated last, after the registry is
back up to tell it where the servers are.

---

## The browser verification

A green HTTP 200 from the landing page does not mean a player can get into
a game. That is exactly the failure the first real user hit: the **Play**
button downloaded 493 MB, booted the engine, and then failed — because
the launch options carried a development address, `127.0.0.1`, which from
a browser is *the player's own machine*.

Every e2e test at the time matched `/join/i`, so the suite was exercising
the path that already worked and every run passed.

So the deploy ends with a browser job that clicks **Play** for real and
checks the bridge saw a connection:

```
node tools/deploy/play-button-e2e.cjs https://bulletballet.dev/
node tools/deploy/two-player-e2e.cjs https://bulletballet.dev/ 2
```

Those scripts used to hard-code a Playwright path on one machine, which
made them unrunnable anywhere else. They now resolve Playwright from
`tools/deploy/lib/browser.cjs`: an explicit path, then a normal
`require('playwright')`, then the old local path as a fallback.

---

## Credentials

| Secret | What it is |
|---|---|
| `PROD_SSH_KEY` | A **dedicated** deploy key — not a personal one, so it can be revoked on its own |
| `PROD_SSH_HOST` | `40.160.225.81` |
| `PROD_SSH_USER` | `ubuntu` |

The key is in the host's `authorized_keys`. The port is open from
anywhere because the firewall already allowed SSH, and the host only
accepts key authentication.

**Anyone who can push to this repository can deploy to production.** That
is what a deploy key means. The gate in front of it is the pull-request
check.
