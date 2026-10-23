# Control Plane — bridge, matchmaking, registry

**Status: PLANNING. Nothing built. No decisions locked.**

This exists to put the forks on paper before code gets written, because the first
one — *what runs where* — changes everything downstream.

---

## The three things to build

1. **Bridge** — WebSocket↔UDP. Exists and works, single-target. Needs to become multi-target.
2. **Registry** — the thing the bridge consults to know *which* game server a player should join. Does not exist.
3. **Matchmaking** — assign players to instances. Does not exist.

The bridge is the smallest piece. The registry is the critical path: it unblocks
the fleet, autoscaling, and matchmaking together, and none of the three can be
built usefully before it.

---

## Fork 1 — where does the control plane live? ⬅ **decide first**

Three options. They are not equally reversible.

### Option A — same box as the game plane

```
bb-prod (VPS-1 LZ, 2 vCore / 4 GB)
  ├── caddy        :443
  ├── bridge       :27017 (behind /bridge)
  ├── registry + matchmaking + A2S
  └── 8 × ts-server containers   (363 MB each = 2.9 GB)
```

- **+$0/mo.** Nothing new to buy.
- Cheapest possible start, and correct at low player counts.
- **2 vCores** now run Caddy + Node services *and* 8 GoldSrc servers. Idle is fine; **under load this is the first thing to saturate.**
- Control plane and game plane share a failure domain. A game-server OOM takes matchmaking down with it.

### Option B — second VPS-1, control plane only

```
bb-prod  ($6.54)  caddy + bridge + 8 game containers
bb-ctl   ($6.54)  registry + matchmaking + A2S + DB
```

- **+$6.54/mo.** Still trivially cheap.
- Independent failure domains; control plane survives a game-plane restart.
- Room to run a real database without squeezing the game servers.
- **The bridge must reach the game plane over the network** — cross-VPS UDP, which adds a hop the current single-box setup doesn't have.

### Option C — free-tier / local control plane

Fly.io / Render / a local box for dev, real host in production.

- **+$0**, but a split environment that behaves differently from production is a
  reliable source of "works on my machine".
- Not worth it until something at real scale forces the question.

### Recommendation

**Option A now, Option B when the first player complains.**

The reasoning: with one box, an extra hop doesn't exist, Caddy is local, and every
debug is a single `ssh`. None of that complexity needs paying for until there are
enough players to notice. But the registry's storage and API shape should be built
as if it were Option B from day one — a Postgres connection string and an env-var'd
registry URL — so promoting it later is a deploy, not a rewrite.

---

## Fork 2 — where does state live?

The registry needs durable state (instances, players, capacity). Three candidates:

| | Postgres on the box | Managed (Neon / Supabase) | SQLite |
|---|---|---|---|
| Setup | apt + tune | account + connection string | zero |
| Survives box death | no — needs backups | yes | no |
| Cost | free | free tier covers a long time | free |
| Migration cost | — | low | low |
| Ops burden | backups, upgrades | none | backups |

**Lean: Postgres on the box now**, with automated backups to R2, because a managed
provider adds an account and a dependency to solve a problem that a 40 GB disk and
`pg_dump` doesn't have yet. Move to managed when the box's failure modes start
costing more than the dependency.

Note the R2 bucket is asset-only by policy — backups are *ours*, so that policy does
not block them, but keep them in a **separate bucket** (`ts-backups`) so the asset
bucket's contents stay trivially auditable.

---

## Fork 3 — registry API shape

The bridge needs to answer one question: *"given player X and game mode M, which
instance should they join?"* Everything else follows from how that answer is
computed.

Three candidate strategies:

**A. Round-robin / least-loaded**
Simple, stateless, works. Doesn't know about latency or skill.
→ correct until it isn't; fine for FFA.

**B. Latency-aware**
Registry pings candidate bridges, returns the nearest. Needs measurement infrastructure.
→ the obvious upgrade once players span coasts.

**C. Skill/matchmaking**
Team or rating-based grouping.
→ **almost certainly wrong for this game.** TS is FFA with no teams and no persistent
rating. "Matchmaking" here likely means *find me a server with room and low ping*,
which is (B) with a capacity check. Building a rating system for an FFA deathmatch
would be solving a problem nobody has.

**Recommendation: A first, B when a second region exists, and do not build C.**

The naming is the trap here — "matchmaking server" implies (C), and the thing that
will actually help players is (B).

---

## What already exists and can be extended

Don't rebuild these:

| Component | Location | State |
|---|---|---|
| Bridge | `tools/port/tsp-rs/scripts/ts-udp-bridge.js` | **works**, single-target, `/health` on :27017 |
| A2S client | `webxash/vite-a2s-plugin.mjs` | works, **dev-only**, Node-side |
| A2S client (client) | `webxash/src/services/ts-server-list.ts` | works against the dev middleware |
| Server binary + image | `tools/port/ts-server-dll/build-matrix/` | built; Dockerfile still in `/tmp` |
| Instance config | `/tmp/tsds/ts/server.cfg` | FFA, ruleset 30, `mp_teamlist` 4 teams |

The bridge's `serverAddr` is currently a constructor argument. Making it a
**registry lookup at join time** is the smallest change that turns it into a
multi-target bridge.

---

## Sequencing

Ordered so each step is independently useful and independently throwaway.

1. **Promote the container image** — `/tmp/tsds/Dockerfile` → the repo. Nothing
   else is deployable without it.
2. **Deploy one TS server on `bb-prod`.** Prove the same binary that works locally
   works in a container on the new box. Boring, and it de-risks everything after.
3. **Deploy the bridge on `bb-prod`, behind Caddy at `/bridge` on 443.** Then delete
   the `27017/tcp` firewall rule, which is temporary by design.
4. **Upload the R2 payload.** Bucket and custom domain are already live; the
   immutable-header-through-the-edge verification is the one untested assumption.
5. **Load proof: 8 containers on the box.** This is currently arithmetic
   (2.9 GB of 3.9 GB), not a measurement. Measure it, then either confirm the plan
   or discover why it's wrong.
6. **Build the registry.** Behind the `InstanceProvider` seam already defined in
   `object-store.mjs` (`provision` / `destroy` / `list`).
7. **Latency-aware selection.** Only once a second region exists.

---

## Open questions to settle before writing code

1. **Fork 1** — is `bb-prod` both planes, or do we buy a second box?
2. **Game modes** — is everything FFA, or do powerups/pickup games ship? This drives
   whether the registry needs mode-aware routing at all. *Deferred: the archive is
   still whole (493 MB) pending an explicit decision on which maps ship.*
3. **Player capacity per instance** — the architecture doc models 8/instance, but the
   engine advertises 32 (`MAX_CLIENT_BITS=5`). 8 was a modelling choice, not a limit.
   Real answer changes the whole fleet-sizing story.
4. **Autoscaling trigger** — CPU? tickrate degradation? player count? Tickrate is
   the honest signal for a game server, and it is **not currently instrumented**.
5. **Does the bridge need to survive a game-plane restart** — i.e. reconnect players,
   or drop them and let matchmaking re-place?

---

## Explicitly deferred

- Stripping unused content from the archive — Kyle deferred this 2026-10-22: *"let's
  not start ripping stuff out quite yet, that can be a later optimization once we've
  decided on exactly what maps and gameplay we want the servers to run."*
- Skill-based matchmaking (§Fork 3 C) — wrong shape for this game.
- Second region — no reason to optimise for one.