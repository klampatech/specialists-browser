# Front end / mod — the work list, specced and grouped

Written 2026-10-23. Every "now" below was read out of the code in this
repo, not assumed. Where something is unverified it says so, because the
difference decides how the work is sequenced.

## The thing that shapes everything else

**Every key was being delivered twice.** That one fact explains most of
this list, and it was measured rather than assumed.

The engine's own keyboard path works. With the TS client's own
`ts_dev_keylog 1`, in a real Chromium against a live local server:

```
[ts key] HUD_Key_Event escape down=1 binding="cancelselect" -> 1
[ts key] cancelselect: escape
```

The engine's keydown listener fires, reaches `HUD_Key_Event`, and runs
its own bind table. The long-held belief that it was dead — recorded in
`keyboard-bridge.ts`, in `sdl-key-inject.ts`, and in the how-to-play
copy — was wrong.

And the engine's bind table (`ts/config.cfg`) already covers everything:

```
bind "w" "+forward"     bind "s" "+back"
bind "a" "+moveleft"    bind "d" "+moveright"
bind "SPACE" "+jump"    bind "CTRL" "+duck"
bind "1".."0" "slot1".."slot10"
bind "x" "thirdperson"  bind "y" "messagemode"
bind "b" "buy"          bind "`" "toggleconsole"
bind "ESCAPE" "cancelselect"
```

`keyboard-bridge.ts` sent the same thing again, as a command. So every
one of those keys ran twice — once from the engine's bind table and once
from us. That is the whole of the reported bugs:

| symptom | cause |
|---|---|
| "typing triggers hot keys AND types at the same time" | Y opened the chat twice, and the real keystroke typed a `y` into a chat that was already open |
| the buy menu takes each number selection twice | `Digit1` → `slot1` from us, and `bind "1" "slot1"` from the engine |
| third person looks broken | X ran `thirdperson` twice — on, then straight back off |
| the backquote is a trap | `toggleconsole` twice, with a console that cannot be typed into |

**So the command map is deleted.** The bridge now does exactly one
thing: open TS's anti-script gate for the keys whose native binding is
gated, because the gate only opens on a real key event.

### Three corrections to earlier readings of this

**The buy menu is not a trap.** It is navigated by the weapon-slot
buttons — keys `1..11`, which is `slot1`..`slot10` plus `a`. The
frontend mapped `Digit1 → slot1` … `Digit0 → slot10`, so B opened the
menu and 0-9 drove it. Kyle plays it; it works. Two details from the
client source: Escape does **not** close it ("the buy menu takes no
keys here"), and the mouse drives it too ("runs the row under the
cursor on a left release").

**The SDL injection never worked.** `sdl-key-inject.ts` pushes one event
and then asks `SDL_HasEvents` whether the queue is empty.
`SDL_PushEvent` puts the event *in* the queue, so the answer is
necessarily "yes, there is an event" — the probe returns false and the
service disables itself forever. The log said `REFUSED by SDL` on every
key. It is deleted.

**Typing was never blocked.** Kyle's worry was that there is no way
around the SDL queue not draining. There was never a problem: the
engine's own key path was carrying the keys the whole time.

### The hazard this exposes

`HUD_Key_Event` returns 1 for Escape when the client's own menu did not
take it, and the source says what the engine then does:

> 1 hands it to the engine, which for Escape opens the main menu
> (newer FWGS) or runs its `cancelselect` binding (Steam GoldSrc, FWGS
> 0.21), which sends `escape`.

The browser's engine is the `xash3d-fwgs` **1.2.2** npm build and which
of the two behaviours it has was never established. **The design in A3
dodges this entirely**: Escape is intercepted in the DOM and never
becomes an engine key, so neither behaviour can happen. The question
never has to be answered.

## Batch A — the key map, and the engine's menus

**This batch is implemented and verified locally.** It is written up here
so the reasoning survives, not because it is still to do.

Everything lives in `webxash/src/services/`, plus one overlay
component. Branch: `webxash` @ `feat/keyboard-native-input`.

### A0. Delete the command map — DONE

- **Was:** every DOM key was translated into an engine command and sent
  with `Cmd_ExecuteString`, on the belief that the engine's own keyboard
  path was dead. It is alive.
- **Now:** the bridge sends **no commands**. The engine's bind table
  runs. The bridge's only remaining job is opening TS's anti-script
  gate (`ts_gate 200`) for the keys whose native binding is gated —
  `forward`, `back`, `moveleft`, `moveright`, `jump`, `duck`, `reload`,
  `attack` — because the gate only opens on a real key event.
- **Also gone:** the DOM→SDL injection (`sdl-key-inject.ts`), whose drain
  probe could never pass.
- **Accept:** every key reaches the engine exactly once.

### A1. Hide the buy menu — DONE

- **Was:** `KeyB: 'buy'` in the frontend map, and a `B` row in
  `TSHowToPlay.vue`, which **is** mounted in the production landing
  page.
- **Now:** removing the frontend binding is not enough — the engine
  binds `b` to `buy` itself. The binding is cleared **in the engine's
  bind table**, at boot:
  ```ts
  for (const cmd of ['bind b ""', 'bind ` ""', 'bind ~ ""', 'bind ESCAPE ""']) {
    options.xash.Cmd_ExecuteString(cmd);
  }
  ```
  That runs in `XashLoader.onAfterLoad`, which every launch path calls.
- **Accept:** B does nothing, and the UI no longer advertises it.

### A2. Remove console access — DONE

- **Was:** `Backquote: 'toggleconsole'` in the frontend map, plus a
  `` ` `` row in `TSHowToPlay.vue`.
- **Now:** cleared in the engine's bind table, same as A1.
- **Accept:** the backquote does nothing; no production UI advertises a
  console.

### A3. The two-Escape design — DONE

Kyle's target:

> hit Esc once to release the mouse, then hit Esc again to show a CSS
> style menu that lets the user change settings and quit back to the Web UI

**Both Escapes are pure DOM. The engine never sees Escape.**

- **Escape #1** — `document.exitPointerLock()`. A short hint says what
  to do next.
- **Escape #2** — open the options overlay.
- **Escape #3** — close it.

`webxash/src/services/escape-gate.ts` intercepts the key on `window`
with `capture: true`, registered **at module load** — before the engine
boots and registers its own listener on `window` — and calls
`stopImmediatePropagation()`. That kills the remaining listeners on that
node *and* the rest of the propagation, so it does not matter whether
the engine registered with `useCapture` true or false.

The Escape sequence is a **state machine**, not a read of
`document.pointerLockElement`: the browser also exits pointer lock on
Escape, on its own, so reading the live state would make the first
press look like the second.

- **Verified locally:** Escape #1 released the pointer lock and the
  engine saw **zero** `cancelselect` events; Escape #2 opened the
  overlay with the cvars loaded; Escape #3 closed it.

### A4. The options overlay — DONE

`webxash/src/components/XashOptionsOverlay.vue`. DOM, so a text field in
it is a real text field — it types instead of firing a hotkey.

- **Settings** — sensitivity, FOV, volume. Read and written through the
  engine's own console (`Cmd_ExecuteString`), with a new
  `engine-cvars.ts` helper. Reading is a bare cvar name, which the
  engine answers with `"sensitivity" is "1.7" ( "3" )` on stdout; the
  loader's stdout bridge carries it to the page.
- **Name** — `name "<n>"`, the client's own command.
- **Third person** — a button that runs `thirdperson`.
- **Quit to web UI** — releases the pointer lock and returns to the
  landing page. **Not a black screen** — that was today's behaviour and
  it is the thing Kyle complained about.

### A5. The chat / typing bug — FIXED BY A0

Nothing to do. The bug was the double delivery: Y opened the chat twice
and the real keystroke typed a `y` into it. With the command map gone,
the engine's own `bind "y" "messagemode"` runs once and the keystroke
types once.

### A6. Third person — FIXED BY A0

`bind "x" "thirdperson"` is in the engine's bind table, and it works.
It looked broken because X ran `thirdperson` twice — on, then straight
back off.

There is also a rule, not a bug: the client's toggle refuses to *enter*
third person while you are an observer ("an observer can leave third
person but not enter it"), so you have to be alive. The controls list
now says so.

### Still open in this batch

- **In-game verification of movement and third person.** The frontend
  changes are verified locally, but the local client could not complete
  a connection to the local game server: GoldSrc refuses loopback
  connects, and the Tailscale address does not reach this host's own
  docker-published UDP port. Production is unaffected and was not
  touched.

## Batch B — the launch path

The landing page, the store, and the server list. Shares one file
(`stores/store.ts`) and one service (`services/ts-server-list.ts`).

### B1. Matchmaking: highest population that is not full

- **Now:** the policy already exists and it is **the opposite** of what
  is wanted. `resolveLaunchTarget()` in `ts-server-list.ts` sorts by
  *fewest* humans first, with a comment explaining that TS is an FFA
  deathmatch and players want company. Kyle wants the **highest
  population that is not full**.
- **Do:** flip the comparator — servers with room first, then **most**
  humans, then id as the tiebreak. Full servers go last (or are
  excluded, depending on whether a full server should be an error or a
  fallback).
- **Accept:** PLAY joins the fullest server with room. The server
  browser still shows every server, so a player can override.
- **Note:** the fleet currently runs one instance, so this is untestable
  in production until there are two. It should be written and unit
  tested against synthetic server lists — the policy is a pure function
  and should be extracted so it can be.
- **Effort:** small. **Risk:** none.

### B2. Default to full screen

- **Now:** the engine takes `-fullscreen` as an argument
  (`xash-loader.ts`, `FULLSCREEN_ARGS`), but the production path never
  passes it — the dev-only `XashLaunchOptions.vue` has the checkbox and
  is not mounted in production.
- **Do:** two parts, and the distinction matters:
  - **engine window**: pass `-fullscreen` in the production launch
    options.
  - **browser fullscreen**: `canvas.requestFullscreen()`, which only
    works from a user gesture — the PLAY click qualifies. The canvas
    also has to be resized on `fullscreenchange` and on window resize;
    the engine's internal resolution is separate from the CSS size.
- **Accept:** clicking PLAY enters fullscreen without a second prompt,
  and leaving the game leaves it.
- **Risk:** medium-low. The engine's aspect ratio and mouse look both
  depend on the canvas size, so this needs a browser test.

### B3. Favicon

- **Now:** there **is** an icon — `webxash/index.html` points at
  `/src/assets/hl-bright.svg`, which is the **Half-Life logo**. So this
  is not "add a favicon", it is "stop shipping Half-Life's logo under
  our own domain", which matters for the brand and possibly for the
  licence posture.
- **Do:** blocked on the logo. Ship a deliberate placeholder now — a
  dark square with the `bulletballet` mark in the current signal colour
  (`--ts-signal`) — so it does not look like an oversight, then swap it
  for the real one when the brand lands.
- **Accept:** the tab shows a bulletballet icon, not Half-Life's.
- **Related, same file:** `<title>` is `The Specialists` and needs to
  become `bulletballet`.

### B4. Rebrand

- **Now:** "in progress from Claude" per Kyle — the brand identity work
  is separate and will follow.
- **Do:** apply the identity across the surface — names, copy, the
  loading screen, the in-game options overlay, the favicon, the page
  title, and the server hostname (`bulletballet TS` is the A2S name, so
  it needs to be set where the server config lives, not just in the UI).
- **Note for whoever picks this up:** the **server** advertises the
  name. Rebranding the front end alone leaves `bulletballet TS` in the
  server browser. That is a server-side change.

---

## Batch C — loading performance

### C1. Get the decompression off the main thread

- **Now:** the download is already streamed and off-thread (eight ranged
  fetches). The **unzip is not**: `processZip` in `xash-loader.ts`
  inflates 492MB into 885MB across ~5,300 files with a 1MB chunked
  `Unzip` on the main thread, then writes each member into the WASM
  MEMFS with `FS.writeFile`. Both the inflate and the FS writes are
  main-thread work, and that is the stutter.
- **Constraint:** the WASM filesystem lives in the main thread's WASM
  memory, so a worker cannot write to it. The worker can do the
  expensive part (inflate) and hand the bytes back.
- **Do:** move the inflate into a Web Worker. The worker receives the
  zip, inflates member by member, and posts each member's bytes plus
  the running output-byte total. The main thread writes to MEMFS and
  renders progress.
- **Honest progress:** keep it byte-exact. The current implementation
  reports output bytes against the real total and never goes backwards
  — that must survive the move, and the worker is the natural place to
  compute the total honestly.
- **Also worth doing:** the writes themselves. Writing 885MB into MEMFS
  one member at a time is a lot of small allocations; batching or
  writing the largest members first would smooth the bar further.
- **Accept:** the loading screen stays responsive during extraction, the
  progress bar still moves honestly, and the total load time does not
  regress. **Measure before and after** — this is a perf item and needs
  numbers, not a feeling.
- **Risk:** medium. It touches the boot path, which is the one path
  where a bug means "nobody can play".

---

## Batch D — the menus, rebuilt

### D1. A DOM buy menu

- **Now:** `TSHud.vue` has a DOM buy menu (categories, items, prices,
  "Press ESC to close") that is JS-simulated and hidden by default
  because its values contradict the live engine HUD.
- **Do:** rebuild it against live state, as its own component rather
  than part of the HUD, with the engine's buy command replaced by DOM
  calls. The knobs it needs are `ts_bot_quota`-style client cvars and
  the server's item list.
- **Accept:** the buy menu shows the player's real money and real
  inventory, buying works, and it can always be closed.
- **Depends on:** the same overlay infrastructure as A4. Doing A4 first
  means the buy menu is a second instance of a pattern that already
  works.

### D2. Pre-game setup (name, character, config)

- **Now:** nothing. The player picks nothing before joining.
- **Do:** a pre-game step, before the engine connects — name, character
  selection, and any client-side configuration. This is a good candidate
  for a step *between* the landing page and the boot, because it does
  not need the engine at all: it is the browser talking to the server
  over HTTP.
- **Open question:** does the TS server expose a way to set the player's
  name and character before connecting, or does it have to happen in the
  engine's own menu after connecting? That determines whether this is a
  web UI or an engine menu, and it needs a look at the server-side
  config.
- **Accept:** the player chooses a name and character before their
  first life, and it persists.

### D3. Expose client-side knobs

- **Now:** `live-state.ts` can already read cvars. There is no UI.
- **Do:** decide which knobs are safe to expose — sensitivity, FOV,
  crosshair, name, maybe the weapon-config slots. Write them with
  `exec('<cvar> <value>')`.
- **Constraint:** writing a cvar while the engine is mid-frame is fine,
  but a cvar that changes the render size (FOV is safe; resolution is
  not) needs a resize path.
- **Accept:** a settings panel with the chosen knobs, persisted across
  sessions (localStorage is enough).

---

## Suggested order

| batch | why then | gate |
|---|---|---|
| **A** | the key map is one file, and every other item's design depends on A0's answer | A0 first — one keypress decides whether the command map stays at all |
| **B** | independent of the engine, small, and B1 is a visible product change | B1 first — it is a policy flip and a unit test |
| **C** | isolated perf work, but it touches the boot path, so do it when nothing else is in flight | measure before/after |
| **D** | the largest build, and it reuses A4's overlay infrastructure | after A4 |

Batch B has no dependencies at all and can go first if you want
something on screen quickly. A1 and A2 are both one-liners and are
worth doing on their own even before A0 — the buy menu and the console
are both advertised to every player today, and neither should be.

**The diagnostic in A3 is worth doing before any code is written.** It
is five minutes at the keyboard, and it decides whether A3 and A4 are
about the keyboard or about a mouse-navigable VGUI menu.

## What is deliberately not in this list

- **Matchmaking by skill.** Explicitly out of scope — Kyle said not ELO
  based.
- **Removing game content.** Deferred at Kyle's request until the maps
  and gameplay are decided.
- **Native SDL input.** If A0 shows the engine cannot drain its queue,
  the whole design routes around it (DOM overlays and engine commands
  only). That is a bigger constraint than it looks and it shapes A3, A4
  and A5 — but it does not block B, C or D.
