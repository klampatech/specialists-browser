# Control Plane — bridge, matchmaking, registry

**Status: BUILT (bridge + registry + orchestrator). Matchmaking not built.**

Last updated: 2026-10-23. Evidence and topology in
`docs/PRODUCTION-INFRA.md`.

This doc existed to put the forks on paper before code got written, because the
first one — *what runs where* — changes everything downstream. Two of the three
forks are now settled by construction rather than by argument, and the third
turned out to be a different question than the one that was asked.

---

## The three things

1. **Bridge** — WebSocket↔UDP. ✅ **Built.** Multi-target, allowlisted.
2. **Registry** — the fleet's source of truth. ✅ **Built.** A2S state,
   tickrate, bot count, health.
3. **Matchmaking** — assign players to instances. ❌ **Not built.** This is the
   next task — see `HANDOFF.md` § NEXT TASK.

The bridge was the smallest piece. The registry turned out to be the critical
path, as predicted: it unblocked the fleet, the autoscaling and the bot policy
together.

---

## Fork 1 — where does the control plane live? → **Option A, same box**

```
bb-prod (VPS-1 LZ, 2 vCore / 4 GB)
  ├── caddy        :443
  ├── registry     127.0.0.1:8081     (--network host)
  ├── orchestrator 127.0.0.1:8090     (--network host, docker socket)
  ├── bridge       127.0.0.1:27017    (--network host)
  └── N × ts-server containers        (udp 27015+)
```

**+$0/mo**, and correct at the player counts this project has.

The thing this analysis worried about — *"control plane and game plane share a
failure domain; a game-server OOM takes matchmaking down with it"* — is real
and still real. It has not been mitigated, because at one instance and 32 slots
there is nothing to mitigate it against. It is the first thing to revisit if
the fleet grows past one box, or if the Node services ever need to be more than
three small processes.

The registry and orchestrator both mount the Docker socket, which is
root-equivalent on the host. That is acceptable *here specifically* because the
host is a dedicated game box and `ubuntu` was already placed in the `docker`
group during the initial hardening — the same privilege. The services' own
code are the only things holding it.

The original recommendation stands and was followed: **Option A now, Option B
when the first player complains.** The registry and orchestrator were built
with env-var'd URLs and a docker socket rather than hardcoded paths, so
promoting them to a second box is a deploy rather than a rewrite.

---

## Fork 2 — where does state live? → **Nowhere yet, deliberately**

The registry is **stateless**. It polls the fleet and reports what it sees; it
owns nothing.

This is a deviation from the original lean (Postgres on the box, with backups
to R2), and it is worth being explicit about why: the registry was built to
*observe*, and an observer that owns durable state has two sources of truth
for the same fact. The registry's answer to "is ts-0 healthy" is always the
latest observation, never a cached belief.

The Postgres lean still stands for **when matchmaking needs it** — a player
connecting to an instance is a fact that outlives the connection, and that is
exactly the shape of thing a database is for. The same answer applies then:
Postgres on the box, automated backups to R2, in a **separate bucket**
(`ts-backups`) so the asset bucket's contents stay trivially auditable.

---

## Fork 3 — what does the registry answer? → **Not the question that was asked**

The original fork asked for a registry API shaped like:

> *"given player X and game mode M, which instance should they join?"*

**That question was not built, because it turned out to be two questions owned
by two different services.**

| Question | Owner | Why |
|---|---|---|
| "what instances exist, and are they healthy?" | the **registry** | it observes the fleet directly |
| "where do I send THIS player's packets?" | the **bridge** | it owns the socket, and it must answer without a network hop on the connection path |
| "which instance should this player join?" | **matchmaking** (not built) | it owns the assignment policy |

### The floor is the important part

The bridge does **not** take the registry's word for where it may send
packets. Without a floor, "the registry said so" is not a security property —
it is a suggestion from another service, and the bridge would be an open UDP
relay: anyone who could open a WebSocket could make the VPS send packets to
any host it can reach.

So the registry may tell the bridge **where** to send a packet. Only the floor
says whether it is **allowed** to. The floor is `127.0.0.1` on a static port
range (`BRIDGE_ALLOWED_PORTS`), covering every instance the fleet can ever
have — so it never has to be widened to add a server, and widening it is
always a deliberate act.

Unknown targets are refused **before** the WebSocket handshake completes, with
a plain HTTP 403. Validating afterwards would let the connection open
successfully and only then close, which reads to the client as "connected" and
hides the refusal.

### The port range, not the port list — and what it breaks

The port range fixed scale-out, and it broke the orchestrator in a way
that was easy to miss: with a fixed list of ports, the only ports were
the ones that existed. With a *range*, "the port does not answer" means
two different things — an instance that **crashed**, and an instance that
was **never deployed** — and the orchestrator treated both as a crash.

It restarted `ts-1` through `ts-7` every cycle against containers that did
not exist. Fifty failed attempts before it was noticed, and nothing about
the symptom said "wrong question": the restart calls returned a normal
Docker error, the action log filled with the same line, and `ts-0` was
perfectly healthy the whole time.

The fix is one question: **does the container exist?** If it does not, the
slot was never deployed and there is nothing to restart. If it does exist
and is not answering, that is a crash.

A failed action also now updates the cooldown, so a permanently-failing
action backs off instead of retrying every cycle and filling the log with
the same line.

### The port range, not the port list

The registry and the orchestrator derive their port list from
`TS_PORT_BASE + TS_INSTANCE_COUNT`. This matters more than it looks: a fixed
list of ports would mean every service needed editing before a scale-out, and
the one that was forgotten would be the one that silently failed — the
instance would come up, appear nowhere, and be unreachable.

This was a real bug, not a hypothetical. Scale-out was wired in name only:
starting a second instance produced a server-list entry the bridge then
refused with a 403. Verified fixed by starting `ts-1` on udp/27016 and
watching the registry pick it up and the bridge accept it, with no restart.

### Matchmaking strategy — still unresolved, and deliberately so

The original analysis of *how* to assign was:

**A. Round-robin / least-loaded** — simple, stateless, works. Doesn't know
about latency or skill. → correct until it isn't; fine for FFA.

**B. Latency-aware** — registry pings candidate instances, returns the
nearest. Needs measurement infrastructure. → the obvious upgrade once
players span coasts.

**C. Skill/matchmaking** — team or rating-based grouping. → **almost
certainly wrong for this game.** TS is FFA with no teams and no persistent
rating. "Matchmaking" here likely means *find me a server with room and low
ping*, which is (B) with a capacity check. Building a rating system for an
FFA deathmatch would be solving a problem nobody has.

**Recommendation, unchanged: A first, B when a second region exists, and do
not build C.** The naming is the trap — "matchmaking server" implies (C), and
the thing that will actually help players is (B).

What has *not* been decided is who computes it: the browser already picks
from the server list, so a server-side assignment is more work and more
correct (it can account for capacity the browser cannot see). That is a
design question for the matchmaking task, not a foregone conclusion here.

---

## What was built that was not in the plan

- **Tickrate collection.** A2S does not report tickrate. The engine does,
  but only through its console, so the registry reads it out of each
  container's console FIFO and correlates the reply against the container
  log.
- **Bot counting.** A2S counts bots as players, so without the bot count
  there is no way to tell a human from a bot — every occupied slot looks
  like a person.
- **Bot backfill.** Bots yield to humans automatically. A policy decision,
  not an engineering one, and it needed the two above.
- **Degradation detection** with hysteresis and a cooldown, so a one-frame
  tickrate dip (map change, bot respawn, GC pause) does not make the
  orchestrator thrash the fleet.

---

## What already exists and can be extended

Don't rebuild these:

| Component | Location | State |
|---|---|---|
| Bridge | `tools/port/tsp-rs/scripts/ts-udp-bridge.js` | **built**, multi-target, allowlisted, `/health` on :27017 |
| Registry | `services/registry/service.mjs` | **built**, `/api/servers` + `/api/registry` |
| Orchestrator | `services/orchestrator/service.mjs` | **built**, `/api/orchestrator` |
| A2S client | `webxash/vite-a2s-plugin.mjs` | works, shared by the registry and the dev middleware |
| A2S client (client) | `webxash/src/services/ts-server-list.ts` | works against the registry in production |
| Server image | `tools/deploy/Dockerfile.ts-server` | built, in the repo |
| Instance runner | `tools/deploy/run-instance.sh` | the one way to bring an instance up |

---

## Sequencing — what actually happened

Ordered so each step was independently useful and independently throwaway.

1. ✅ **Promote the container image** — into the repo.
2. ✅ **Deploy one TS server on `bb-prod`** — same binary locally and in a
   container on the new box.
3. ✅ **Deploy the bridge behind Caddy at `/bridge` on 443** — and delete the
   `27017/tcp` firewall rule, which was temporary by design.
4. ✅ **Upload the R2 payload** — the immutable-header-through-the-edge
   assumption was the untested one, and it held.
5. ⏸ **Load proof: 8 containers on the box** — still arithmetic (2.9 GB of
   3.9 GB), not a measurement. Deliberately deferred: it cannot be measured
   honestly until there are real users on the first instance, and a synthetic
   load test would produce a confident wrong number.
6. ✅ **Build the registry** — and the orchestrator alongside it, because a
   registry that observes but cannot act is only half a control plane.
7. ⏸ **Latency-aware selection** — only once a second region exists.

---

## Open questions, still open

1. **Game modes** — is everything FFA, or do powerups/pickup games ship?
   This drives whether the registry needs mode-aware routing at all.
2. **Player capacity per instance** — the engine advertises 32
   (`MAX_CLIENT_BITS=5`). Real capacity under real load is unmeasured.
3. **Does the bridge need to survive a game-plane restart** — reconnect
   players, or drop them and let matchmaking re-place?
4. **Metrics retention** — the registry collects per-instance tickrate,
   player count and bot count, but does not keep them over time. Until it
   does, "8 instances of 32 slots" is a budget and not a measurement.

---

## Explicitly deferred

- Stripping unused content from the archive — Kyle deferred this 2026-10-22:
  *"let's not start ripping stuff out quite yet, that can be a later
  optimization once we've decided on exactly what maps and gameplay we want
  the servers to run."*
- Skill-based matchmaking (§Fork 3 C) — wrong shape for this game.
- Second region — no reason to optimise for one.
