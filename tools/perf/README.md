# Measuring the browser client: a harness, and what it teaches

**Date:** 2026-10-28
**Subject:** `specialists-browser` / BulletBallet — measuring FPS and latency
in the browser against production.

This is the operating note for `tools/perf/`. The three harnesses live
there; this file is how to use them, and the traps that cost time.

---

## 1. ALWAYS CHECK THE RENDERER BEFORE BELIEEVING A NUMBER

The 2026-10-28 performance work measured the engine at 8.6 FPS at 1080p
with 235 ms of event-loop lag, and built a fix on top of that number.

**Every one of those measurements was taken on a software rasteriser.**
The test box had no usable GPU, so Chromium fell back to SwiftShader:

```
renderer: ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)
```

A real user's browser gets a hardware backend. On the same box, with
`--use-angle=vulkan --enable-features=Vulkan`:

```
renderer: ANGLE (AMD, Vulkan 1.4.305 (AMD Radeon Graphics (RADV RENOIR)), radv)
```

**The same game, the same server, the same viewport, on a real GPU: 60 FPS
at native 1080p with 4.2 ms of event-loop lag.** The "150 ms of client lag"
was SwiftShader.

**Rule: print the renderer string with every result, and never compare a
number to another number without it.** All three harnesses take `--gpu` and
print the renderer they got.

Finding a working GPU backend is not obvious — these all fell back to
SwiftShader on the test box:

```
--enable-gpu                                                   -> SwiftShader
--use-gl=egl --ignore-gpu-blocklist --enable-gpu               -> SwiftShader
--use-gl=desktop --ignore-gpu-blocklist --enable-gpu           -> SwiftShader
--use-angle=vulkan --enable-features=Vulkan --enable-gpu       -> HARDWARE
--use-gl=angle --use-angle=gl-egl --enable-gpu                 -> HARDWARE
```

---

## 2. THE BROWSER'S rAF CEILING IS THE REAL CEILING

Before reading "the engine renders at N FPS", know what the browser can do
at all. A bare `requestAnimationFrame` loop on an **empty page**:

```
58.5 rAF/s
```

That is the display's refresh rate. **An engine that measures 59.9 rAF/s is
not fast — it is saturated.** Lowering the render resolution will not move
it, and that is the measurement that proves the render cost is not the
constraint.

This is why the "cap the resolution" fix was worth having and worth
questioning at the same time: on the software rasteriser the resolution was
the whole story; on a real GPU it is not.

---

## 3. WARM UP BEFORE MEASURING, AND INTERLEAVE A/B/A

The first version of the cvar sweep measured a baseline first, then each
cvar after it. The result was nonsense:

```
baseline      38.29 rAF/s  frame 26.1ms  lag 40.2ms
r_lockpvs 1   59.57 rAF/s  frame 16.8ms  lag 12.6ms
...
r_lockpvs 0 (reset)  57.13 rAF/s  ...
```

**The "baseline" was 38 and the reset of the same state was 57.** The
engine was still warming up — the map was streaming, bots were spawning,
the first frames were compiling shaders — so the first reading measured the
warm-up and every later reading was contaminated by the settling.

Two fixes, both now in the harness:

1. **Warm up for a fixed period** (default 20 s) and print the settled
   readings before any comparison, so a reader can see the engine has
   stopped moving.
2. **Interleave A/B/A.** For each switch: measure with it OFF, turn it ON
   and measure, turn it OFF and measure again. Report the *difference*.
   The drift between the readings cancels, and the number is the switch's
   effect rather than the engine's mood.

Never report a single unpaired reading as a cvar's effect.

---

## 4. WHAT THE HARNESSES DO

### `measure-client-perf.cjs`

The main one. Against production (or any URL):

- the engine's rAF rate and the event-loop lag, over a fixed window;
- the engine's real state — canvas backing store vs CSS size vs the GL
  drawing buffer vs the GL viewport, so "what resolution is it actually
  drawing at" is answered by the engine rather than inferred.

```sh
node tools/perf/measure-client-perf.cjs --gpu --sizes 1920x1080 --modes 1920x1080,1280x720
```

### `measure-input-latency.cjs`

Input latency, end to end:

- a **real pointer-lock mouse move**, dispatched through CDP so the event
  is trusted and carries a genuine `movementX` delta;
- timed from the moment the **page's own `mousemove` listener** sees the
  event, to the moment the **client's own view angles** change — both on
  one clock inside the page, so the harness's own latency does not
  dominate;
- the observable is the client DLL's `ts_test_view` developer command,
  which prints `... angles [pitch,yaw,roll]`.

```sh
node tools/perf/measure-input-latency.cjs --json /tmp/latency.json
```

**This harness has more gates than the others, and each one fails as a
clean "0 responses" rather than an error.** The pointer must be locked,
the menu must not own the cursor, the mouse button must be held, and the
angle cvar is `ts_test_view` — `v_angle` does not exist in this build.
See §5.

### `sweep-engine-cvars.cjs`

Sweeps the engine's own performance cvars live, with the A/B/A design
above, and prints the paired difference.

```sh
node tools/perf/sweep-engine-cvars.cjs --gpu --size 1920x1080 --warmup 25
```

### `ab-wasm-opt-level.cjs`

Builds the TS client WASM at two optimisation levels (`-Oz`, which is what
production ships, and `-O3`), swaps one into a local build of the frontend,
and runs the **real game against the real server** with each.

```sh
cd webxash && VITE_ASSET_BASE=/ \
             VITE_BRIDGE_ADDRESS=bulletballet.dev:443 \
             npx vite build
node tools/perf/serve-local-build.cjs --port 8899 &
node tools/perf/ab-wasm-opt-level.cjs --gpu
```

(The build flags are not optional — see §4b.)

**Run it in both orders.** `--reverse` swaps which build goes first:

```sh
node tools/perf/ab-wasm-opt-level.cjs --gpu --reverse
```

This is not optional rigour, it is the whole explanation. Measured over four
cycles, **the build measured second came out ahead three times out of
four** — and with `--reverse`, the *second* build still won. The
measurement was picking up the position (warmer browser, warmer server,
warmer machine), not the build.

The corroborating signal is in the **minimum** frame time: every run, both
builds had a best-case frame time of **16.64–16.79 ms** — all of them 60 Hz.
Neither build renders anything faster; the averages differ only in how many
frames get dropped.

**If a result flips sign between runs, run it in the other order before
believing either result.**

### `results/`

The raw JSON output of every measurement quoted in
`docs/CLIENT-PERF-RESEARCH.md`, so each number can be checked against the
data that produced it:

| file | what it is |
|---|---|
| `prod-resolution-sweep-1080p.json` | Production, 1920×1080 viewport, three engine resolutions |
| `prod-resolution-sweep-1440p.json` | Production, 2560×1440 viewport, three engine resolutions |
| `input-latency-run{1,2}.json` | End-to-end input latency, two runs (medians 11.5 ms and 7.0 ms) |
| `ab-wasm-opt-run{1,2,3}.json` | `-Oz` → `-O3` A/B cycles |
| `ab-wasm-opt-run4.json` | **`-O3` → `-Oz` — the reversed order, and the decisive one** |

---

## 4b. HOSTING A LOCAL BUILD SO IT CAN ACTUALLY PLAY

This is harder than it looks, and three separate things had to be right.
A local build that gets any of them wrong fails in a way that looks like
"the engine did not boot", which is a misleading symptom.

### 4b.1 The API has to be proxied

The frontend fetches the server list from the **relative** path
`api/servers` (`webxash/src/services/ts-server-list.ts:73`). On production
that resolves to the same origin, which is the API. On a local static
server it resolves to `http://127.0.0.1:8899/api/servers`, which does not
exist — so the page shows "SCANNING FOR SERVERS…" forever and PLAY has no
target to resolve.

`tools/perf/serve-local-build.cjs` serves `dist/` and proxies everything
else to production:

```sh
node tools/perf/serve-local-build.cjs --port 8899
```

**Do not "fix" this by fetching production's API absolutely from the page.**
That is the same-origin problem again from the other direction: the browser
blocks the cross-origin request, and the page never sees the fleet. The
proxy has to be same-origin to the page.

### 4b.2 The bridge address has to be the production one

This is the subtle one. `launchOptionsFor` names the bridge only when the
page is secure or the bridge is configured:

```ts
// webxash/src/services/ts-server-list.ts:199-203
const bridge = bridgeAddress();
const secure = typeof location !== 'undefined' && location.protocol === 'https:';
if (bridge && (import.meta.env.VITE_BRIDGE_ADDRESS || secure)) {
  parts.push(`+bridge ${bridge}`);
}
```

`bridgeAddress()` falls back to `location.hostname:location.port`, so from
`127.0.0.1:8899` it returns `127.0.0.1:8899` — and because the page is
`http:`, `secure` is false and **no bridge is named at all**. The engine
then derives the bridge from the game IP, which is not where the bridge
lives. The engine boots and then cannot reach the game.

**The fix is to build with the production bridge address baked in:**

```sh
cd webxash && VITE_ASSET_BASE=https://assets.bulletballet.dev \
             VITE_BRIDGE_ADDRESS=bulletballet.dev:443 \
             npx vite build
```

Verify it landed before running a measurement:

```sh
grep -c "bulletballet.dev:443" dist/assets/index-*.js
```

### 4b.3 The asset base has to point at production — or at the proxy

The 493 MB mod archive is served from `assets.bulletballet.dev`, not from
the frontend.

**If the local build fetches it cross-origin, it fails.** The asset host
serves the archive with **no `Access-Control-Allow-Origin` header** at
all — verified with a request carrying `Origin: http://127.0.0.1:8899`,
which comes back 200 with no CORS header. A browser on a cross-origin
page therefore blocks the fetch outright:

```
FAILED https://assets.bulletballet.dev/hl/ts/manifest.json :: net::ERR_FAILED
```

and the page hangs at "FETCHING GAME DATA" forever, with the engine never
starting. The symptom looks like a boot failure, which is misleading.

**The fix is to make the archive same-origin to the page**, by building
with a *relative* asset base and letting the local server proxy `/hl/*`:

```sh
cd webxash && VITE_ASSET_BASE=/ \
             VITE_BRIDGE_ADDRESS=bulletballet.dev:443 \
             npx vite build
```

With `VITE_ASSET_BASE=/` the bundle resolves the manifest to
`/hl/ts/manifest.json` — relative — and the proxy serves it. Verify:

```sh
grep -o 'hl/ts/manifest.json' dist/assets/index-*.js
```

### 4b.4 A proxy must not forward `content-encoding`

Node's `http`/`https` client does **not** decompress a gzipped response.
If the proxy copies the upstream's `content-encoding: gzip` header onto a
body it is forwarding untouched, the browser tries to inflate bytes that
are already plain and the response is corrupt. The header has to be
**deleted**, not set to `undefined` — `res.writeHead` throws
`ERR_HTTP_INVALID_HEADER_VALUE` on an undefined header value.

---

## 5. TRAPS

- **The fleet rotates.** `waitForFleet` can find zero servers while the
  fleet restarts, and the harness then cannot measure in-game. Retry.
- **The identity modal gates the launch.** PLAY no longer connects
  directly; it opens a modal first. Use `confirmIdentity` from
  `tools/deploy/lib/identity-modal.cjs` — select by class, not by text, or
  the test finds the modal's "Join as ..." button instead of the landing
  page's.
- **The engine's command system does not exist until its first frame.** A
  `Cmd_ExecuteString` before then makes the engine raise its own fatal
  error (`_Mem_Alloc: pool == NULL`), which surfaces in JavaScript as a
  bare `Infinity` thrown out of `Cmd_ExecuteString`. Wait for
  `window.__xash` and a non-zero heap before issuing any command.
- **The page can navigate under you.** The reconnect path reloads the
  page, which destroys the execution context mid-`evaluate`. Wrap the
  measurement in a retry.
- **`v_angle` is a float cvar.** Read it with a numeric regex
  (`"v_angle"\s+is\s+"(-?[\d.]+)"`), not a string match.
- **A `setTimeout` closure over its own handle** throws a TDZ error
  (`Cannot access 't' before initialization`) if the timer is referenced
  in its own initialiser. Name it `timer` and pass the timeout separately.
- **A destructured parameter is not safe to reference inside a
  `new Promise` executor.** `page.evaluate(([n, t]) => new Promise(res =>
  { setTimeout(() => res(t), t); }), [name, ms])` throws
  `ReferenceError: Cannot access 't' before initialization` — the
  executor body runs synchronously during `new Promise(...)`, before the
  destructured binding is established. **Pass an object** and read the
  properties off it: `page.evaluate((args) => new Promise(...), { name,
  timeoutMs })`. This bit `readEngineNumber` in
  `measure-client-perf.cjs` and cost a measurement run.
- **Two A/B runs can disagree in sign, and that is the finding.** The
  `-Oz` vs `-O3` client WASM A/B was run twice. Run 1 said `-O3` halved
  the event-loop lag (4.9 ms vs 14.2 ms); run 2 said `-O3` *increased*
  it (15.8 ms vs 12.7 ms). The cause is visible in run 1's per-window
  data: the lag fell from ~16 ms to ~4 ms across the last three windows
  **of a single run**, which is the machine's state changing (map rolling
  over to a lighter one, bots dying, the client idling between spawns) —
  not the build.

  **The lesson: a 5-second window is not long enough to average the
  server's state, and a single A/B cycle is not enough to decide a
  sub-millisecond claim.** When a result's sign flips between runs, the
  honest answer is "no reproducible difference", not "the second run
  corrected the first". Report the per-window data, not just the mean.

  A useful smell test: if the effect is *larger* than the within-run
  drift, it is not an effect.
- **Measuring input latency has its own traps, and each one produces a
  clean "0 responses" rather than an error.** See
  `measure-input-latency.cjs` for the full list; the short version:
  the pointer must be locked, the menu must not own the cursor, the mouse
  button must be held, and `v_angle` does not exist in this build (use
  the client's `ts_test_view`). The two subtler ones:
  - **A retry must change the pointer position.** With the pointer
    locked, Chromium derives `movementX` from the position delta, so
    dispatching a retry to the *same* coordinates sends
    `movementX: 0` — a mousemove with no delta, which the engine
    correctly ignores. The retry was a silent no-op.
  - **Do not poll the engine faster than the frame rate.** Asking for
    the angles at 125 Hz backed up the engine's print path and made the
    measured latency climb from 12 ms to 53 ms across runs — the
    measurement getting heavier, not the client getting slower. Drive
    the probe from `requestAnimationFrame`, one probe per frame.
  - **Separate clean samples from retried ones.** If a sample needed
    retries, its number includes the harness's retry interval. Time it
    from the first attempt and label it, then report the clean samples
    as the client's latency.

---

## 6. WHAT THE ENGINE CAN TELL YOU ABOUT ITSELF

The console bridge is the only reliable way to read the engine's state, and
it is already wired up. `Cmd_ExecuteString('v_angle')` makes the engine
print its own value, and the loader's stdout bridge republishes it as an
`xash:stdout` window event.

Useful cvars for this work:

| cvar | what it tells you |
|---|---|
| `vid_width` / `vid_height` | the resolution the engine thinks it is rendering at |
| `host_framerate` | the engine's own frame rate, as it reports it |
| `fps_max` | the engine's frame-rate cap |
| `gl_vsync` | the GL backend's vsync |
| `r_lockpvs` | whether the PVS is frozen between frames |
| `r_drawviewmodel` | whether the first-person weapon pass is drawn |
| `r_novis` | whether visibility is computed at all |

There is **no `cvar` subcommand** in Xash3D — `cvar hostmap` returns
"Unknown command: cvar". A **bare cvar name** is the mechanism.