# Front end / mod — the work list, specced and grouped

Written 2026-10-23. Every "now" below was read out of the code in this
repo, not assumed. Where something is unverified it says so, because the
difference decides how the work is sequenced.

## The thing that shapes everything else

**The engine's own keyboard path is dead in this WASM build.** Nothing
drains its SDL event queue — not even the engine's own window and text
events. `webxash/src/services/sdl-key-inject.ts` says so at the top, and
the service self-disables after one probe.

So every key the player presses is translated by us into an engine
command and pushed down `Cmd_ExecuteString`. That is `Route C`, and it
is what `webxash/src/services/keyboard-bridge.ts` implements:

| kind | example | how it is sent |
|---|---|---|
| held | `+forward`, `+jump`, `+duck`, `+showscores`, `+reload` | `+cmd` on keydown, `-cmd` on keyup |
| instant | `slot1`, `use`, `impulse 100`, `messagemode`, `thirdperson` | `cmd` once, on keydown |

Two consequences run through this whole list:

1. **We own the key map.** `keyboard-bridge.ts` is a single table. If a
   key opens something we do not want, the fix is to remove it from the
   table. That is cheap and certain.
2. **We cannot intercept the engine's own UI.** The engine's GoldSrc
   menu, its console, and the TS buy menu are all driven by the engine's
   key handling. If the engine opens one, our DOM overlay cannot take
   that key back — we would have to close the menu by executing an
   engine command.

There is also a live question underneath all of it: **can the engine be
made to see keys at all?** `sdl-key-inject.ts` decides with a
*synchronous* probe — it pushes one event and immediately asks
`SDL_HasEvents` whether the queue is empty. But the engine drains its
queue on its next frame, not inside that call. **The probe is therefore
racy, and a build that drains correctly can still be declared broken.**
If the probe is fixed and the engine does drain, a lot of the list gets
much easier. If it does not, the in-game options UI has to be a DOM
overlay that never lets Escape reach the engine. Either way we need the
answer before designing the menus, so it is the first thing in Batch A.

---

## Batch A — the key map, and the engine's menus

Everything here lives in `webxash/src/services/keyboard-bridge.ts`, plus
one overlay component. One session, one file, one shared unknown.

### A0. The diagnostic: can the engine see keys?

- **Now:** the drain probe in `sdl-key-inject.ts` checks the queue
  synchronously after pushing, which cannot distinguish "the engine does
  not drain" from "the engine drains on the next frame".
- **Do:** fix the probe to wait a few frames (say 100ms) before asking,
  and log the result. Then press Escape in a real browser and see
  whether the engine's menu opens.
- **Accept:** a recorded answer — "the engine drains, with a 100ms
  probe" or "it does not". Either way the rest of Batch A is designed
  against a known fact.
- **Why first:** it decides whether the options UI is built on the
  engine's own menu system or as a DOM overlay, and whether chat can be
  fixed in the engine or must be replaced.

### A1. Stop the buy menu trapping the player

- **Now:** `KeyB: 'buy'` is our binding. It opens the **engine's** TS
  buy menu — a VGUI the engine owns. The engine's own key handling is
  dead, so the player cannot dismiss it. Pressing B is a one-way door.
- **Also now:** `webxash/src/components/TSHud.vue` has a *DOM* buy menu
  that says "Press ESC to close" — but the Vue HUD is hidden by default
  (`?hud=vue` only), so in production that modal does not exist, and the
  ESC hint would not work anyway.
- **Do:** remove `KeyB: 'buy'` from `KEY_INSTANT_CMD`, and remove the
  `{ keys: ['B'], action: 'Buy menu — while dead or observing' }` row
  from `TSHowToPlay.vue` — that overlay **is** mounted in the production
  landing page, so the key is currently advertised to every player. If a
  buy menu is wanted, it is a DOM overlay (Batch D).
- **Accept:** pressing B does nothing. No key opens a menu the player
  cannot leave.
- **Effort:** minutes. **Risk:** none.

### A2. Remove console access

- **Now:** `Backquote: 'toggleconsole'` is our binding. The console is
  the user's escape hatch out of the game and out of the server, and it
  is also the only route to the engine's main menu. It cannot be typed
  into (the engine's input is dead), so today it mostly covers the
  screen — which is its own bug.
- **Do:** remove the `Backquote` binding, and remove the
  `{ keys: ['`'], action: 'Developer console' }` row from
  `TSHowToPlay.vue` — same overlay, same reason. (The `Console`
  checkbox in `XashLaunchOptions.vue` and the `enableConsole` options
  in `XashLoadDirectory.vue` / `XashLoadZip.vue` are **dev-only
  components that are not mounted in production**, so they are not what
  the player sees — but they should go too, so the console cannot be
  re-enabled by a path nobody remembers.)
- **Accept:** Backquote does nothing; no UI text advertises a console.
- **Effort:** minutes. **Risk:** none.

### A3. Stop the user reaching the game menu / leaving the server

- **Now:** unverified. Escape is *not* in our key map, so it falls
  through to `injectKey`, which refuses. On the published build that
  means Escape does nothing — which contradicts "users can dump out to
  the game menu". So either the SDL path works sometimes, or the menu is
  reached another way (a mouse-driven VGUI, or an engine command).
- **Do:** depends on A0.
  - If the engine drains: intercept Escape in the DOM **before** the
    engine sees it (`keydown` with `capture: true`, `stopPropagation`),
    and use it to open our own overlay.
  - If it does not: Escape already cannot reach the engine, and the
    remaining work is to find and remove whatever route does open the
    menu.
- **Accept:** there is no reachable path from gameplay to the GoldSrc
  or TS game menu, and no path to `disconnect`.
- **Note:** the player must still be able to **leave** — so the options
  overlay (A4) is the sanctioned exit, and it must not be a trap either.

### A4. The in-game options UI (Escape → settings / quit to web UI)

- **Now:** nothing. There is no in-game overlay at all.
- **Do:** a DOM overlay above the canvas, opened by Escape:
  - **Settings** — the client-side knobs that are safe to expose
    (sensitivity, FOV, crosshair, name, and whatever else the engine
    exposes as a cvar). `live-state.ts` already reads cvars by
    executing their bare name and parsing the reply — that is the read
    path. Writing is `exec('cvar value')`.
  - **Quit to web UI** — a deliberate, confirmed exit back to the
    landing page. It has to release pointer lock, and it has to tell the
    player it is leaving.
- **Constraint:** the engine's mouse path works, the keyboard path does
  not. So the overlay's *own* keyboard handling has to be DOM-native
  (a real `<input>` for the name field, buttons for everything else) and
  must not depend on the engine.
- **Accept:** Escape opens the overlay; it is fully usable; leaving
  returns to the landing page.
- **Effort:** the largest item in the list, and it is the one that most
  needs the answer from A0.

### A5. The chat / typing bug

- **Now:** `KeyY: 'messagemode'` and `KeyM: 'messagemode2'` open the
  engine's chat and mic. The engine's own key handling is dead, so the
  player cannot type into them. The reported symptom — "triggers hot
  keys AND types at the same time" — means *something* is receiving the
  characters, which means the engine's chat input is a DOM element whose
  keystrokes also reach our `window` handler. Our handler only steps
  aside for `INPUT`, `TEXTAREA` and `contentEditable`
  (`keyboard-bridge.ts`), so a chat field that is none of those gets
  both the character and the hotkey.
- **Do:**
  - widen the guard in `onKeyDown` — step aside for **any** element that
    is not the canvas when a text-entry surface is open, and track an
    explicit "chat is open" flag rather than sniffing the target;
  - decide whether chat is worth having at all: the engine's chat is
    broken, so either the chat is replaced by a DOM overlay (and sent to
    the server as a command) or `messagemode` is removed like the buy
    menu.
- **Accept:** typing never fires a hotkey. If chat is kept, messages
  reach the server; if it is not, the key does nothing.

### A6. Third person

- **Now:** `KeyX: 'thirdperson'` is mapped. In GoldSrc the command is
  `thirdperson`; Xash3D-FWGS exposes it as the cvar `cam_thirdperson`
  in some configurations. If the command does not exist the engine
  prints "Unknown command" and nothing happens — which matches "can't
  go third person anymore".
- **Do:** one diagnostic — execute `thirdperson` and `cam_thirdperson 1`
  and read the engine's reply (`live-state.ts` can read cvars). Then
  bind whichever one the engine actually has.
- **Accept:** X switches to third person, and back.
- **Effort:** minutes once the diagnostic runs.

---

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
| **A** | the key map is one file, and every other item's design depends on the A0 answer | needs A0 before A3/A4/A5 |
| **B** | independent of the engine, small, and B1 is a visible product change | B1 first — it is a policy flip and a unit test |
| **C** | isolated perf work, but it touches the boot path, so do it when nothing else is in flight | measure before/after |
| **D** | the largest build, and it reuses A4's overlay infrastructure | after A4 |

Batch B has no dependencies at all and can go first if you want
something on screen quickly. A1 and A2 are both inside Batch A and are
one-liners — they are worth doing on their own even before the A0
diagnostic, because **the buy menu trap and the console are real today**
regardless of what the diagnostic says.

## What is deliberately not in this list

- **Matchmaking by skill.** Explicitly out of scope — Kyle said not ELO
  based.
- **Removing game content.** Deferred at Kyle's request until the maps
  and gameplay are decided.
- **Native SDL input.** If A0 shows the engine cannot drain its queue,
  the whole design routes around it (DOM overlays and engine commands
  only). That is a bigger constraint than it looks and it shapes A3, A4
  and A5 — but it does not block B, C or D.
