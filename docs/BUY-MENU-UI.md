# The modern buy menu — design spec

**Status:** approved 2026-10-28 (Kyle: "Spec out and plan whatever you need and begin
implementation"). Supersedes the placeholder buy menu in `webxash/src/components/TSHud.vue`.

## Goal

A DOM buy menu in the browser that is a faithful view of the game's real buy menu, with
the classic canvas menu still available behind a toggle in the ESC options overlay.

## The one architectural decision

**The Rust port stays authoritative for every rule. The DOM is a view and an input device.**

The DOM never forms a loadout and never talks to the server about one. It asks the port
what the current page looks like and sends the port key presses. The port does the
arithmetic, the server applies the result.

This is not a style preference. Three facts force it:

1. **The prices are runtime data.** `crates/server/src/weapons/custom.rs` lets a ruleset
   override a weapon's cost at runtime (Sparta), and the client's tables come from the
   *server's* ruleset plugin (`crates/client/src/gameplay/mod.rs:67`). A price table baked
   into the frontend is wrong on any server with custom weapon params.
2. **The rules are more than a price list.** The 30,000 budget, the 81-slot limit, the
   weapon restrictions, the akimbo/full-load/attachment multipliers, the ammo fill
   (`recompute_ammo` — buy ammo cheapest-first with the leftover budget until nothing more
   fits), the sort order and the nine saved slots all live in the port.
3. **The server applies whatever it is sent.** Nothing server-side enforces the budget or
   the slots today (see "Server-side validation" below). If the DOM computed a loadout
   itself, the rules would be advisory in two places at once.

## What the DOM replaces

`webxash/src/components/TSHud.vue`'s current buy menu is a **placeholder armory**: the
prices are hardcoded placeholders, the cash is tracked in JavaScript, and a purchase is
`set sv_cheats 1` + `give weapon_…`. It ignores the budget, the slots, the restrictions,
the attachments, akimbo, the saved slots and the ruleset. Its price list is also wrong
across the board and contains two weapons TS 3.0 does not have (SG 552, Jackhammer).

The replacement keeps the mock's **layout** (the category list, the item list, the price,
the budget bar, the keys) and replaces its **data and actions** with the port's.

## The port-side interface (new)

Three console commands, registered with the engine the way `ts_menu_open` and friends are
(`crates/client/src/menus/mod.rs:119-123`). The frontend reaches them with
`XashLoader.exec(...)` → `Cmd_ExecuteString`.

### `ts_buy_hide <0|1>`

Sets the buy menu's hidden flag. When hidden:

- the canvas menu is **not drawn** (`draw_buy_menu`),
- the engine's key path is inert (`buy_key`) — the digit keys `slot1`…`slot10` must not
  drive the hidden menu,
- the engine's mouse path is inert (it routes through `buy_key`),
- `menus::wants_cursor()` must not count the buy menu, so the DOM owns the mouse and the
  view holds still.

The menu's **state machine keeps running** when hidden. It still opens on the observer
effect and still tracks the config; the DOM needs that state to render. Only the drawing
and the engine's input are suppressed.

### `ts_buy_key <n> [<page>]`

Runs key `n` (1…11) on the current page, or on the given page, through the same
`BuyMenu::handle_key` the canvas menu uses. This is the DOM's only write path. It works
whether or not the menu is hidden.

`BuyMenu::handle_key` is already the whole action surface — every action in the game
(buy, remove, reset, save, load, random, the attachment toggles, akimbo, full load, the
category and weapon picks, the submit) is a key on some page — so one command is a
complete interface.

**The page.** The menu draws the columns of the page it is on, and a row of a parent
column's key acts on **that column's own page**: the canvas's mouse picks the column the
click was in, and the column's keys answer on its page. So the row record carries the
page its key acts on, and the DOM sends it with the key.

Without it a click on a parent column's row runs the key on the current page instead: on
the weapons page, the category column's "1 Handguns" row would have picked weapon 1
rather than the handguns.

The page is optional. Without one the key runs on the port's current page, which is what
the digit keys do. With one, the port checks that the page is one the canvas is drawing
(`columns(page)`) and refuses it otherwise, so a stale DOM cannot drive a page that is
not on screen.

### `ts_buy_state`

Prints the menu's state to the engine's stdout, which the frontend already receives: the
engine's stdout is bridged to an `xash:stdout` window event (`webxash/src/services/live-state.ts`
documents the pattern, and `engine-cvars.ts` matches a reply line out of it).

**Line protocol.** One record per line, each prefixed `TSBUY `, terminated by `TSBUY end`.
Line-per-record rather than one JSON blob, so no line-length handling in the engine's
print path can truncate the payload.

```
TSBUY state open=1 hidden=0 page=1 budget=30000 total=850 slots=10 ammo_spend=0 new=1 cat=0 pending=-1 att=0
TSBUY page 1 #Buy_CATEGORY
TSBUY row 1 0 0 1 1 #Buy_Handguns
TSBUY row 2 0 0 1 2 #Buy_SMGs
TSBUY entry 0 850 10 Glock-18
TSBUY end
```

- `state` — key=value pairs, no spaces in the values.
- `page` — the page id and its title (the `#Buy_…` key, which the frontend resolves through
  the engine's titles; the port draws the same keys).
- `row` — the key, the price, the flags, the page the key acts on, the number the canvas
  draws before the label, and the label. The flags are a `+`-joined set:
  `on` (selected), `dim` (not actionable), `x` (unaffordable), `sep` (a separator row).
  A price of `0` means "no price" (a category row). The page is the row's column's page
  (see `ts_buy_key` above): the DOM sends the key there, so a parent column's row cannot
  act on the current page. The number is the key's own prefix (`1`…`9`, `0` for key 10,
  `A` for key 11), the entry's number in the remove column (`10`…`16`, which is not a key
  at all), or `-` when the number is part of the title (the saved slots carry their slot
  number in the title).
- `entry` — one of the sixteen config entries: the index, the cost, the slots, the name.

**When the port prints it.** After every state change: on open, on close, after every key
that was handled (from either the engine or the DOM), and when the hidden flag changes.
Plus on demand (`ts_buy_state`), for the frontend's initial sync. The frontend never
polls.

## The row extraction (the known gotcha)

The page rows are currently built **inside the canvas draw function**
(`crates/client/src/menus/mod.rs`, `draw_buy_menu`). The state dump needs the same rows, so
they have to be built once and consumed twice.

**Extract a `rows(page) -> Vec<Row>` function** that returns, for a page, the rows with
their key, label, price and flags; then:

- the canvas draw consumes those rows (it must keep drawing exactly what it draws today),
- the state dump consumes the same rows.

One source of truth, no second implementation of the rules. `Row` carries the display
attributes the draw code needs (the colour kind: normal / selected / unaffordable /
disabled) so the canvas rendering is unchanged.

**The acceptance test for this refactor is a pixel diff**: the canvas buy menu before and
after must render identically (same pages, same rows, same colours, same positions). The
port's existing ~40 tests in `buy.rs` cover the behaviour; the pixel diff covers the
rendering.

It is `crates/client/src/menus/buy_pixels.rs`. The "before" is
`buy_pixels_before.rs` — the drawing code exactly as it was at `e91ec43`, with the two
drawing calls turned into the same `RowOp`s the new code produces — and the "after" is
`row_ops`, the new code's own row model. The two are compared over a matrix of menu
states: every page, every category, weapons bought and not, attachments on and off, saved
slots, restricted weapons, TS 2.1's fixed text, and a config long enough for the remove
column to number its entries past nine.

## Server-side validation

Today the server trusts the client: `buy_weapon` enforces the weapon restrictions and
the grenade limit, but **nothing checks the 30,000 budget or the 81 slots**. The only
enforcement is the client's own menu. Once a DOM UI can submit a loadout, the rules are
advisory — so the server checks them too.

The loadout arrives as four separate commands (`rst_cfg`, `tkw`, `tki`, `tka`), so the
server accumulates a per-player pending config:

- `rst_cfg` starts a fresh pending config (total 0, slots 0).
- `tkw` / `tki` add entries: each entry's cost is added to the running total, its slots
  to the running slot count. If the total would exceed the budget, or the slots would
  exceed the limit, the entry is rejected and the server says so.
- `tka` sets the ammo counts, bounded.

The budget: the client's is `CASH = 30000` (`crates/client/src/menus/buy.rs:12`) and the
slot total is in the tables (`combat.toml`: `slots = { total = 81, kevlar = 10 }`). The
server needs the budget too, so **add `budget = 30000` to `combat.toml`** and have the
server read it from the same table. A test asserts the client's `CASH` and the table's
budget agree, so they cannot drift.

The client is not changed to read the table (its `CASH` is used in several places); the
test is the coupling.

## The toggle

The ESC options overlay (`webxash/src/components/XashOptionsOverlay.vue`) gets a
**"Buy menu: Classic / Modern"** switch, in the same shape as the existing `hudOverlay`
switch.

- It lives in the `tsConfig` store (`webxash/src/stores/store.ts:98`), which is already
  persisted, so the choice survives a reload.
- It is **not** a cvar — it is a client-library switch, so it is a store-only field.
- The frontend sends `ts_buy_hide 1` (or `0`) once at session start, from the stored
  preference — **not** when the panel opens. The canvas menu opens by itself when the
  player becomes an observer, so the switch has to be in place before the player dies.
- The saved loadouts are shared between the two menus: `tsbuylist.tsa` is written by the
  port's menu, so flipping the toggle never forks the player's nine slots.

## The frontend

- `webxash/src/components/TSHud.vue`: the buy panel becomes a renderer over the port's
  state. The existing `PAGES` / `rowsFor()` structure in the mock already mirrors the
  port's pages, so it becomes: read `TSBUY` records → render; a click → map to a key →
  `ts_buy_key`.
- The click→key mapping is the classic menu's own: a category row is a key on the
  CATEGORY page, an item row is a key on the WEAPONS page (which moves to OPTIONS with the
  pending weapon set), the attachment toggles are keys 2–6 on OPTIONS, "Buy" is key 1 on
  OPTIONS, and the MAIN page's rows are their own keys.
- The pointer lock: the panel must release the pointer lock while it is open, or the
  buttons are unclickable (the browser delivers every mouse event to the lock target).
  `TSHud.vue` already has `syncPointerLock()` for this — it exits the lock when the panel
  opens and re-acquires it on close, off the B/ESC keypress, which is the user gesture the
  browser requires.
- **Key propagation must be stopped at the panel.** The engine's key listener is on
  `window` in the bubble phase, so a digit typed in the DOM still runs `slot1` in the
  game. Use `@keydown.stop` / `@keyup.stop` on the panel — `preventDefault` stops the
  character, which is the wrong tool. (This is the documented trap in
  `projects/specialists-browser`; `XashOptionsOverlay.vue` already does it.)
- The HUD's cash and killfeed are **simulated JavaScript** today. The buy panel's numbers
  must come from the port's state (the total, the slots, the prices) — not from a JS
  counter. A buy panel that shows a plausible animated budget is exactly the trap the
  project skill warns about.

## Verification

**Port (Rust)**
- The existing `buy.rs` suite still passes, unchanged.
- New tests: the hidden flag suppresses the draw and the engine's key path but not the
  DOM's; the state dump's shape for each page; the rows the dump reports match the rows
  the canvas draws; `ts_buy_key` produces the same actions as the engine's key path.
- The pixel diff of the canvas menu, before and after the row extraction.

**Server (Rust)**
- A loadout over the budget is rejected; one over the slots is rejected; a legal one is
  applied; the client's `CASH` and the table's budget agree.

**Frontend**
- `bunx vue-tsc --noEmit` and `bun run build` pass.
- The parent's CI-equivalent unit suite passes.

**Browser (against production or a dev server)**
- The Modern menu opens with `B` while dead, shows the port's real prices, and a purchase
  lands in the loadout the server applies.
- The Classic menu still works when the toggle is off.
- The pointer lock is released with the panel open, and re-acquired on close.
- No key leaks into the game while the panel is open.

## Ship order

1. **Parent PR A** — the port's command surface, the row extraction, the state dump, the
   server-side validation, the Rust tests. (The client WASM is built from this, but the
   WASM artifact lives in the submodule, so the port's source change can land first.)
2. **Submodule PR B** — the rebuilt client WASM + the frontend's buy panel + the ESC
   toggle.
3. **Parent PR C** — the submodule pointer.

The server change additionally needs the `ts-server` image rebuilt **by hand on the host**
(the pipeline does not build it) and rolled — `ts-server:0.28` as an overlay on `0.27`,
the same pattern as the 0.26→0.27 console-FIFO fix. Check the registry's human count
before rolling.

## Out of scope

- Changing the rules themselves (the budget, the slots, the prices).
- The TEAM page (page 8) — unreachable in the port, and it stays unreachable.
- The client's own menu rendering (the team menu, the scoreboard).
