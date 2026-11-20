# Upstream issues

> **Status 2026-10-24 — the keyboard root cause below is WITHDRAWN.**
> The engine's keyboard works. We proved it, and then shipped a fix that
> is now in production. The original draft report must **not** be filed
> as written. What survives is at the bottom.

---


## THE UPLOAD FIX IS WORTH ABOUT ONE PER CENT. MEASURED, 2026-11-20.

The upload defect is real -- 116,192 reallocating `glBufferData` calls a
second, about 1,937 a frame -- and the fix (allocate the storage once,
update it in place with `glBufferSubData`) removes every one of them.
But the price tag, measured on Kyle's M3 Pro at the shapes the census
saw (`tools/perf/gl-upload-benchmark.cjs`):

    the shape                     bufferData  bufferSubData   saved
    48 bytes  (a quad position)  0.335 us    0.260 us        0.075 us
    32 bytes  (a quad texcoord)  0.221 us    0.203 us        0.018 us
    1 KiB     (a small mesh)     0.290 us    0.258 us        0.032 us

At 116,192 calls a second the 48-byte case saves **8.8 ms of the wall
per second -- about 0.9%** -- and the smaller shapes less.

**THE CENSUS SAID ABOUT 5.8%, AND IT WAS WRONG BY SIX.** It multiplied
the call COUNT by a per-call cost measured in a different shape (a
64 KiB view). The direct measurement is the one that counts.

So: the fix is worth doing -- it removes 116,192 reallocations a second
and the driver-side allocation churn that happens off the JS thread --
but it is NOT the answer to the frame cost. The engine's cost in a
dense fight is 20-48 ms a frame (measured on the M3 Pro, 415 sampled
seconds), and the uploads are a few per cent of that at most. The rest
is the engine's own work and the GPU wait.

## WITHDRAWN: "the WASM build never drains the SDL event queue"

**Formerly:** the root cause of three symptoms, blocked on upstream, with
a drafted report at `/home/kyle/xash3d-wasm-keyboard-bugreport.md`.

**Now:** false. The engine's key path works, and it works in production.

### What proved it

The TS client has its own diagnostic, `ts_dev_keylog 1`. In a real
Chromium against a live server:

```
[ts key] HUD_Key_Event escape down=1 binding="cancelselect" -> 1
[ts key] cancelselect: escape
```

The engine's `keydown` listener fires, reaches `HUD_Key_Event`, and runs
its own bind table. Everything the bind table covers works in
production today: movement, weapon slots, chat, the buy menu, the
console, Escape.

### Why the earlier evidence looked so convincing

Two separate probes, and both of them were broken in the same way —
**they measured the queue at a moment when the engine had not been
given a chance to drain it, and they could not tell "still queued" from
"drained and ignored".**

**Ours** (`webxash/src/services/sdl-key-inject.ts`, now deleted): it
pushed a synthetic key and then asked `SDL_HasEvents` whether the queue
was empty. `SDL_PushEvent` puts the event **in** the queue, so the
answer immediately afterwards is necessarily "yes, there is an event".
The probe could never pass. It logged `REFUSED by SDL` on every key and
disabled itself — and that log line is what the whole belief was built
on. It was a probe that could not pass, not a measurement of the engine.

**The upstream one** (`probe-input.js` and the manual experiment behind
the draft): it pushed synthetic `SDL_KeyboardEvent`s, waited two
seconds, and found them still in the queue. Two things it did not
control for:

- It checked the queue **outside** the engine's frame loop. An event
  waiting for the next `Host_RunFrame` is still queued — "still there"
  is not "never drained".
- The synthetic event was hand-built. The engine's SDL2 handler reads
  `key.keysym.scancode` and **uses it directly as the engine keynum**,
  so a synthetic event with the wrong layout is consumed and produces no
  key. From outside, "the event is still queued" and "the engine took
  it and did nothing" look identical.

The probe does not distinguish those, so it does not support the
conclusion drawn from it. The conclusion it was used for — *"the engine
does not call `SDL_PollEvent()` / `Platform_RunEvents()` at all"* —
cannot be true, because the engine's own key path runs through exactly
those two functions.

### The honest summary

**This is our bug, not an upstream one.** The frontend was sending every
key twice, and the belief that the engine could not be trusted with keys
is what produced the second send. The fix — delete the command map, let
the engine's bind table do the work — is in production, and Kyle
confirmed from the browser on 2026-10-24: *"the fixes seem to have
taken as well. Didn't experience double presses."*

**Do not file the draft.** A maintainer reading it would be told their
keyboard is dead, with a "smoking gun" that does not show that.

### The lesson worth keeping

The instrument was wrong, and the wrong instrument produced a confident,
specific, filed-able story. The diagnostic that settled it —
`ts_dev_keylog 1`, the **client's own** key log — was one command away
the whole time.

---

## Bug 2: bare `reload` aborts the wasm heap

**Affects:** nothing in normal play; the bridge avoids it
**Status:** root cause located, engine-side, unfixed — **but the heap cap it OOMs on was raised on 2026-10-24, so this is now TESTABLE and possibly already fixed**
**Still valid** — this one was never about the keyboard.
**UPDATE (2026-10-24):** the client's wasm heap cap was the root cause of a *different* OOM (the map-change freeze), and it was raised from 256 MB / 256 MB to **512 MB initial / 2 GB maximum**. The published module declared `maximum == initial`, so the heap could not grow at all. A bare `reload` that aborts with `Aborted(OOM)` is very likely the same wall — but the reload probe was **not** re-run after the patch, so do NOT record this as fixed. Re-run it and either close the bug or update this line with the measurement.

### Bisected, not assumed

| Command | Result |
|---|---|
| `reload` (bare) | **`Aborted(OOM)` on iteration 1** |
| `+reload` / `-reload` pairs | survives 40 iterations |
| `jump` `duck` `forward` `attack` `speed` `alt1` `slot1` `use` `lastinv` (all bare) | all survive 40 |

Only `reload` is fatal. Uniqueness like that rules out "all commands
leak" and points at one specific engine path.

### Where it is NOT

The port's reload handler (`crates/client/src/events/misc.rs`) has a
correct `id <= 0` guard — and instrumenting it shows **it is never
called** for the bare command. Zero debug lines. The fault is entirely
inside the engine, upstream of the client DLL.

That guard was written, built, deployed, sha256-verified as the served
artifact, and changed nothing — because the function was never on the
path. The lesson is in the probe rules: instrument before you patch.

### Our exposure is gone

It used to be reachable: the frontend mapped `R` to a bare `reload`.
That map is deleted, and the browser mappings use the held `+reload` /
`-reload` pair. The engine defect remains.

---

## Bug 3: fatal `_Mem_Alloc: pool == NULL` at boot

**Affects:** unknown
**Status:** observation, not yet correlated with anything
**Still valid, and now unrelated to the keyboard** — the original
"it may or may not be related to the keyboard defect" question is
answered: not related, because the keyboard defect was never real.

```
Sys_Error: _Mem_Alloc: pool == NULL (alloc at cmd.c:638)
```

`cmd_pool` is allocated in `Cmd_Init()` (`engine/common/cmd.c:1341`).
Line 638 is the allocation inside `Cmd_TokenizeString()`. So a command
string is being tokenized **before** `Cmd_Init()` runs.

The engine logs the error and limps on — the bind table is intact,
`echo` works, so the command channel is healthy. But `Sys_Error` sets
`host.status = HOST_ERR_FATAL` and calls `Sys_Quit`; in WASM the
instance survives and keeps booting, so the engine runs the whole
session in an error state.

**Do not write this off as cosmetic, and do not rebuild the allocator.**
It is a real, separate observation, and filing it alongside anything
else engine-side is cheap.

---

## Facts worth keeping, about the artifact itself

These are checkable and independent of the withdrawn keyboard claim.

**The npm package is flagged deprecated:** *"This package is deprecated
and will be removed."*

**Upstream's Emscripten build support was dismantled after the artifact
was published:**

- `scripts/waifulib/c_emscripten.py` deleted 2026-02-08 (commit
  `d9221c8491`, "scripts: waifulib: remove outdated stuff").
- npm `xash3d-fwgs` 1.2.2 published 2026-01-19.
- Upstream master still carries the `DEST_OS == 'emscripten'` linkflags
  in `engine/wscript:303-316` and `xcompile.py` still exposes
  `--emscripten` — but the tool that configured the emcc build is gone.

So **nobody can rebuild this artifact from current master.** That is the
fact that matters to anyone picking up an Emscripten issue there.

### On event-type values

The artifact is **SDL2** (2.32.8 Emscripten port), not SDL3. In SDL2:

| Value | Meaning |
|---|---|
| `0x200` | `SDL_WINDOWEVENT` |
| `0x300` | `SDL_KEYDOWN` |
| `0x303` | `SDL_TEXTINPUT` |
| `0x1100` | `SDL_AUDIODEVICEADDED` |

`0x1100` is **not** text input — that is SDL3's `SDL_EVENT_TEXT_INPUT`.
The two `0x1100`s are audio-device-added events pushed during SDL audio
init. Do not use SDL3 event names when writing to this maintainer.

### Where to file, if something is filed

| Where | What |
|---|---|
| **`FWGS/xash3d-fwgs`** (new issue) | Primary. 432 open, `has_issues: true`. |
| **`FWGS/xash3d-fwgs`** #1226 (comment) | Closed but is the live WASM thread. Leave a pointer. |
| **`x8BitRain/webXash`** (new issue) | The frontend that actually consumes these npm builds. |
| **Discord** `https://xash.su/discord/` | Fastest route to a maintainer. |

**Do not file in:**
- `yohimik/webxash3d-fwgs` — **404**. It is the npm package's declared
  `repository`/`bugs` URL and it no longer exists.
- `swtkiptr/webxash3d-fwgs` — `has_issues: false`, cannot file.
- The `discord.gg/cRNGjWfTDd` invite in the npm README — **expired** (404).

---

## Follow-up checklist

- [x] Withdraw the keyboard root cause and the draft report — done
      2026-10-24, in this file
- [x] Delete the invalid drain probe (`sdl-key-inject.ts`) — done, with
      the command map, in webXash#1
- [x] Replace it with the instrument that works: `ts_dev_keylog 1` — in
      the TS client
- [ ] If a report is filed at all, it should carry **only** what
      survives: Bug 2 (bare `reload` OOM), Bug 3 (`_Mem_Alloc`), and the
      deprecation / Emscripten-dismantling fact. No keyboard claim.
- [ ] Re-run `tools/port/tsp-rs/scripts/probe-input.js` against a future
      upstream WASM build — but for a **key press**, not a queue drain.
      The drain probe is invalid and a re-run of it tells you nothing.

## WITHDRAWN: "the client asks WebGL for a 512 MiB buffer, 88,000 times a second"

**WITHDRAWN 2026-11-20. THE 512 MiB DOES NOT EXIST.** It was our own
census that invented it, and the mistake was in the instrument, not in
the engine. Everything downstream of it — the patch that was about to be
written, the upstream issue that was about to be filed, the arithmetic
that said 60 fps was unreachable — was built on that number.

### What the census actually measured

`tools/perf/gl-upload-probe.cjs` counted the bytes of every `bufferData`
call by reading the byteLength of the SOURCE ARGUMENT. WebGL2 has two
overloads, and they say different things:

    bufferData(target, size, usage)                        -- `size` is the
                                                             byte count
    bufferData(target, srcData, usage, srcOffset, length)  -- `length` is
                                                             the byte count,
                                                             and `srcData` is
                                                             only a CARRIER

The emscripten glue uses the second one and passes the WHOLE wasm heap
as the carrier:

    GLctx.bufferData(target, HEAPU8, usage, data, size)

The wasm heap is 512 MiB. So the census read the carrier's size and
reported **536,870,912 bytes for every call** — 1,767,755 of them in 20
seconds. The engine never asked for 512 MiB of anything.

The old census was wrong in a second way, and it is worse: it read
`stats.stacks` before it had ever been initialised, so every call over
1 MiB raised a **TypeError inside the engine's own upload**. The real
uploads never reached WebGL while the census ran — the census measured
a client whose geometry was not being uploaded at all — and the stack it
was supposed to capture was never captured.

Both faults are fixed, and both are held by tests that run the exact
script the browser runs (`tools/perf/lib/gl-upload-init.cjs`,
`tests/unit/gl-upload-accounting.test.mjs`,
`tests/unit/gl-upload-probe-init.test.mjs`).

### What the calls really are

The CPU profile's own stacks say where they come from, and they do not
say `getTempVertexBuffer`:

    bufferData
     <- _emscripten_glBufferData      (xash3d-<hash>.js)
     <- wasm-to-js
     <- wasm-function[72]             (the renderer module)
     <- wasm-function[121]
     <- wasm-function[8958]           (xash.wasm)

So these are the ENGINE'S OWN uploads — the renderer's vertex buffers —
not the glue's temp-buffer cache. The old section's quote of
`getTempVertexBuffer` was a guess at a call site that the profile
disproves.

**MEASURED AGAIN, WITH THE FIXED CENSUS**, on the CI rig (16 bots, a
real fight, `ts_casa`, 20 s, canvas 897x534, the engine at 60.0 fps):

    bufferData calls        2,323,843   (116,192 a second)
    bytes uploaded          2,494,098,812   (122 MB a second)
    per engine frame        ~1,937 calls, ~2.0 MB
    bufferSubData calls        44,156   (2,208 a second), 258 MB
    buffers CREATED           28,686   (1,434 a second)

**AND THE PAYLOADS ARE TINY.** The census of sizes:

    48 bytes      1,233,110 calls   (53% of every call)
    32 bytes        510,777 calls   (22%)
    72 bytes         74,702
    60 bytes         70,522
    40 bytes         70,522
    36 bytes         62,289
    24 bytes         62,289
    ... every size under 130 bytes

**So the renderer uploads a 48-byte vertex buffer 61,655 times a second.**
A 48-byte payload is four vertices of position+normal+texcoord — a quad.
The bytes are not the problem: at the measured 0.32 us per KiB, 122 MB
a second is **3.9% of the wall**, while 116,192 calls at ~0.5 us of
fixed cost each is **5.8%**. Together, ~10%, which is exactly what the
CPU profile finds (10.83% in a dense fight).

**THE COST IS THE CALL COUNT, NOT THE DATA.** That is the whole finding,
and it is a different finding from the one the old census reported.

### Why they cost anything — measured, not argued

A/B, in a real browser, one call shape at a time (`gl.finish()` after
each block, so the driver's work is included):

    view 64 KiB, range 256          0.60 us/call
    view 64 KiB, range 1024         1.40 us/call
    view 64 KiB, range 4096         3.85 us/call
    view 64 KiB, range 16384        9.20 us/call
    view 64 KiB, range 65536       21.75 us/call
    view 512 MiB, range 1024        1.40 us/call
    view 512 MiB, WHOLE view      102.6 ms/call

**The carrier's size does not matter.** A 512 MiB view with a 1 KiB
range costs the same as a 64 KiB view with the same range. The cost is
the UPLOADED bytes: about 0.5 us fixed per call and about 0.32 us per
KiB. So there is no cheap trick in the glue — passing a smaller view
changes nothing, and the old section's hope that "a 512 MiB reservation
is not free on a real GPU" was chasing a number that was never a
reservation.

### What this leaves, and where the fix has to live

The defect is REAL, and it is the call COUNT: **116,192 `bufferData`
calls a second — ~1,937 a frame — each a full re-allocation of the
renderer's vertex buffer**, and 53% of them carrying 48 bytes. The
renderer uses `GL_STREAM_DRAW` and `glBufferData`, never a sub-data
update, so every one of those calls re-allocates a buffer to carry a
quad's worth of vertices. It costs 6.56% of the wall in a fight and
10.83% in a dense one, and the split is 5.8% fixed cost per call and
3.9% for the bytes.

**THE FIX IS UPSTREAM, IN THE RENDERER, AND NOT IN THE GLUE.** The
renderer is a separate wasm module (`libref_webgl2.wasm`, built from
`ref/gl/gl2_shim/gl2_shim.c` in FWGS/xash3d-fwgs); its
`GL2_UploadBufferData` re-uploads an attribute buffer with
`glBufferData` on every update. There is no persistent-mapping path on
WebGL2 (`glBufferStorage` does not exist there), so the shim falls back
to re-allocating. The upstream shape of the fix is one buffer per
attribute, reused, updated with `glBufferSubData` — which would take
the cost from "per call" to "per byte" and give back most of the 5.8%.

**We cannot ship that fix.** The engine is a prebuilt artifact
(`tools/deploy/fetch-engine.sh`), and the renderer is C inside it. The
emsdk is on this box, so building the engine from upstream source is
possible — and it is a project of its own, not a patch.

### The lesson worth keeping

**An instrument that has never been executed will confidently report a
number that does not exist.** The census was written, run, and believed
for a day. The one assertion that would have caught it — "a 1 KiB upload
must not be counted as 512 MiB" — is a single line in a test, and it
now exists.

## 2026-11-19 (later) — THE CPU/GPU SPLIT, AND THE RENDER SCALE IS A LEVER TOO

The CPU profile of a dense production fight (the rig's client, in a
real fight with bots, 50 s):

    IDLE -- the GPU wait           48.6% of the wall
    the wasm engine's own work     23.5%         46% of the busy thread
    the GL call path                20.1%         39% of the busy thread
      bufferData                    10.83%        21.1% of the busy thread
      the per-draw state churn       8.0%         15.2% of the busy thread
    the emscripten/xash glue         2.9%
    our own app JS                  0.3%          0.6%

### The correction

The previous section in this file said the render scale was not worth
promising, because the uploads are vertex data and do not scale with
the pixels. That was true of the uploads and wrong about the
bottleneck: **48.6% of the main thread is idle, waiting for the GPU.**
That is the compositor pushing the canvas, and a smaller canvas cuts
it. The render scale IS a lever -- one we control, with no upstream PR
and no waiting on anyone.

### What the split means

**Two levers, and they are not the same size.**

- **Upstream.** The renderer's buffer uploads are 21% of the busy main
  thread, and the per-draw GL state churn is another 15%. Together the
  GL path is 39% of the busy thread and almost all of it is avoidable.
  One bug, one PR, and every machine gets faster -- including the
  servers. The catch is that it is upstream's schedule and it needs
  their buy-in on the caching semantics. (The "512 MiB" framing of this
  was withdrawn above; the upload volume was never the size of the
  buffer, only the number of the calls.)
- **Ours.** The GPU wait is half the main thread. A render scale cuts
  it, at the cost of sharpness. Deployable today.

### The pacer is not the judder

On Kyle's M3 Pro, in a dense fight, the engine cost 32.66 ms a frame
and the browser ticked at 29.2 Hz. The gate stayed at 1/1 for the whole
session: the pacer *wanted* 1 frame in 2 and left the gate alone
because the engine's cost had not crossed the threshold for it. The
judder was the engine's frame cost varying -- 34 ms to 132 ms -- with
21% of the frames late. The pacer can choose a rate; it cannot make a
30 ms frame cheaper.

### The clock fix is confirmed

In that same dense fight the logic clock's shortest gap was 15.02 ms
across 11,734 ticks: no catch-up burst, even at 30 ms a frame. Before
the fix the same situation produced 10.24 ms gaps at p50 and 1.16 ms
at worst. The rubber-banding is gone.
## THE BUILD RECIPE FOR THE PATCHED ENGINE IS NOT PUBLIC. 2026-11-20.

The patch is written and it is correct; what is missing is the BUILD.

**WHAT THE PATCH NEEDS.** `ref/gl/gl2_shim/gl2_shim.c`, three call sites
(`GL2_UploadBufferData` and the two `glBufferData` calls in the
immediate-mode path): allocate the storage once, update it in place with
`glBufferSubData`. The capacity is tracked per buffer in the ring.

**THE PATCH IS CORRECT AGAINST THE SHIPPED GLUE**, and that was checked
rather than assumed. The glue's own dispatch:

    _emscripten_glBufferData = (e,r,t,n) => {
      t && r ? GLctx.bufferData(e, HEAPU8, n, t, r) : GLctx.bufferData(e, r, n);
    }

so a NULL data pointer takes the `bufferData(target, size, usage)` path
-- allocate-without-data -- and `glBufferSubData(target, offset, HEAPU8,
pointer, size)` treats the C pointer as an offset into the wasm heap,
which is what it is. Both are what the patch needs.

**WHY THE BUILD IS NOT JUST A FLAG.** The engine is published as the npm
package `xash3d-fwgs` (1.2.2+commit.7c58854), built by a Docker image
in a repository that is NOT public (`yohimik/webxash3d-fwgs`:
"Repository not found"). The FWGS source tree does carry the
emscripten branches (`conf.env.DEST_OS == 'emscripten'`), so the build
system was extended for it -- but:

  - `waf configure --dest-os=emscripten` is rejected: this waf (2.1.9)
    has no `--dest-os` option, and `DEST_OS` comes from
    `Utils.unversioned_sys_platform()` -- 'linux' here;
  - waf's own `cc_load_tools` does `if not conf.env.DEST_OS:
    conf.env.DEST_OS = ...`, so DEST_OS CAN be set before the tools
    load -- which means a patched wscript (or a waf with emscripten
    support) is the way in, not a flag;
  - emscripten 6.0.12 IS installed and working (`~/emsdk/upstream/
    emscripten/emcc`).

**SO THE NEXT STEP IS:** set `DEST_OS = 'emscripten'` before the c/cxx
tools load, point the compiler at `emcc`, and build -- then measure the
upload census again. The census is the proof: `glBufferData` calls
should go from 116,192 a second to nearly nothing, and `bufferSubData`
should take their place.
