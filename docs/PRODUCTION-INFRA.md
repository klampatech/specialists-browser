# Production Infrastructure

**Status:** provisioned, hardened, partially wired. Asset delivery live; game plane still local.

Everything here is **measured**, not estimated, except where explicitly marked `UNVERIFIED`.

---

## 1. Decision record

| Decision | Choice | Why |
|---|---|---|
| Object storage | **Cloudflare R2** | Egress is free. At 1,000 new players the payload costs **$0.36/mo on R2 vs ~$47 on S3**. That single number decided it. |
| Game/bridge host | **OVHcloud VPS-1 2027 LocalZone** | Unmetered traffic, 500 Mbps, $6.54/mo. |
| Region | **Dallas (`US-EAST-LZ-DAL`)** | Nearest to the US population centre; measured closer than Vint Hill VA from every major US metro. |
| Canonical domain | **`bulletballet.dev`** | HSTS-preloaded → browsers force HTTPS before the first packet. The WASM build needs a secure context anyway (`crypto.subtle`, COOP/COEP). |
| Vanity alias | **`bulletballet.party`** *(pending registration)* | 301 → `.dev`. Cheap-and-flat renewal ($5.18/yr). |
| App origin proxying | **DNS-only (grey cloud)** | Cloudflare's proxy enforces a ~100 s WebSocket idle timeout. The bridge is idle whenever nobody is playing — exactly where a 524 would land. |
| Engine licensing | **No copyrighted assets hosted** | See §7. |

### Cost, actual

```
OVH VPS-1 LZ Dallas        $6.54/mo
Cloudflare R2              $0.00/mo   (payload ~493 MB, far under 10 GB free tier)
Cloudflare DNS/SSL          free
Domain (.dev)              $8.20 first, $12.20/yr after
                           ────────
steady state               ~$7.57/mo
```

---

## 2. Host

```
name      vps-eebb5e11-vps-ovh-us
zone      os-us-east-lz-dal-vps-1
IPv4      40.160.225.81
IPv6      2604:2dc0:300::4::7a
OS        Ubuntu 26.04.1 LTS
kernel    7.0.0-38-generic
vCPU      2
RAM       3909 MB usable
disk      38 GB total, 34 GB free
SSH alias bb-prod / bulletballet
```

⚠️ **Latency caveat:** the developer's egress is `47.190.115.49`, **Plano, Texas** — ~30 miles from the box. Measured RTT to the VPS is **4.26 ms**. Every timing observed from this machine is a best case, not a representative player experience. Re-measure from a real remote client before trusting any latency claim.

---

## 3. Capacity — MEASURED (2026-10-23)

### The load test

Ran a dedicated server on port 27025 with **`maxplayers 32`**, `sys_ticrate 100`,
map `ts_casa`, and filled all **32 slots with bots** via `ts_bot_quota 32`.

**Bot activity was verified before trusting the numbers** — a cheap bot quota that
never fights would have produced a beautifully low and completely meaningless CPU
figure. `ts_status` confirmed real combat:

```
#28 Bot Link   frags=8  deaths=9   hp=56   held=0x0
#29 Bot Seraph frags=21 deaths=11  hp=100
#30 Bot Sati   frags=18 deaths=8   hp=38   spree=2
#31 Bot Rama   frags=15 deaths=13  held=0x1/1s
#32 Bot Kid    frags=14 deaths=8   hp=100
```

76 frags and 49 deaths accumulated. They fight.

### Results

| metric | value |
|---|---|
| CPU | **5.8% of one core** (5.6–5.8% across three 45 s windows) |
| RSS | **375 MB**, flat over 45 s — no leak |
| `sys_ticrate` | **100** |
| players | 32 (all slots filled, active combat) |

### How many fit on the VPS-1

**RAM binds. CPU is not close.**

```
RAM:  (3909 MB total − ~600 MB OS/Docker/Caddy/bridge) ÷ 375 MB  =  8.8  →  8 servers
CPU:  (2 vCores, ~50% reserved for bridge/Caddy/burst) = 1.0 core ÷ 5.8%  =  17 servers
```

### **8 servers × 32 players = 256 player capacity, one box.**

The architecture doc modelled **64 slots per VM** (8 instances × 8 players). With
32-player instances that is **4× the capacity per box** — 256. One VPS-1 covers a
long way past what a starting audience needs.

### Caveats — what would make this wrong

1. **Bots are not players.** A bot client sends no network traffic. 32 humans add
   per-client packet parsing and delta encoding every tick. Direction unknown,
   additive cost likely.
2. **`ts_casa` is a small map.** Entity count drives AI and touch-test cost. A
   larger map costs more per player.
3. **The measurement ran on different silicon.** Test host: Ryzen 7 5700U
   (16-thread mobile). VPS: **AMD EPYC-Genoa**, materially better per-thread.
   Favourable, but LocalZone vCores are shared and bursty, not dedicated.
4. **tickrate 100 is expensive.** Dropping to 30 would cut server CPU roughly
   3×. It buys CPU headroom, not RAM — RAM still binds at 8 either way.
5. **Container overhead is not included** in the 375 MB figure.

**Bottom line: 8 is a defensible plan, not a promise.** Item 1 is the one that could
move the number, and it is only answerable with real clients.

---

## 4. Access

Key-only. Password authentication is **disabled and confirmed refused**.

```bash
ssh bb-prod          # alias, IdentityFile ~/.ssh/id_specialists_ovh
```

- Login user: `ubuntu` (OVH creates an OS-named user; **root is disabled by default and was deliberately left that way**)
- `sudo` is **passwordless** for `ubuntu`
- Password lives at `~/.hermes/cache/scratch/_ovh_pw` — **inert**, since password auth is off. Delete on request.

### The sshd footgun — do not "tidy" this

Drop-in config is `/etc/ssh/sshd_config.d/00-specialists-hardening.conf`.

**The filename must sort before `50-cloud-init.conf`.** OpenSSH uses the **first** value obtained for a keyword, and cloud-init's `50-cloud-init.conf` contains `PasswordAuthentication yes`. A file named `60-*` sets `no`, appears correct, and is **silently ignored** — password login keeps working with no error anywhere.

Ubuntu ships this conflict by default: `50-cloud-init` says `yes`, `60-cloudimg-settings` says `no`, and `yes` wins.

**How to verify — do not trust the file, trust the effective config:**

```bash
sudo sshd -T | grep -i passwordauthentication    # must print "no"
```

Then actually attempt a password login. Both were required to catch this.

---

## 5. Hardening applied

| Control | State |
|---|---|
| Password auth | **off** — verified refused (`Permission denied (publickey)`) |
| Root login | **off** — `PermitRootLogin no` |
| `AllowUsers` | `ubuntu` only |
| `MaxAuthTries` | 3 · `LoginGraceTime` 30 |
| Firewall (ufw) | default-deny inbound; **22/tcp, 443/tcp, 27015/udp, 27017/tcp** |
| fail2ban | sshd jail, 6 strikes / 10 min / 1 h ban, ufw action |
| unattended-upgrades | enabled |
| Security patches | 140 applied, rebooted into new kernel |
| Swap | 2 GB (`/swapfile`) — headroom for burst container start |

### Ports

```
22/tcp      ssh, key-only
443/tcp     app + wss bridge (Caddy)          [not yet deployed]
27015/udp   GoldSrc game server               [not yet deployed]
27017/tcp   bridge, DIRECT                    TEMPORARY — see below
```

**`27017/tcp` is temporary.** The browser currently dials the bridge directly on 27017, and keeping it open preserves the working local multiplayer path. Once Caddy terminates TLS and proxies `/bridge` → `localhost:27017`, **delete this rule**.

---

## 6. DNS + edge

```
bulletballet.dev          A     40.160.225.81      proxied=false  (grey cloud)
assets.bulletballet.dev   CNAME  public.r2.dev    (Cloudflare-created)
```

`assets.bulletballet.dev` verified serving **HTTP/2 over real TLS** through Cloudflare's edge (`cf-cache-status: DYNAMIC`). Empty bucket returns 404, as expected.

### Cloudflare API token

Scoped, zone-limited to `bulletballet.dev`:

```
Account → Workers R2 Storage → Edit
Zone    → DNS                  → Edit
Zone    → Zone                 → Read
```

Two gotchas cost real time:

1. **Client IP filtering must be "Allow all IPs."** Set to Allow with an empty list, the token is refused at the *authentication* layer → `Invalid API Token`. Reads exactly like a bad token string.
2. **`/user/tokens/verify` only works for User-scoped tokens.** Using it to test an Account token produces a false negative. Test against `/zones?name=…` instead.

### R2 bucket layout

Keys mirror `webxash/public/hl/ts/` **exactly**, so the same client code works against a bucket or the dev server:

```
hl/ts/manifest.json
hl/ts/<version>/part-000.bin   …   part-007.bin
```

`<version>` is the first 12 hex of the archive's SHA-256, so a part URL can never change meaning — which is what makes `immutable` safe. The manifest is the mutable pointer and is published **last**.

**Status:** bucket created and custom domain attached. **Payload not yet uploaded.**

---

## 7. Legal posture — decided, not yet fully implemented

The repository is **asset-free by policy** and verified: the largest blob in git history is a disassembly of our own Rust port. Nothing from the TS distribution is committed.

**The rule that extends past git: R2 must not hold the copyrighted payload either.** 885 MB of Valve's and Rogue's maps, models, sounds and art, under our own account and served publicly, is the one unambiguously infringing act available in this project.

Consequences already accepted:

- R2 serves **only authored assets** — webxash build output, WASM, landing page.
- Users source the TS archive themselves.
- The chunked pipeline makes hosting it *convenient*, which is precisely why the rule needs stating.
- No advertising, no paid tier, no paywall. Monetisation is the point where tolerance ends.
- Descriptive naming, prominent unofficial/non-affiliation notice, and a published takedown contact.

**Not legal advice.** If this ever takes money, get counsel.

---

## 8. What is NOT done

| Item | State |
|---|---|
| Docker installed on the VPS | not started |
| Container image (`ts-server-dll/build-matrix/Dockerfile`) | still `/tmp`, never promoted |
| Game servers on the VPS | none — still on the dev host |
| Bridge on the VPS | none — still on the dev host |
| Caddy / TLS termination on 443 | not started |
| R2 payload upload | bucket ready, **not uploaded** |
| 8-container load proof | **single-instance load test DONE** (§3). Running 8 *concurrently* is still unverified. |
| Bridge registry / multi-target | not started |
| Production A2S service | dev-only middleware in `vite-a2s-plugin.mjs` |
| Control plane | **undecided** — see `CONTROL-PLANE.md` |
| COOP/COEP discrepancy | Ernie's doc says not required; served responses currently carry `credentialless` / `same-origin`. Unresolved. |

---

## 4. Deployed game server (Phase 1 complete, 2026-10-23)

One instance is live on `bb-prod` and answering A2S over the public internet:

```
name      = bulletballet TS
map       = ts_casa
folder    = ts
game      = The Specialists v3.0.8 (DM)
players   = 4 / 32
```

```
image        ts-server:0.21      176 MB (asset-free)
assets       /srv/ts-data        961 MB, read-only volume
instance     ts-0                udp/27015, 32 slots, healthy
firewall     27015:27022/udp     open for base+N
docker       29.1.3, ubuntu in the docker group
```

Commands: `tools/deploy/run-instance.sh <N>`. Waits on the healthcheck and
verifies the engine bound the expected port, rather than sleeping and hoping.

### Engine command-line flags — measured, not assumed

Every one of these was established by starting a container and reading the
value back. Guessing here is expensive: three of them fail silently.

| flag | works? | note |
|---|---|---|
| `-port N` | yes | required for running N instances on one host |
| `+maxplayers N` | yes | **required — the engine default is 4 slots** |
| `+map NAME` | yes | |
| `+hostname S` | yes | but `server.cfg` overrides it |
| `+port N` | **no** | silently ignored; server binds default 27015 |

`ts_bot_quota` is independent of `maxplayers`: it stayed at 4 while maxplayers
went to 32. Bots are filler in a 32-slot server, which is the intended shape.

### Map rotation

The server cycles through **The Specialists 3.0's own map cycle**, taken
from the mod's Linux server tarball (`ts/mapcycle.txt`), twenty-one maps
in the mod's own order, plus the two classics that 3.0 dropped from its
default file while still shipping them: `ts_dietrich` (the Face/Off
penthouse) and `ts_bikini` (the seaside villa) — both were in the official
2.0 cycle, so a historically faithful rotation has to name them
explicitly.

`ts_dojo` was the third, and was taken out on 2026-10-24: it is hard on
the eyes and laggy to play.

`ctb_deadheat` is the one entry left out: it is a Capture-The-Bomb map
with no deathmatch spawns, so a player who landed on it in FFA would have
nowhere to spawn.

Two things had to be true, and both were broken first:

- **The cycle file is ours.** The asset tree ships the stock Half-Life
  cycle — `undertow`, `snark_pit`, `boot_camp`, `lambda_bunker`,
  `datacore`, `stalkyard` — and none of those maps exists in a TS
  install. The port skips every entry it cannot resolve ("not a valid
  map") and ends up with an **empty cycle**, which is not an error: the
  server keeps one map forever and says nothing. The TS folder's own
  `mapcycle.txt` is empty for the same reason. `entrypoint.sh` copies
  `tools/deploy/config/mapcycle.txt` into the game directory and skips
  the asset tree's, so there is exactly one cycle in the tree.
- **`mp_timelimit` is the timer, and it is in MINUTES.** `roundtime` is
  the TS *round* timer and is inert in FFA deathmatch — setting it to 30
  and waiting a minute changes nothing at all. `mp_timelimit 3` gives a
  three-minute match, `mp_chattime` (10s) of intermission, and then the
  next map. The stock TS 3.0 `server.cfg` ships `mp_timelimit 30`, which
  is half an hour on one map.

The first map of the cycle is not the map the server boots on
(`ts_casa`), so the first rotation is a change rather than a repeat.

### Two bugs that cost the most time

**A missing `-p` on `docker run`.** `EXPOSE` in the Dockerfile is
documentation, not a publish. Without `-p` the container bound its port in
its own network namespace and the host saw nothing. The container still
reported healthy and the log still said `Server IPv4 address 0.0.0.0:27015`,
so both a local and a public probe simply timed out. It reads exactly like a
firewall or A2S bug. `run-instance.sh` now verifies the bound port.

**`+maxplayers` was wrongly documented as ignored.** The test that suggested
it reused a container whose log already carried a 32-client line from an
earlier run. Re-tested with fresh containers: `+maxplayers 8` → 8,
`+maxplayers 32` → 32. Because the flag was removed on that bad evidence, the
production server was a **4-slot server** while reporting healthy. This is
the reason a green container is not evidence of a playable server.

### A2S on this engine

GoldSrc, answering `0x49` (`I`, info) — which is what `vite-a2s-plugin.mjs`
uses. Verified byte-identical in behaviour against the local dev server, so
the dev server browser should work against prod unmodified once it is pointed
at the right address.

`hostname` in A2S truncates the trailing token: `bulletballet TS-0` reports
as `bulletballet TS`. Cosmetic; per-instance names should avoid spaces until
the encoding is understood.


---

## 5. A2S service (Phase 2, 2026-10-23)

`vite-a2s-plugin.mjs` was a dev-server plugin, and in production there is no
Vite process — the frontend is a static bundle behind Caddy — so the endpoint
the server browser calls simply would not exist. `services/a2s/service.mjs` is
that endpoint standing on its own.

```
container   a2s-service:0.1   --network host
binds       127.0.0.1:8081    (not public — Caddy fronts it)
probes      127.0.0.1:27015   -> ts-0
reports     ts-0  ts_casa  4/32  publicAddress 40.160.225.81
```

It reuses `queryServer()` from the plugin rather than reimplementing A2S — the
GoldSrc handshake rules are easy to get subtly wrong and impossible to notice
until a server browser silently shows one map.

**Probing is in the background, not in the request path.** Each probe is a
UDP round trip with a ~1.2s timeout, so doing it inline would let the
slowest or dead instance set the latency of every page load. The service
polls on an interval and serves the last good snapshot, marking entries
stale rather than dropping them: a server that dies fades out over one poll
interval instead of vanishing on a single lost packet.

Binds 127.0.0.1 deliberately. Publicly it would let anyone enumerate the
fleet for free.


---

## 6. Caddy + the production bridge (Phase 3, 2026-10-23)

### The shape

```
browser ──https──> Caddy (bulletballet.dev, Let's Encrypt)
                     ├── /              -> /srv/web        (the app bundle, 56 MB)
                     ├── /api/servers  -> 127.0.0.1:8081   (a2s container)
                     └── /bridge       -> 127.0.0.1:27017  (bridge container, WebSocket)
                                                    │
                                                    └── UDP ─> 127.0.0.1:27015 -> ts-0
```

The game UDP port is published directly by Docker and deliberately does
NOT go through Caddy — it is raw UDP, not HTTP.

**The bridge must be same-origin with the page.** A page served over HTTPS
cannot open a plain `ws://` WebSocket (mixed content), and a cross-origin
WebSocket cannot carry the page's cross-origin-isolation context, which the
WASM engine needs for SharedArrayBuffer. So there is no "bridge on a
different host" option — it is a constraint, not a preference.

`bulletballet.dev` is DNS-ONLY (grey cloud) pointing straight at the VPS.
That is deliberate: a proxied record would put Cloudflare in front of the
long-lived game WebSocket, and Cloudflare's idle timeout would sever a
player mid-match. `assets.bulletballet.dev` IS proxied, because R2 lives
there and the edge cache is the point.

### What is running

| | |
|---|---|
| Caddy | 2.6.2, systemd, automatic HTTPS |
| Cert | Let's Encrypt, `CN=bulletballet.dev`, valid to 2027-01-21 |
| App bundle | `/srv/web`, 56 MB (the 1.2 GB `hl/` tree is excluded — the archive comes from R2) |
| a2s | `a2s-service:0.1`, `--network host`, 127.0.0.1:8081 |
| bridge | `ts-bridge:0.2`, `--network host`, 127.0.0.1:27017 |

### The bridge's allowlist is a security boundary

One bridge fronts every instance. The target is chosen per connection:

```
wss://bulletballet.dev/bridge?address=40.160.225.81:27015
```

The address must match an entry in the bridge's allowlist, or the upgrade
is refused with a plain HTTP 403 **before** the WebSocket handshake
completes. Validating after the handshake would let the connection open
successfully and only then close, which reads to the client as
"connected" and hides the refusal.

Without an allowlist this process would be an open UDP relay: anyone who
could open a WebSocket could make it send packets to any host:port the
VPS can reach — a UDP-based SSRF and an amplification vector.

The allowlist entry carries both addresses:

```
ts-0=127.0.0.1:27015@40.160.225.81:27015
         └─ where the packet goes   └─ what the browser knows it as
```

The browser already knows the public address from the server list, so it
sends that; the bridge matches it and dials loopback.

### Headers

```
Cross-Origin-Opener-Policy:   same-origin
Cross-Origin-Embedder-Policy: credentialless
Cross-Origin-Resource-Policy: cross-origin
Strict-Transport-Security:    max-age=31536000; includeSubDomains
```

`credentialless` rather than `require-corp` because the game archive is
fetched cross-origin from `assets.bulletballet.dev` and does not send a
CORP header; requiring one would mean asking R2 for isolation headers on
every asset.

### Verified end to end, from a real browser

```
https://bulletballet.dev/          200, HTTP/2, crossOriginIsolated: true
/api/servers                       ts-0 · bulletballet TS · ts_casa · 4/32
/bridge?server=ts-0                wss handshake OK
/bridge?server=evil                403
```

With the browser joined:

```
wss://bulletballet.dev:443/bridge?address=40.160.225.81:27015
bridge: #1 browser connected -> udp 127.0.0.1:27015
bridge: packetsToServer 268 (7521 B)   packetsToClient 612 (91765 B)
raw A2S: players=5 maxplayers=32 bots=4
```

5 players = 4 bots + the browser. The screenshot shows the TS 3.0 client
in `ts_casa` on Server 3.0.8, live from the dedicated server.

### Firewall

```
22/tcp     ssh key-only
80/tcp     caddy ACME http-01 challenge
443/tcp    app + wss bridge via caddy
27015:27022/udp   goldsrc game servers, base+N
```

`27017/tcp` was open while the bridge was exposed directly. It is closed
now that Caddy fronts it.

### One thing that bit during the deploy

The bridge image was rebuilt on prod BEFORE the public-address parsing
existed, so the container was running an old script that treated
`127.0.0.1:27015@40.160.225.81:27015` as a hostname:

```
[bridge] udp send failed: getaddrinfo ENOTFOUND 127.0.0.1:27015@40.160.225.81
```

The symptom was invisible from the browser — the WebSocket opened, the
engine booted, and nothing arrived. The health endpoint showed the
allowlist, which is where the bad parsing was visible. Bumping the image
tag and restarting fixed it. Lesson: the bridge's health output is the
only place the parsed allowlist is visible, so check it after any change
to the target spec.


---

## 7. Control plane: registry + orchestrator (Phase 4, 2026-10-23)

### The split

```
                         ┌──────────────────┐
  A2S  ─────────────────▶│    registry      │◀─── orchestrator
  console pipe ─────────▶│  (observes)      │      (decides)
                         └──────────────────┘
                                │
                                ▼  /api/servers
                         Caddy → the browser
```

The **registry observes** and the **orchestrator decides**. They are
separate on purpose: if the registry is what both reads and writes, a
registry bug can take the fleet down. The orchestrator never measures
anything itself — every fact it acts on comes from the registry, because
two services measuring the same thing is how they end up disagreeing.

### Registry (`registry:0.3`)

| | |
|---|---|
| A2S | map, players, bots, humans, max players |
| Tickrate | `sys_ticrate`, read from the engine's console FIFO |
| Bot quota | `ts_bot_quota`, read and applied |
| Health | responsive (A2S) and metricsOk (console) as separate signals |
| Endpoints | `/api/servers`, `/api/registry`, `/healthz` |

**The tickrate comes from a console pipe.** A2S does not report it. The
engine does — `sys_ticrate` — but only through its console, which each
game container exposes as a FIFO at `/tmp/console.pipe`. Writing a command
to it and reading the reply out of the container's stdout is the only way
to ask a running server how it is actually doing.

The reply is found by diffing the container log from the offset taken
before the command was written. An `echo <marker>` is sent first so the
answer is unambiguously the first thing after the marker — without it a
value could be confused with unrelated log output containing the same
digits.

**The registry needs Docker access**, because the only route to a running
game's console is through its container. It runs with the socket mounted
and the docker group added, which is root-equivalent on the host. That is
acceptable here because the host is a dedicated game box and `ubuntu` was
already in the `docker` group during the initial hardening — the same
privilege. The registry's own code is the only thing holding it.

### Degradation policy

The signal is **sustained** tickrate shortfall, not a single sample.

| | value | why |
|---|---|---|
| target tickrate | 100 | the configured rate |
| degrade below | 85% | one or two frames of dip happens on a map change, a bot respawn, a GC pause |
| recover above | 95% | hysteresis — without a higher recovery bar, an instance sitting exactly at the threshold oscillates and the orchestrator flip-flops |
| sustain window | 30s | a brief dip is not a trend |
| action cooldown | 120s | reconfiguring a server that is already struggling makes it struggle more |

### Bot policy

Keep the arena busy so a lone player has something to fight, and get out
of the way as humans arrive. Bots cost server CPU and add nothing.

```
humans 0 -> 16 bots       humans 2 -> 14 bots
humans 1 -> 15 bots       humans 16 -> 0 bots
```

A2S counts bots as players, so the A2S reply's bot count is what makes
this possible. Verified live at a roster of 4: a browser joined, the
registry saw `humans=1 bots=3`, applied `ts_bot_quota 3`, and the server
culled a bot. When the player left, the quota went back to 4.

**The roster is sixteen now** (2026-10-24), and the number lives in four
places — the registry's default, the registry image's environment, the
deploy script's environment, and `server.cfg`. Nothing derives them from
each other, so `tests/unit/bot-target.test.mjs` asserts that the four
copies agree; a change to one of them used to be invisible in the other
three.

**What sixteen bots cost:** nothing measurable in tickrate. Measured on
every map of the rotation with the server pinned to two cores — the
production box's whole budget, shared with Caddy and three Node services
— the server held **100 Hz** on all of them. The bots are cheap; the MAPS
are what differ, and the heavy ones are worth watching.

### Orchestrator (`orchestrator:0.1`)

| | value |
|---|---|
| restart if unresponsive | 60s with no A2S answer |
| restart if degraded | sustained 180s |
| action cooldown | 180s per instance |
| scale out | fleet humans >= 75% of capacity, max 8 instances |
| scale in | fleet empty for 900s, never below 1 instance |

It never acts twice in a row on the same instance without waiting out the
cooldown. An orchestrator that keeps poking a struggling server makes the
server struggle more, and a restart loop can turn one bad instance into a
whole-host problem.

**Scale-in requires zero humans fleet-wide**, and the orchestrator does
nothing at all when the registry is unreachable — "I cannot see the fleet"
and "the fleet is empty" look identical from there, and only one of them
is true. Scaling in on a registry outage would take the whole fleet
down.

It starts instances through the same `run-instance.sh` the operator
uses, so there is one way to bring an instance up.

### Verified: crash recovery

```
docker stop ts-0                  explicit stop, so --restart does not fire
[orch] ts-0 unresponsive for 60s
[orch] restart ts-0 container restarted
t+75s  ts-0: running healthy
```

The site, the registry, the bridge and the server all came back, and the
registry correctly restored the bot quota to 4 — the player had been
disconnected by the restart, and the backfill works in both directions.

### Production container set

```
orchestrator   --network host, docker socket, run-instance.sh + /srv/ts-data mounted ro
registry       --network host, docker socket
bridge         --network host, target allowlist from BRIDGE_TARGETS
ts-0           --restart unless-stopped, udp 27015, /srv/ts-data mounted ro
caddy          systemd, automatic TLS
```


---

## 9. Capacity — a plan, not a promise

Kyle's call, 2026-10-23: *"we honestly probably won't get to test this with
32 actual players each in 8 servers simultaneously for a while. Can take it
as a best case scenario for now until we get some better metrics in from
our first server with real users that we can try an extrapolate from."*

Recorded here so the number is not quoted later as a guarantee.

### Measured on the box (2026-10-23, one instance, 4 bots, 0 players)

```
host            3909 MB RAM, 2 vCores
ts-0            365.5 MiB, 0.89-1.27% CPU
registry         20.2 MiB
orchestrator      17.1 MiB
bridge            16.8 MiB
control plane     54 MiB total
available        2797 MB with one instance running
```

### The two bounds

```
RAM-bound:  (3909 - ~600 reserved) / 365.5 MB  ≈  9 instances
CPU-bound:  2 vCores / ~0.35-0.40 core per instance under real load
            ≈  4-5 instances
```

**They disagree, and CPU is the one that binds.** The RAM figure is an
upper bound even on its own terms: 365.5 MB was measured with four bots
and no players, and the roster is now **sixteen** — so the per-instance
figure is stale in the direction that matters. A 32-player instance also
carries far more entity state, snapshots and per-client buffers.

The CPU figure is the one that was measured the hard way, and the answer
was reassuring: sixteen bots on two pinned cores held 100 Hz on every map
of the rotation. Bot AI is not the cost; the maps and the humans are.

### The verdict

**8 instances is a defensible plan, not a promise.** The number that
would move it is a CPU measurement under real load, and the only honest
way to get that is a real 32-player instance — which is exactly the
metric we do not have yet.

A synthetic load test right now would produce a confident wrong number:
bots do not generate the traffic that players do, so it would measure the
easy case and report it as the hard one.

### What the registry already collects toward this

Per instance, per poll: tickrate, player count, bot count, human count,
responsiveness, degradation state. That is the raw material for the
extrapolation. What it does **not** yet do is **retain it over time** —
there is no history, so there is nothing to extrapolate from yet. That
retention is the first item in the metrics task (`HANDOFF.md` § ROADMAP,
R2).

Until it exists, the honest statement is: *one instance fits comfortably;
eight is probably fine on RAM and is unproven on CPU.*


---

## 10. Readiness for real users (2026-10-23)

Measured, not assumed. The two-player test is the one that matters: every
earlier check had ONE browser in the server, which proves the client can
connect but not that two clients can coexist. The failure mode that only
shows up with two is the important one — both browsers land on the same
server-side client slot, or the second is rejected, and the symptom is
"it works for one player", which looks like success.

### The PLAY button was broken, and every automated test missed it

Kyle's first real click on prod: **PLAY downloaded the whole game, booted
the engine, and then failed** with "Could not reach the game server".
Clicking **Join** on a server row worked perfectly.

The cause was the launch options. PLAY used the store's default, which
carries a *development* address:

```
-game ts +connect 127.0.0.1:27015 +maxplayers 8
```

From a browser, `127.0.0.1` is **the player's own machine**. The engine
tried to connect to itself, the bridge correctly refused an address that
was not the production one, and the player got a confusing error after a
493 MB download and a full engine boot. Join built its options from the
server row, which is why it worked.

**Why every test missed it:** they all matched `/join/i`, which finds a
server row's Join button. The suite was exercising Join and calling it a
pass while PLAY was broken. A test suite that only ever exercises the
path you already know works is not evidence about the path you have not
tried.

Fixed: PLAY resolves its target from the same live server list Join uses,
inside `launch()` and *before* anything expensive happens. One source of
truth for "where does a player go", so the two buttons cannot diverge
again. The target is the server with room and the fewest humans — TS is
an FFA deathmatch, so players want company, not empty servers.

There is now a test that clicks PLAY specifically:

```bash
node tools/deploy/play-button-e2e.cjs https://bulletballet.dev/
```

### Verified

```
two browsers, one server:   players=5 max=32 bots=3 humans=2
PLAY button reaches server:  bridge peak live connections: 1
?autoplay=1 reaches server:  bridge peak live connections: 1
bridge:                     #7 and #8, live=2 — two UDP sockets,
                            two distinct server-side client slots
                            (identical packet counts = no collision)
bot backfill:               4 → 3 → 2 bots as humans arrived
```

Reproduce it:

```bash
node tools/deploy/two-player-e2e.cjs https://bulletballet.dev/ 2
```

Each browser gets its own context, so each does its own 493 MB download —
the honest test of a cold first-time player.

### The cold download is the real cost

```
493.0 MiB in 12.0 s from a fast link (41.2 MiB/s)
  ~30-40 s   on a 100 Mbps connection
  ~90 s      on a 50 Mbps connection
  ~6 min     on a slow mobile connection
```

One-time per browser — the parts are cached in IndexedDB, and a warm load
skips the network entirely. But it is the thing that will decide whether a
first-time visitor stays. Reducing it means shipping less content, which
Kyle deferred on 2026-10-22 pending a decision on which maps and gameplay
the servers run. That decision is now the highest-leverage one available.

### Browser requirements

The engine needs cross-origin isolation (`SharedArrayBuffer`). Caddy sends
`Cross-Origin-Opener-Policy: same-origin` and
`Cross-Origin-Embedder-Policy: credentialless`, and the page reports
`crossOriginIsolated: true`.

- Chrome / Edge — fine
- Firefox — 119+ for `credentialless`
- Safari — 18+; older Safari will fail to boot, and there is no graceful
  message for it yet

### When the server goes away

The engine does not notice this on its own, and the reason is structural:
the client's WebSocket is to the **bridge**, not to the server. A server
death closes nothing the client can see. The bridge keeps relaying into
the void, the engine keeps rendering its last frame, and the player is
looking at a frozen world with no explanation.

The bridge cannot tell a dead server from a quiet one either — UDP has no
connection state, so a dead server just means packets stop arriving. But
the **registry** polls A2S and already knows when an instance has gone.
So:

```
server dies → registry's A2S poll misses (3 in a row) → registry marks it down
            → bridge notices (2 polls) → bridge closes the socket with 4001
            → client shows CONNECTION LOST, counts down, reconnects
```

The application close code (4001) lets the client say *"The game server is
restarting. It will be back in about a minute"* rather than a generic
network message. And it counts down and reconnects on its own — a player
staring at a frozen screen needs to click something to be told what to
do, and most will not.

Verified end to end: killed the server under a live player, and the
overlay appeared **25 seconds later** with the right text and a running
countdown.

```bash
node tools/deploy/disconnect-ux-test.cjs https://bulletballet.dev/
```

### Players linger for ~2 minutes after leaving

A disconnected browser's slot stays in the server's list until the
server's own timeout fires. Observed: two ghost clients
(`Specialist (2)`, `Specialist`, same uniqueid) sat in `status` for over
two minutes past `sv_timeout=65`, then cleared together.

So the server browser shows players who have already left, and do not
read the player count as a live occupancy metric during a test.

### The ghost slots were driving the bot policy

The bot policy decides how many bots to keep from the number of humans
on the server, and it was getting that number from `A2S players - A2S
bots`. With ghosts in the player count, the human count was inflated,
and the policy shrank the bot roster as though people were still playing.
Observed exactly that: the quota stuck at 2 on a server with nobody on
it.

The fix is to stop asking A2S. **The bridge counts open WebSockets**,
which has no lag, so it is the authority on how many humans there are;
A2S stays the authority on what the server is doing. The bridge reports
live connections per target, and the registry prefers that.

One subtlety worth stating, because getting it backwards reintroduces
the original bug: an **empty** map from a reachable bridge means *zero
humans*, not *unknown*. Treating it as unknown falls back to the A2S
count — which is the ghost problem again, for exactly the case the
bridge was added to fix: an empty server. So "the bridge has never
answered" is tracked separately from "the bridge answered and there is
nobody there".

Verified live: humans `0 → 1 → 2` as two browsers joined, with the bot
quota following exactly (`4 → 3 → 2`) while A2S's own player count
lagged behind on the ghosts.

### One false-restart bug, found and fixed

The orchestrator restarted `ts-0` at 18:07:43 — 32 seconds after the
server had been stopped, which is faster than the 60s unresponsive
threshold. The reason: the registry marked the instance unresponsive at
18:06:43, when the server was **perfectly healthy**. One A2S probe had
been missed.

That is not a cosmetic bug. A single dropped UDP probe — likely under
load, with 32 players on the server — started a timer that ended in the
orchestrator restarting a healthy server and disconnecting everyone on it.

The registry now requires **three consecutive** failed probes before an
instance counts as down. Detection is slower and that is the right
trade: a missed probe costs one wasted restart, but a missed probe during
a busy match disconnects every player in it.

## The registry was restarting healthy servers

Three times in three hours, the orchestrator restarted `ts-0` while it
was perfectly healthy. The orchestrator was doing its job — the
registry had marked the instance DOWN — but the registry was wrong.

The cause is that **A2S replies get lost**. Measured against the live
production instance:

| probe rate | replies lost |
|---|---|
| one query every 2s | **0%** |
| one query every 400ms | 15% |
| one query every 60ms | **42%** |

The server is not slow when it answers: 16ms p50, under 52ms p95. It
is *dropping* queries, apparently as flood protection. The registry
probed once every 5 seconds, and three consecutive dropped replies
were enough to mark a healthy instance down — and the orchestrator
then restarted it, **kicking every player off the server**.

Three things changed:

1. **The probe is retried.** Three attempts instead of one. Measured
   against the live public server: 22.5% of single-shot probes failed;
   with the retry, **0%** did.
2. **The retry window is tight.** The first attempt gets the generous
   1200ms window; retries get 500ms — ten times the observed p95, so a
   busy server still answers, while a port with nothing listening does
   not cost 1200ms of wall clock per attempt.
3. **The failure threshold is unchanged** at three consecutive *cycles*.
   With the retry, three cycles all failing after three attempts each
   really does mean the server is gone.

### And then: a busy server is not a dead server

The retry was necessary but not sufficient. The orchestrator still
restarted `ts-0` at 23:12 — while the browser E2E tests were running.

A2S is answered on the **game thread**. The game thread is busiest
exactly when the server is doing its job — when real players are
connected. And when a reply is lost it **never arrives**: listening
for eight seconds after a missed probe caught nothing, so no longer
timeout can rescue it.

Which makes the failure mode vicious. The busier the server gets with
real players, the more likely it is to be declared dead and restarted
— which kicks the players off and empties it again.

The console is a different path entirely: a pipe into the server's
stdin, which answers regardless of what the game thread is doing.
`sys_ticrate` coming back is proof of life.

So a missed A2S probe is now only believed when the console **also**
fails:

| A2S | console | verdict |
|---|---|---|
| missed | answered | **alive** — busy, not dead. The failure count resets. |
| missed | failed | down — the A2S miss counts. |
| missed | unavailable | unknown — fall back to counting the miss. |

The threshold of three consecutive failures is unchanged. The console
check only stops *busy* servers from being mistaken for dead ones.

The tie-breaker is not a fresh console read — it is the reading the
registry **already collects** for the tickrate and the bot quota. A
second read would compete with the metrics poll for the server's
attention and time out exactly when the server is busiest, which is
precisely when the answer matters most.

### And: a missing row is not a down row

The orchestrator restarted `ts-0` a third time, during a deploy. The
cause was here:

```js
if (!row || row.responsive === false) { /* start the restart clock */ }
```

`!row` means **the registry does not know about this instance** — not
that it is down. A row is missing while the registry is starting up
(its first poll has not landed yet) and when it drops an entry it has
not refreshed for a while. Both happen during a deploy, and both ended
with a healthy server being restarted and every player kicked off it.

So the clock now starts only when the registry *says* the instance is
down. A missing row leaves the timer alone: if the registry later
reports the instance down, the clock starts then.

That, the retry, and the console tie-breaker are three separate
defences, because each one was a separate way to get this wrong.


The retry lives in `services/registry/lib/a2s-retry.mjs` and is
covered by `tests/unit/a2s-retry.test.mjs`.
