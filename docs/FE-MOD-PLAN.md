# Front end / mod — the work list, specced and grouped

Written 2026-10-23. Every "now" below was read out of the code in this
repo, not assumed. Where something is unverified it says so, because the
difference decides how the work is sequenced.

## The thing that shapes everything else

**The TS client is explicitly built to be driven by a browser.** That is
not an inference — it is stated in the Rust port's own source, in
`tools/port/tsp-rs/crates/client/src/`:

> `ts_key <key> <1|0>`: `Key_Event` as a key press or release would,
> reaching `HUD_Key_Event`. Unlike the dev-only `ts_dev_key` this needs
> only `ts_dev_scriptinput 1`, **because a browser client has no other
> way to press a key at all**.

That is the whole input story, and it is better than the frontend
currently realises:

| what | how it works | status |
|---|---|---|
| movement, fire, weapons | `Cmd_ExecuteString` with `+cmd` / `-cmd` | works today |
| the anti-script gate | `ts_gate 200` before a gated `+cmd` | works today |
| **any key, to the client** | **`ts_key <keynum> <1|0>`** | **exists, unused** |
| open/close the TS menus | `ts_menu_open`, `ts_menu_close`, `ts_menu_slot` | exists, unused |
| third person | `thirdperson` / `firstperson` | exists, works |
| the buy menu's digits | the weapon-slot commands (`slot1`..`slot10`) | **already works** |

The client's key number is ASCII for printable keys, so `ts_key 49 1`
is the digit `1`, and `ts_key 27 1` is Escape.

### Two corrections to an earlier reading of this

Both were mine, and both were wrong:

**The buy menu is not a trap.** The buy menu is navigated by the
**weapon-slot buttons** — keys `1..11`, which is `slot1`..`slot10` plus
`a`. The frontend already maps `Digit1 → slot1` … `Digit0 → slot10`, so
pressing B opens the menu and 0-9 drives it. Kyle plays it; it works.

Two details from the client source worth knowing:

- **Escape does not close the buy menu.** The client's own comment says
  so: *"The buy menu takes no keys here (Escape doesn't close it)."* You
  leave it by choosing something, by pressing 0 (back), or with the
  mouse.
- **The mouse drives it too.** *"CTSBuyMenu::MouseEvent runs the row
  under the cursor on a left release … and key 10 (back) on a right
  release."* The mouse path works, so the buy menu is fully navigable
  by mouse — which matters for A3, because it means a VGUI menu is
  always a way out.

**The SDL injection has never worked, and the probe cannot ever pass.**
`sdl-key-inject.ts` pushes one event and then asks `SDL_HasEvents`
whether the queue is empty. `SDL_PushEvent` puts the event *in* the
queue, so the answer is necessarily "yes, there is an event" — the
probe returns false, and the service disables itself forever. That is
why the engine has never received a key event, which is why every
client-side menu has been unreachable.

**Which does not matter, because `ts_key` does the same job without the
race, without SDL, and by design.** Fixing the SDL probe is no longer
interesting; `ts_key` is the supported path and it is already in the
client we ship.

### The hazard, and how the design dodges it

`HUD_Key_Event` returns 1 for Escape when the client's own menu did not
take it, and the source says what the engine then does:

> 1 hands it to the engine, which for Escape opens the main menu
> (newer FWGS) or runs its `cancelselect` binding (Steam GoldSrc, FWGS
> 0.21), which sends `escape`.

**So the moment we start sending Escape to the client, the engine's
main menu — the thing Kyle wants players walled off from — becomes
reachable.** The browser's engine is the `xash3d-fwgs` **1.2.2** npm
build and which of the two behaviours it has was never established.

The design in A3 **dodges this entirely**: Escape is intercepted in the
DOM and never becomes an engine key, so neither behaviour can happen.
That is why the plan does not need the question answered first.

## Batch A — the key map, and the engine's menus

Everything here lives in `webxash/src/services/keyboard-bridge.ts` plus
one overlay component. One session, one file, one shared unknown.

### A0. One measurement: is every key being delivered twice?

- **Now:** the frontend translates keys into engine commands **and** the
  engine may also be receiving the real key event. Kyle's report —
  "in game typing triggers hot keys AND types at the same time" — is
  the signature of **both** paths running at once. And Escape, which
  is *not* in our command map, still reaches the engine: Kyle hits
  Escape and the HL menu opens.
- **Do:** one keypress, one log line. Load the game with `?debug=1`,
  open devtools, and press a key that is **not** in our command map —
  Escape is ideal. `keyboard-bridge.ts` logs the outcome:
  ```
  [key] DOWN code=Escape scancode=41 -> pushed to SDL queue
  [key] DOWN code=Escape scancode=41 -> REFUSED by SDL
  ```
  - **"pushed to SDL queue"** — our injection works, and the engine
    receives the key twice for every *mapped* key (its own event plus
    our command).
  - **"REFUSED by SDL"** — our injection is dead, so Escape reached
    the engine **natively**. The engine's own DOM key handler is
    alive, and every key is delivered twice: once by the engine, once
    by our command bridge.
- **Why it matters:** if the native path is alive, the fix for half of
  this list gets much simpler. **Delete the command map and let the
  engine's own binds do the work**, keeping only the keys we want to
  own. The TS anti-script gate opens by itself when a real key
  arrives — that is exactly what `HUD_Key_Event` is for — so `ts_gate`
  can go too. The typing bug goes with it, because nothing is
  delivered twice any more.
- **Accept:** a recorded answer, and the key map reduced to whatever
  the engine does not already do.

### A1. Hide the buy menu

- **Now:** `KeyB: 'buy'` opens the **engine's** TS buy menu. It is
  navigable (the slot commands drive it) and it is **advertised to
  every player** — `TSHowToPlay.vue` is mounted in the production
  landing page and lists `{ keys: ['B'], action: 'Buy menu — while dead
  or observing' }`.
- **Do:** remove the `KeyB` binding and that row. If a buy menu is
  wanted, it is the DOM overlay in Batch D.
- **Accept:** B does nothing, and the UI no longer advertises it.

### A2. Remove console access — and the trap it is

- **Now:** `Backquote: 'toggleconsole'` is our binding, and Kyle tested
  it: **pressing ` brings up "Press ESC to release pointer"**, and the
  console is not usable. The sequence is:

  1. `toggleconsole` opens the engine's console.
  2. The mouse is still grabbed (pointer lock), so the engine cannot
     hand the mouse to the console and prints **"Press ESC to release
     mouse"**.
  3. Escape **cannot be delivered** — it is not in our key map, and the
     SDL path is dead.

  So the player is left with a grabbed mouse, an open console, and a
  prompt asking for a key they cannot press. **That is a trap**, and it
  is the one trap on this list that is real today.

  It is also advertised to every player: the `` { keys: ['`'], action:
  'Developer console' } `` row in `TSHowToPlay.vue`, which **is**
  mounted in the production landing page.
- **Do:** remove the `Backquote` binding and that row. The `Console`
  checkbox in `XashLaunchOptions.vue` and the `enableConsole` options
  in `XashLoadDirectory.vue` / `XashLoadZip.vue` are **dev-only
  components that are not mounted in production**, so they are not what
  the player sees — but they should go too, so the console cannot be
  re-enabled by a path nobody remembers.
- **Accept:** Backquote does nothing; no production UI advertises a
  console; no state can leave the player with a grabbed mouse and no
  way out.

### A3. The two-Escape design

Kyle's target, and the shape of the fix:

> hit Esc once to release the mouse, then hit Esc again to show a CSS
> style menu that lets the user change settings (character model, name,
> other HL / TS client settings) and quit back to the Web UI

**Both Escapes can be pure DOM. The engine never needs to see Escape.**

- **Escape #1 — release the mouse.** `document.exitPointerLock()`. That
  is a DOM operation; the engine does not have to know about it. The
  game keeps running behind the overlay, which is what a player
  expects.
- **Escape #2 — open the menu.** A Vue overlay above the canvas. Also
  pure DOM.
- **The engine never sees Escape.** This is the part that stops the HL
  menu from opening, and it is a DOM-level interception:
  ```ts
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.code !== 'Escape') return;
      e.stopImmediatePropagation();   // the engine never gets this key
      // …release the pointer, or open/close the overlay
    },
    { capture: true },
  );
  ```
  **Two details make this reliable:**
  1. **Register it before the engine boots.** The engine's Emscripten
     build registers its keydown callback on `window`
     (`specialHTMLTargets = [0, document, window]`, target index 2).
     Listeners on the same node fire in registration order, so ours has
     to be first — install it at app start, not when the canvas mounts.
  2. **Use `stopImmediatePropagation()`, not `stopPropagation()`.** In
     the capture phase at `window`, `stopImmediatePropagation()` stops
     the remaining listeners on that node *and* the rest of the
     propagation, so it does not matter whether the engine registered
     its listener with `useCapture` true or false. `stopPropagation()`
     alone would still let a capture-phase engine listener run.
- **What this also removes:** the need to care which FWGS behaviour
  Escape has. The ambiguity in the previous revision — "opens the main
  menu (newer FWGS) or runs `cancelselect` (FWGS 0.21)" — becomes
  irrelevant, because Escape is never sent to the engine at all.
- **Accept:** Escape never opens the HL menu, the TS menu, or the
  console. Escape #1 releases the mouse, Escape #2 toggles the
  overlay, and the player is never left with a grabbed mouse and no
  way out.

### A4. The options overlay — what goes in it

- **Now:** nothing. There is no in-game overlay.
- **Do:** a DOM overlay above the canvas, opened by Escape #2:
  - **Settings** — the client-side knobs that are safe to expose
    (sensitivity, FOV, crosshair). `live-state.ts` already reads cvars
    by executing their bare name and parsing the reply — that is the
    read path; writing is `exec('<cvar> <value>')`.
  - **Name and character** — the client registers `name`, `model` and
    `skin` (confirmed in the client command table), so these are
    reachable as engine commands. The exact argument syntax is worth
    confirming before relying on it; `config` is the client's own
    loadout menu and may be the better route.
  - **Quit to web UI** — a deliberate, confirmed exit. It has to
    release the pointer lock *and* navigate back to the landing page.
    **Not a black screen** — that is today's behaviour and it is the
    thing Kyle is complaining about.
- **Constraint:** the overlay's own keyboard handling must be
  DOM-native (a real `<input>` for the name field, buttons for
  everything else) and must not depend on the engine.
- **Pointer lock:** the overlay must take the mouse, and Escape #1
  must give it back. The engine's own mouse handling is separate — the
  game's look-aim needs the pointer locked, so re-locking on close has
  to be a user gesture (a click) to satisfy the browser.
- **Accept:** Escape opens the overlay; it is fully usable; leaving
  returns to the landing page; the game menu is never reachable.

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
