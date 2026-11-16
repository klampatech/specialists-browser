# Live camera — proof of concept

A spectator camera that renders the real game on a real server and paints it
behind the landing page. This is a **POC**, kept so it can be revisited. It is
not on the path to production, and the reasons why are written down below
rather than left as tribal knowledge.

MEDIA: (shots/) — `shots/landing-page-smooth.png` is the landing page with the
camera running; `shots/camera-frame.jpg` is a raw frame straight off the relay.

## What it is

Three pieces:

| Piece | Where | What it does |
|---|---|---|
| `camera-client.cjs` | this directory | A headless Chromium that joins the server as a **spectator**, becomes the server's `CHASE_FREE` observer (so the camera rides a bot instead of flying), captures the engine's canvas with the CDP screencast and pushes JPEG frames to the relay. |
| `frame-relay.cjs` | this directory | A tiny Node server. `POST /frames` takes the frames, `WS /camera/view` fans them out to every visitor, `GET /latest.jpg` serves the current frame, `GET /status` reports health. |
| `LiveCamera.vue` | `webxash/src/components/` | The landing page's canvas. It opens `/camera/view`, paints each frame, and falls back to the dial when the camera is not running. |

The camera client talks to the relay over plain HTTP on localhost. The relay
is the only thing the browser ever talks to.

## Running it

```bash
# The relay (localhost:5180 by default)
node tools/spectator/frame-relay.cjs &

# The camera: the game's URL and the relay's URL
node tools/spectator/camera-client.cjs https://m5.tail1b3795.ts.net:8445/ http://127.0.0.1:5180
```

Environment:

| Variable | Default | Meaning |
|---|---|---|
| `CAMERA_WIDTH` / `CAMERA_HEIGHT` | `800` / `450` | The capture size, and therefore the game's render resolution. |
| `CAMERA_FPS` | `30` | The delivery rate. The engine runs at 60; this is what viewers get. |
| `CAMERA_QUALITY` | `45` | The JPEG quality of each frame. |
| `CAMERA_ZOOM` | `1.08` | A CSS scale on the engine's canvas. Scales about the top edge, so it zooms the shot in and pushes the game's own HUD strip out of frame. |

The camera client takes console commands live, without a restart. Write a
command into the profile directory and it runs within five seconds:

```bash
echo "nohud 1"   > ~/.cache/bulletballet-camera/command.txt   # hide the game's HUD
echo "zoom 1.15" > ~/.cache/bulletballet-camera/command.txt   # re-frame the shot
```

## The bugs that were in the way

This is the part worth keeping. Each of these looked like a different symptom
and none of them was what it seemed.

1. **The graininess was a window, not a resolution.** A persistent Chromium
   context keeps a real window, and that window was 4:3. Playwright's screencast
   scales to *fit* the size box you ask for, so a 4:3 page in a 16:9 box comes
   back 4:3 and small. `setViewportSize` does not move the window; `--window-size`
   does.
2. **The 2-3 fps was the engine's frame pacer.** The client caps the engine's
   frame rate to the *display's* refresh rate, and headless has no display, so
   the measurement is garbage and the cap settles at a few frames a second. The
   relay was dutifully delivering 20 messages a second containing 3 distinct
   frames. `__xashForceFrameCap(1)` turns the cap off.
3. **The spinning was our own camera.** It was a free-flying camera doing a
   turn every four seconds. The server has a better one: `CHASE_FREE`, which
   rides a bot, and the roster tour is the server's `FORWARD` key.
4. **The frozen camera was the server's observer state.** The server owns the
   spectator mode and target, and it clears `iuser1`/`iuser2` when an observer
   respawns. It also only moves the observer's entity to the target's position
   when it *picks* a target — so the target walks out of the client's PVS and
   the client keeps its last camera forever. Re-picking the target moves the
   observer back onto it.
5. **The still frames were a software rasteriser.** Headless Chromium defaults
   to SwiftShader, and a software rasteriser filling 960x540 of game is what
   throttled the engine's rAF to 10-20 Hz. On the AMD iGPU
   (`--use-angle=vulkan`, or `--use-angle=gl-egl` for Mesa GL) the same scene
   runs at 60. **This is the single biggest lever in the whole POC.**
6. **The judder was burst delivery.** The screencast delivers in bursts, so a
   wall-clock rate gate keeps one frame per *burst* — 23 a second instead of
   30, with a p90 inter-arrival of 244 ms. Counting frames gives an exact
   rate, and each frame is pushed as it is produced instead of in 250 ms
   batches.

## What it measured

The work went through several states. The two that matter are the one Kyle
watched — which read as 5-10 fps — and the one this branch leaves behind.

| | when it read as 5-10 fps | now |
|---|---|---|
| Engine frame rate | 10-20 Hz (software GL) | 59.99 fps (AMD iGPU) |
| Distinct frames at the viewer | 2-5 | 30 |
| Delivery | 16-23 fps, in 250 ms bursts | 30 fps, 33 ms apart (median 33, p90 35, max 37) |
| Capture | 960x540 | 800x450 |
| Frame size | ~24 KB | ~15 KB |
| Bandwidth per viewer | ~500 KB/s | ~456 KB/s |

The original capture was 360x270 and cheaper still. The bandwidth problem is
the **rate**, not the resolution: the way to make that number go away is a
codec, not a smaller picture.

## Why it is not going to production

Kyle's own read, which the measurements agree with:

1. **The capture host needs a GPU.** The whole frame rate rests on hardware
   WebGL. A VPS without one drops back to ~15 fps no matter what else is
   right, and the software path costs CPU that the game server wants.
2. **Bandwidth does not scale.** ~456 KB/s per visitor is a video stream
   wearing a landing page's clothes. A hundred visitors is 45 MB/s. The fix is
   a real codec — H.264 at 800x450/30 is ~80-120 KB/s, 4x lighter — and a
   `<video>` element composites far more cheaply than a canvas that gets
   re-uploaded every frame. That is the obvious next build if this is ever
   revived.
3. **The camera counts as a human.** It is a real client of the game server, so
   the registry counts it, and it moves the bot quota and the placement
   logic by one. It has to be excluded by name.
4. **A spectator's camera has a short life in DM.** A joining client starts as
   an observer with a respawn timer, and there is no team to re-join, so once
   the server promotes it to a player it cannot get back without
   reconnecting. In production the camera would drop on every map change.

## The two probes

`capture-bench.cjs` and `gpu-probe.cjs` are the measurements behind the table
above. They are kept because the next person to touch this will want to know
whether the ceiling moved:

```bash
node tools/spectator/capture-bench.cjs   # the capture paths, with realistic frame content
node tools/spectator/gpu-probe.cjs       # whether the browser is on the GPU
node tools/spectator/raf-rate-probe.cjs  # the rAF ceiling of a headless browser
```

## The port change

`ts_specmode <n>` in `crates/client/src/spectator/mod.rs`: the mode selector
without the HLTV-only gate. `specmode` refuses to do anything unless the
engine says the client is spectate-only, which only happens when the *server*
sends `HLTV_ACTIVE`. A client that is an observer — which is what joining the
spectator team makes it — cannot pick a camera mode at all. That is right for a
player and wrong for a camera.
