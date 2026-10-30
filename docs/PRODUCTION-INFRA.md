# Production Infrastructure

**Status:** provisioned, hardened, partially wired. Asset delivery live; **game plane live** on the OVH VPS (`bb-prod` → `vps-eebb5e11-vps-ovh-us`; `ts-0` on `ts-server:0.26`, healthy — measured 2026-10-25; bandwidth and CPU measured with 8 real browsers 2026-10-27, see §3.1). The game-server *image* is still built by hand, outside the deploy pipeline.

Everything here is **measured**, not estimated, except where explicitly marked `UNVERIFIED`.

---

## 1. Decision record

| Decision | Choice | Why |
|---|---|---|
| Object storage | **Cloudflare R2** | Egress is free. At 1,000 new players the payload costs **$0.36/mo on R2 vs ~$47 on S3**. That single number decided it. |
| Game/bridge host | **OVHcloud VPS-1 2027 LocalZone** | Unmetered traffic, 500 Mbps (symmetric — up *and* down), $6.54/mo. Measured: 354 Mbit/s down, 643 Mbit/s up. |
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

⚠️ **Latency caveat:** the developer's egress is `47.190.115.49`, **Plano, Texas** — ~30 miles from the box. Measured RTT to the VPS is **4–6 ms** (ICMP, re-measured 2026-10-27; the earlier 4.26 ms figure was one sample). Every timing observed from this machine is a best case, not a representative player experience. Re-measure from a real remote client before trusting any latency claim.

**And a second caveat, bigger than the first:** a latency measurement taken from inside the browser page that runs the game is **not a network measurement** — the page's main thread is saturated by the engine (§3.1). Measure from an idle page, or from outside the browser.

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

### Real clients: measured bandwidth and CPU (2026-10-27)

**This answers caveat 1 above, with real clients.** Measured against
production: 8 real Chromium browsers, each with its own context and its
own 493 MB archive download, connecting to the live server at
`https://bulletballet.dev/`. The game server was not restarted, reconfigured
or otherwise touched.

#### What each player actually costs

| | measured | 32 players |
|---|---|---|
| **game traffic, server → client** | **114 kbit/s** per human (median at N=4; range 85–150) | **3.7 Mbit/s** |
| game traffic, client → server | 3.2 kbit/s per human | 103 kbit/s |
| **cold start, from the VPS** | **~26 MiB** (engine WASM + web bundle) | 830 MiB if all 32 arrive at once |
| **cold start, the 493 MB archive** | **0 bytes from the VPS** | 0 bytes — it is Cloudflare R2 |
| server CPU | **17% of 2 vCores** at 4 humans + 14 bots | — |

**Bandwidth is not the constraint. The VPS's 500 Mbps has roughly 100× the
headroom 32 players need** (3.7 Mbit/s of 500). The 493 MB archive is
served by Cloudflare R2 and never touches the VPS — confirmed from Caddy's
own access log, which shows **zero** bytes for `/hl/`. The only thing the
VPS serves per cold player is ~26 MiB of engine and bundle.

**How the per-player rate was derived, and why it is trustworthy.** The
bridge counts every byte it forwards, so `bytesToClient` is the players'
traffic exactly. The per-player rate is that counter's rate divided by the
A2S human count, taken only from **steady-state samples** — the samples
where the human count had not just changed. The samples immediately after
a join are excluded: a joining player triggers a full state dump (up to
651 kbit/s for a few seconds) and that is a **one-off per player**, not a
per-player-second rate, so it must not be averaged in.

At the highest concurrency reached (4 humans), 6 steady-state samples give
**85–150 kbit/s per player, median 114**.

**The bound, so the projection is not just a best case.** Taking the
worst single-player rate ever observed (651 kbit/s) and scaling it to 32
players gives 20.8 Mbit/s — **4.2% of the 500 Mbps plan**. Every basis of
the projection (median, p95, worst-observed) lands under 5% of the
available bandwidth. The conclusion does not depend on which one you
believe.

#### The number that was wrong: "500 Mbps down"

Kyle's recollection was 500 Mbps **down**. The plan is in fact **500 Mbps
public bandwidth, unmetered traffic** — OVH's VPS-1 2027 LocalZone, and
bandwidth is symmetric, so it is 500 up as well. Measured on the box:

| direction | measured | note |
|---|---|---|
| download | **44.2 MB/s = 354 Mbit/s** | to Hetzner (Europe) |
| upload | **80.4 MB/s = 643 Mbit/s** | to Cloudflare anycast, Dallas |
| upload, 1 stream to Europe | 3.7 MB/s = 30 Mbit/s | path-limited, not port-limited |
| upload, 16 streams to Europe | 11.6 MB/s = 93 Mbit/s | scales with concurrency |

The single-stream upload figure is the trap: one TCP stream to Europe
measures ~30 Mbit/s, which looks like a slow port and is not. The port
does 643 Mbit/s to a nearby anycast address. **Measure upload with
parallel streams, or to a nearby endpoint, or you will measure the
transatlantic path instead of the server.**

#### The finding that matters more than bandwidth

**"The registry says 8 humans" is not "8 people are playing."**

The 8 browsers opened 8 WebSockets on the bridge, and the bridge counted
all 8 as live connections — which is what the registry republishes as
`humans` (`humansSource: "bridge"`). But the **game server's own A2S reply
said 0 humans**, and the bridge's byte counters were frozen. The sockets
were open and idle; the players were not in the game yet, because the
client downloads its 493 MB archive first and only then boots the engine
and joins.

The distinction is not academic: the two numbers disagree by 8, and only
one of them is the player count. A load test that trusts the registry
measures a pre-game connection and reports **0.00 Mbit/s** — which is
exactly what the first version of this test did. The game server's A2S
count is the authoritative one.

There is a second, worse version of the same thing here: the registry
reports `humans` from the bridge's socket count, and A2S `players`
**includes bots**, so the human count is `players − bots` (A2S layout,
verified byte by byte: `appId(2) players(1) maxPlayers(1) bots(1)`).

#### What 8 browsers actually did

Timeline from the instrumented run, all on one clock:

```
   t  live  a2sHumans  down B/s   up B/s
  30s      2          0          0        0     connecting, archive downloading
  35s      2          1     13612    891     the first player IS in the game
  68s      4          2     24180   1428
  99s      4          4     32717   1230     4 humans in the game
 148s      4          4     50452   1138     steady state
 153s      4          0     33700   1138     the map changed — everyone dropped
 158s+     4..8       0          0      ~0     sockets open, nobody in the game
```

Two things fall out of it:

1. **The bot quota gives way to humans automatically.** `ts_bot_quota`
   went 16 → 12 → 9 as humans arrived. The fleet makes room for people
   by removing bots, which is the right behaviour and worth knowing.
2. **The map change is not broken - it is seamless, and a single
   client handles it in ONE SECOND.**

   > **Kyle, playing it (2026-10-27):** *"the way the map changes doesn't
   > seem broken at all (in fact it works seemlessly and very quickly in my
   > experience)."* A real player's lived experience, and it agrees with the
   > instrumented measurement. **Treat the map change as working, not as an
   > open problem.**

   The server logs
   `CHANGE LEVEL: ts_wyndham` when the 15-minute `mp_timeleft` expires.
   Measured against the live server:

   ```
   [01:54:47] CHANGE LEVEL: ts_wyndham
   [01:54:48] [ts] Specialist connected (address 172.17.0.1:60968)
   ```

   **One second**, same address — the client reconnected on its own, the
   WebSocket never closed, and the page never reloaded. So the map
   change is *not* a disconnection event, and the client's
   `connectionLost` path never fires for it.

   The client's own console shows the mechanism, timestamped to the same
   second as the server's `CHANGE LEVEL`:

   ```
   [20:54:48] [xash-stdout] reconnecting...
   [20:54:48] [xash-stdout] Connecting to 40.160.225.81:27015... (retry #1)
   ```

   The **engine** detects the level change and re-runs its connect
   handshake at the game-protocol level. Nothing above the engine
   notices: the page did not reload (one navigation for the whole run),
   the WebSocket stayed open, and the `connectionLost` overlay never
   appeared. A player sees the map change and keeps playing.

   The 8-browser run seemed to contradict this: after its map change
   the A2S human count went to 0 and the bridge's downstream counter
   froze for **135 seconds**, with `liveConnections` still at 8 the
   whole time. That is *not* the map change breaking the clients — it
   is 8 clients on a 16-core box that was already at **load average
   14** re-establishing their sessions, and the game's own log for
   that window shows the clients reappearing one at a time
   (`Specialist connected` at 01:31:48, 01:33:45, 01:34:36, 01:35:28).

   The server's log for that window also shows the real client-side
   failure mode, which is *not* the map change: **`Specialist timed
   out`** — the client stops sending and the server drops it, three
   times in four minutes. A client that stops talking to the server
   is the thing to investigate, and it is a different bug from the
   map change.

   **Reproduced with 8 clients, and the recovery does happen.** A second
   instrumented run (8 browsers, watching across `CHANGE LEVEL:
   ts_henny2`) saw the same frozen counter and the same 0 humans, and
   the clients staggered back over several minutes: the server logged
   `Specialist connected` at 02:16:18 and 02:16:41, and the registry
   eventually reported **humans=8** — all eight in the game. So the
   map change is survivable, and the 135 seconds is the start of a
   slow recovery rather than a permanent break.

   **What makes it slow is the TEST BOX, not the server.** During the
   run, one Chromium **GPU process was spinning at 566% CPU** — the
   software rasteriser, a headless-only artifact — while the 16-core
   box sat at **load average 14** with 8 WASM engines competing for
   it. A *fresh* client launched against the same server at the same
   moment got in immediately and received live game data. And the
   bridge held **8 live WebSockets and 18 UDP sessions to the game
   server** while A2S reported 0 humans — the transport was healthy;
   the engines were not pulling.

   The lesson for the measurement: **8 browsers on one box is not 8
   players.** The server was never the bottleneck, and the numbers from
   a saturated test machine must not be read as server behaviour.

   **A note on the probe itself.** Late in the single-client run, the
   probe's own `page.evaluate` calls started failing ("page gone") for
   ~120 s — the page was so busy it could not answer a trivial
   JavaScript call. That is the same main-thread starvation the
   event-loop-lag measurement found (4.1 ms idle → 154.5 ms in game),
   showing up as a measurement tool losing its grip. It is a reminder
   that a saturated client distorts not only the game but anything
   measured from inside the page.

**Tickrate held at 100 throughout** — avg 100, min 100, target 100, with
`responsive=true` and `metricsOk=true` — including across the map change.
The server's own CPU sat at 15–18% of the 2 vCores with 4 humans and 14
bots fighting.

#### The latency number was measuring the wrong thing

The first run reported a browser→bridge→server round trip of
**111–136 ms median**, and that number was wrong. It was not the
network.

The measurement ran from inside the page that was also running the
WASM engine at 100 tick, using `onmessage` — which the browser
delivers on the **main thread**, the same thread the engine's render
and simulation loop run on. Every reply waited behind the engine.

Three measurements, same browser, same server, same code path:

| | measured | what it is |
|---|---|---|
| page **idle**, before join | **31.6 ms** | the network + the server |
| page **running the game** | **112.2 ms** | the same path, plus the page competing with itself |
| **event-loop lag** (`setTimeout(0)`), idle | **4.1 ms** | an idle page services a callback in 4 ms |
| **event-loop lag**, in game | **154.5 ms** (max 252) | the main thread is ~150 ms behind |

So the 111–136 ms was ~80 ms of the page waiting for its own engine.
What a player feels on the wire is the **~32 ms** figure — and that is
itself mostly the server's tick (below).

**A latency measurement taken from inside the page the game runs in is
not a network measurement.** The idle-page number is the one to trust.

#### Where the remaining ~30 ms goes

| | median | p95 |
|---|---|---|
| ICMP to the VPS (the wire) | 4–6 ms | — |
| **UDP A2S over loopback, on the VPS** (server alone, no network) | **10.0–10.8 ms** | 30 ms |
| UDP A2S from this machine | 11 ms | 63 ms |

The loopback histogram is the tell: **29 of 32 samples landed in the
5–15 ms bucket.** A 100 Hz tick is 10 ms, and an A2S query is answered
on the tick boundary — so the answer arrives at the next tick. The
server **is** hitting its 100 Hz target; the median answer time is
exactly one tick.

The tail (p95 30 ms, occasional 50–60 ms) is late ticks. And pairing
each slow round trip with an ICMP to the same host proved it is the
server, not the wire: **24 of 26 slow samples had a perfectly healthy
4–5 ms ICMP**, and only one coincided with a network spike.

#### What this does NOT say

- **4 humans is the most that were ever simultaneously in the game.** The
  8 browsers all connected, but only 4 had joined at the peak before the
  map rotated. So the 114 kbit/s per player is measured at N=4, not
  N=8, and per-player cost rises with player count — the server sends
  each client a bigger snapshot when there is more to see. The 32-player
  32-player projection is therefore an **extrapolation, not a measurement** —
  though scaling even the worst observed per-player rate to 32 lands at
  4.2% of the 500 Mbps, so the conclusion is not sensitive to it.
- **The measurement ran from Plano, Texas**, 30 miles from the box
  (RTT 4.26 ms) — the same caveat as §2. Latency from a real remote
  player is not represented.
- **The tickrate was never stressed.** 100 Hz on 2 shared vCores at 17%
  says nothing about 100 Hz at 32 humans.
- **The ~150 ms of event-loop lag in the browser is a CLIENT finding, and
  it was not investigated further.** The main thread cannot service a
  callback for 150 ms while the engine runs, so the page is starved for
  anything that is not the simulation — and any measurement taken from
  inside the page is inflated by it. Whether a player *feels* it (their
  input, their HUD, their audio) is a separate question from whether the
  network is slow, and it was not answered here. **This is the most
  likely thing to actually hurt a player, and it is worth a look.**
- **`sv_maxrate` is unset**, so the server's own bandwidth ceiling is the
  engine default. That default was not read out of the running server
  (the console pipe did not answer for it), so it is `UNVERIFIED`.

#### What to do about it

**Nothing about bandwidth.** 32 players need 3.7 Mbit/s of the 500 the
plan has, and the 493 MB archive is free and off the VPS. If someone
later worries about bandwidth, the number to check is the VPS's
**CPU** (RAM already binds at 8 instances) and the **2 vCores'** ability
to hold tickrate 100 at 32 humans — which is measured and unmeasured
respectively.

**But there IS something worth chasing, and it is not the server.** The
client's main thread is **~150 ms behind** while the engine runs
(event-loop lag: 4.1 ms idle → 154.5 ms in game). That is a browser
client starving itself, on the player's machine, and it is a far more
plausible cause of "the game feels bad" than a 500 Mbps port with 3.85
Mbit/s of traffic on it. The server answers a query in one 10 ms tick
and the wire is 4–6 ms. The player's own browser is the slow part.

**The two things to measure next, in order:**
1. **Does a player feel the 150 ms?** (input lag, HUD lag, audio
   underruns.) That is a client problem and it is the one with the
   evidence behind it.
2. **Tickrate 100 at 32 humans** on the 2 vCores — the server-side
   unknown, and the only remaining capacity question.

### Caveats — what would make this wrong

1. ~~**Bots are not players.**~~ **ANSWERED 2026-10-27** — see §3.1. Real
   clients: a human costs **114 kbit/s** of server→client traffic and no
   measurable server CPU beyond the bot it displaces. The bot quota gives way
   automatically (16 → 9 as humans arrived), so humans and bots are not
   additive. Per-player cost still rises with player count, so the
   32-player figure is an extrapolation from a peak of 4.
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

### The 150 ms of client lag: ANSWERED (2026-10-28)

The 2026-10-27 capacity/latency report measured a **154.5 ms event-loop
lag** in the game page and could not explain it. It is answered now, and
the answer is not what it looked like:

**The 150 ms was never server latency. It was the engine's own render
frame time**, during which the page's main thread cannot service
anything else.

The cause: **the engine renders at the browser viewport's resolution.**
Always. Its `vid_width`/`vid_height` cvars and the canvas backing store
tracked the viewport exactly at every size tried, and the engine's frame
count equalled the browser's `requestAnimationFrame` rate at every size —
the engine draws one frame per animation frame and the main thread is
blocked for all of it. That is mechanically what a 150 ms event-loop lag
*is*.

| viewport | engine render res | engine frames/s | event-loop lag (med) |
|---|---|---|---|
| 640×480 | 640×480 | 69.5 | 58.8 ms |
| 1280×720 | 1280×720 | 30.2 | 112.5 ms |
| 1920×1080 | 1920×1080 | 8.6 | 235.7 ms |
| 2560×1440 | 2560×1440 | 4.5 | 360.5 ms |

One headless Chromium against production, on the **software rasteriser**,
so the absolute frame rates are far worse than a real GPU gives. The
*shape* — cost proportional to pixels — is not an artefact of that. 14.4
ms/frame at 640×480, 222 ms/frame at 2560×1440, roughly linear.

So Kyle's "some FPS hits when I go full screen" is this, and it is fully
explained: going fullscreen makes the viewport the size of the display,
the engine follows the viewport, and the frame cost goes with the pixel
count.

#### The fix: render smaller, let the browser upscale

The canvas is `width: 100vw; height: 100vh`
(`webxash/src/assets/main.css`), so its CSS size is independent of its
backing store. Forcing the engine to a smaller mode and letting the
browser scale the canvas up gives the frames straight back:

| engine mode (viewport 2560×1440) | rAF/s | event-loop lag (med / p95) |
|---|---|---|
| 2560×1440 | 11.20 | 88.4 ms / 233.5 ms |
| 1920×1080 | 21.92 | 55.7 ms / 97.0 ms |
| 1280×720 | 38.83 | 28.7 ms / 56.9 ms |
| 640×360 | 60.04 | 13.6 ms / 37.4 ms |

The engine's own switches do it: `vid_setmode <w> <h>` at runtime, and
`-width`/`-height` on the command line — the engine creates its window at
that size during renderer init, so the first frame is already right.

**The one trap, and it is the whole reason this needs three moving
parts: the engine re-syncs to the window on every resize.** SDL's resize
event calls `VID_SaveWindowSize`, which calls `R_SaveVideoMode`, which
rewrites `width`, `height`, `vid_width` and `vid_height` from the new
window size. Measured: a forced 1280×720 did **not** survive the
viewport growing to 2560×1440 — the engine went back to 2560×1440 and
the frame rate fell from 16.2/s to **0.4/s**. So the resolution has to
be **re-applied after every resize**, not just set once at boot.

**What shipped (2026-10-28):**

| piece | where | what it does |
|---|---|---|
| the policy | `webxash/src/services/video-settings.ts` | display → render resolution; `auto` caps at 1080p, `display` is the display's own size |
| the launch arguments | `webxash/src/services/xash-loader.ts` | `-width`/`-height` on the engine's argv, so the first frame is right |
| the post-boot apply | `webxash/src/services/xash-loader.ts` | `vid_setmode` once the renderer is up |
| the re-apply | `webxash/src/services/fullscreen.ts` | the resize watchdog puts it back after every resize |
| the player's control | `webxash/src/components/XashLaunchOptions.vue` | a "Render resolution" selector; `auto` by default |

A **HiDPI display is deliberately not rendered at its device
resolution.** `screen.width` reports CSS pixels (1512 on a 14" Retina
MacBook, not 3024), and rendering at the device resolution would cost
four times the fill rate for a game whose art is 320×240 — while the
browser upscales the canvas anyway.

**Verified in a real browser**, against the locally-built frontend and
the production game server: the engine drifts to the viewport's
resolution on a resize (measured at **+300 ms**, before the watchdog's
400 ms debounce) and the watchdog pulls it back — canvas backing store
**1920×1080**, GL drawing buffer 1920, GL viewport 1920×1080, with the
canvas CSS size still 2560×1440, so the browser upscales. See
`tests/unit/video-settings.test.mjs` for the policy and the wiring.

**A landmine that the first version walked into.** The resize watchdog is
installed at import time, before the Vue app exists, so it hears the
resize events that happen while the engine is still booting. The engine's
command pool does not exist until its first frame, and a command sent
before that makes the **engine** raise its own fatal error — measured:
`_Mem_Alloc: pool == NULL (alloc at ../engine/common/cmd.c:638)`,
surfaced at the JavaScript side as the bare value `Infinity` thrown out
of `Cmd_ExecuteString`. The render-resolution module now stays
**disarmed** until the loader says the engine is up.

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
| Firewall (ufw) | default-deny inbound; **22/tcp, 443/tcp** (the game UDP is loopback-only — see §6) |
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

**It is published on `127.0.0.1` only, and it is browser-only (decided
2026-10-29).** The bridge, the registry and the orchestrator all run with
`--network host`, so they reach the game server over the host's own
loopback (`-p 127.0.0.1:$PORT:$PORT/udp`) and nothing changes for them.
What it changes is the outside: with the port on `0.0.0.0`, a **native
GoldSrc client could connect straight to the game server** — the whole
classic cheat-tooling ecosystem, aimbots and wallhacks included, and
players with real addresses rather than the bridge's shared one. Measured
before the change: **zero** connections had ever arrived over that path
(the container's whole log held 444 `local` registry polls, 12 bridge
players, and nothing else), so no player loses anything by closing it.

Note that the **ufw rules are not what closes it**: Docker's port
publish is a DNAT in the PREROUTING chain, so a packet addressed to the
public IP never reaches ufw's INPUT chain. The bind address is the whole
of the control.

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
