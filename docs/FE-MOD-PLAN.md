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
The real items are that it cannot be closed with Escape, and that Kyle
wants it gone anyway.

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

### One hazard this exposes

`HUD_Key_Event` returns 1 for Escape when the client's own menu did not
take it, and the source says what the engine then does:

> 1 hands it to the engine, which for Escape opens the main menu
> (newer FWGS) or runs its `cancelselect` binding (Steam GoldSrc, FWGS
> 0.21), which sends `escape`.

**So the moment we start sending Escape to the client, the engine's
main menu — the thing Kyle wants players walled off from — becomes
reachable.** Any work that sends Escape has to make sure the client
consumes it, and that the engine's route is blocked.

## Batch A — the key map, and the engine's menus

Everything here lives in `webxash/src/services/keyboard-bridge.ts` plus
one overlay component. One session, one file, one shared unknown.

### A0. Adopt `ts_key` as the client's key channel

- **Now:** the frontend sends only `Cmd_ExecuteString` commands. It
  never sends a key to the client. The client's `ts_key` command exists
  and is unused.
- **Do:**
  - set `ts_dev_scriptinput 1` at boot (the client deliberately gates
    `ts_key` on that alone, *not* on `sv_cheats`, because
    "`sv_cheats` is server-controlled and read-only on the client" and
    gating on it would make the command unusable exactly where it is
    needed);
  - add a small helper that sends a key down/up pair, with the ASCII
    mapping and the `K_*` constants for the non-printable ones;
  - use it for the keys that need the **client** rather than the
    engine: the buy menu's navigation beyond the slots, the TS menus,
    and chat.
- **Accept:** `ts_key` reaches `HUD_Key_Event`. The proof is the
  client's own `ts_dev_keylog 1`, which prints a `[ts key]` line for
  Escape — so this is verifiable without a debugger.
- **Why first:** everything below depends on it.

### A1. Hide the buy menu

- **Now:** `KeyB: 'buy'` opens the **engine's** TS buy menu. It is
  navigable (the slot commands drive it) and it is **advertised to
  every player** — `TSHowToPlay.vue` is mounted in the production
  landing page and lists `{ keys: ['B'], action: 'Buy menu — while dead
  or observing' }`.
- **Do:** remove the `KeyB` binding and that row. If a buy menu is
  wanted, it is the DOM overlay in Batch D.
- **Accept:** B does nothing, and the UI no longer advertises it.

### A2. Remove console access

- **Now:** `Backquote: 'toggleconsole'` is our binding. The console is
  the user's escape hatch out of the game and out of the server, it is
  also advertised to every player (the `` { keys: ['`'], action:
  'Developer console' } `` row in `TSHowToPlay.vue`), and — per Kyle —
  it may not even be typable into, because the engine's own input is
  dead.
- **Do:** remove the `Backquote` binding and that row. The `Console`
  checkbox in `XashLaunchOptions.vue` and the `enableConsole` options
  in `XashLoadDirectory.vue` / `XashLoadZip.vue` are **dev-only
  components that are not mounted in production**, so they are not what
  the player sees — but they should go too, so the console cannot be
  re-enabled by a path nobody remembers.
- **Accept:** Backquote does nothing; no production UI advertises a
  console.

### A3. Wall off the game menu — and know how it is reached today

- **Now:** unverified, and this is the one thing left that needs a
  human at the keyboard. The candidate routes are the engine's main
  menu (Escape → `cancelselect`), the client's own VGUI menus
  (mouse-navigable, since the mouse path works), and the client's
  `disconnect` / `config` commands.
- **Do:** run the diagnostic below, then remove whichever route it is.
  Separately: `disconnect` and `config` are client commands, and
  `ts_key` gives the browser the ability to reach client commands the
  engine would otherwise run — so the fix has to cover **both** the
  keyboard route and the command route.
- **Accept:** there is no path from gameplay to the GoldSrc or TS game
  menu, and none to `disconnect`.
- **The hazard:** as noted above, sending Escape to the client is what
  makes the engine's main menu reachable. This item and A4 have to be
  designed together, not separately.

#### The diagnostic

Five minutes at the keyboard, in the browser, with `?debug=1`:

1. **Press Escape.** Does anything appear? (The engine's main menu, the
   TS menu, or nothing.)
2. **Press Backquote.** Does a console appear? Then **try typing** into
   it — Kyle has never confirmed he can. If you can type, try
   `disconnect` and `menu_main`. If you cannot, the console is a
   screen-covering dead end and removing the binding fixes it.
3. **Press B**, then **1..0**. Confirm the buy menu responds (Kyle says
   it does) and work out **how you leave it** — B again, Escape, or
   selecting something.
4. **Click around the TS menus with the mouse.** The mouse path works,
   so any VGUI menu is fully navigable by mouse — including a quit
   button. This is the most likely way out of the game.
5. **Press Y** and type. Watch for a character appearing *and* a hotkey
   firing at the same time — that is A5, and the log at `?debug=1`
   shows both paths.

Step 4 is the one to do first. A mouse-navigable VGUI menu with a
disconnect button explains "dumping out of the server" with no key
involved at all — and it would mean the fix is about **the menu's
contents**, not about the keyboard.

### A4. The in-game options UI (Escape → settings / quit to web UI)

- **Now:** nothing. There is no in-game overlay.
- **Do:** a DOM overlay above the canvas, opened by Escape:
  - **Settings** — the client-side knobs that are safe to expose
    (sensitivity, FOV, crosshair, name). `live-state.ts` already reads
    cvars by executing their bare name and parsing the reply — that is
    the read path; writing is `exec('<cvar> <value>')`.
  - **Quit to web UI** — a deliberate, confirmed exit back to the
    landing page. It has to release pointer lock, and it has to say
    that it is leaving.
- **Constraint:** the overlay's own keyboard handling must be
  DOM-native (a real `<input>` for the name field, buttons for
  everything else) and must not depend on the engine.
- **The Escape problem:** Escape has to be stopped before the engine
  sees it. Two options, and the answer comes from A3's diagnostic:
  - the client consumes Escape (its menu is open) — then `ts_key 27 1`
    is safe and the client's menu is the right place to put the
    settings;
  - the client does not consume it — then Escape must be intercepted
    in the DOM (`keydown` with `capture: true`, `stopPropagation`)
    **before** it is turned into a `ts_key`, and the engine's
    `cancelselect` route has to be blocked another way.
- **Accept:** Escape opens the overlay; it is fully usable; leaving
  returns to the landing page; the game menu is never reachable.

### A5. The chat / typing bug

- **Now:** `KeyY: 'messagemode'` and `KeyM: 'messagemode2'` open the
  engine's chat and mic. The engine's own key handling is dead, so the
  player cannot type into them. The reported symptom — "triggers hot
  keys AND types at the same time" — means something *is* receiving the
  characters while our `window` handler is also firing the hotkey. Our
  handler only steps aside for `INPUT`, `TEXTAREA` and `contentEditable`
  (`keyboard-bridge.ts`), so a chat field that is none of those gets
  both the character and the hotkey.
- **Do:**
  - widen the guard — track an explicit "a text field has focus" flag
    rather than sniffing the target, and step aside for **any**
    element that is not the canvas while it is set;
  - decide whether chat is worth having: with `ts_key` the browser can
    now send real characters to the client, so chat becomes possible
    rather than impossible. If it is wanted, the characters go through
    `ts_key`; if it is not, `messagemode` is removed like the buy menu.
- **Accept:** typing never fires a hotkey. If chat is kept, messages
  reach the server.

### A6. Third person — not a bug, a rule

- **Now:** `KeyX: 'thirdperson'` is mapped, and `thirdperson` /
  `firstperson` are both registered by the client (`camera.rs`). The
  command works. But the client's toggle has this guard:
  ```rust
  } else if crate::hud::observer() && !third {
      return;
  }
  ```
  > Otherwise an observer can leave third person but not enter it.
- **So:** while dead or spectating, X does nothing — by design, as in
  TS. To enter third person you have to be **alive**. In the browser
  you spawn with a left click (fire), so the answer is "spawn first".
- **Do:** no code change. Fix the **controls list** — it currently does
  not mention X at all, and it should say that third person needs you
  alive.
- **Accept:** X switches to third person while alive, and back.

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
| **A** | the key map is one file, and every other item's design depends on A0's answer | A0 first — it is the key channel everything else uses |
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
