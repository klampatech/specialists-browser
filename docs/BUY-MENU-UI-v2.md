# The buy menu redesign — spec (v2)

**Status:** draft for Kyle's review. Supersedes `docs/BUY-MENU-UI.md` **only where it
conflicts**; the v1 spec's architecture (the port is authoritative, the DOM is a view and an
input device) stands, and this document extends it.

**Source:** `buy-menu-redesign.html` — the design handoff, 4 mockups + a state guide + the
behavior rules. The mockups are static; the command mapping they assume is this document.

**One architectural decision, unchanged from v1:** **the Rust port stays authoritative for every
rule.** The DOM asks the port what the screen looks like and sends the port key presses. The
browser never forms a loadout and never sends `tkw`/`tki`/`tka` itself.

---

## 1. What is already shipped (measured, not read)

| Fact | Where | How it was measured |
| --- | --- | --- |
| The modern buy menu is **live in production** as of 2026-10-29 | `HANDOFF.md:1467-1497` | the served bundle carries `TSBUY`/`ts_buy_key`/`ts_buy_hide`/`ts_buy_state` |
| It is a **DOM view over the port's own buy menu**, not a second menu | `HANDOFF.md:1475-1484` | the browser computes nothing; the port prints `TSBUY …` records and the DOM sends keys back |
| The **server validates the loadout** now (budget + slot limit), so the rules are not advisory | `crates/server/src/weapons/commands.rs` (PR #88) | a pending per-player config accumulates from `rst_cfg`/`tkw`/`tki`/`tka` |
| The **prices are runtime data**, from the ruleset | `crates/server/src/weapons/custom.rs`, `crates/client/src/gameplay/mod.rs:67` | a ruleset can override a weapon's cost (Sparta) |
| The **port's menu state machine** is 9 pages | `crates/client/src/menus/buy.rs:356-366` | `MAIN, CATEGORY, WEAPONS, OPTIONS, ITEMS, REMOVE, SAVE, LOAD, TEAM` |
| The **category columns** are 5 | `crates/client/src/menus/buy.rs:382` | `Handguns, SMGs, Rifles, Shotguns, Special Purpose` (+ `Player Accessory` as key 6) |
| The **budget is $30,000** | `crates/client/src/menus/buy.rs:12` (`CASH`), `crates/ts30/data/combat.toml:3` | a test asserts the two agree |
| The **slot pool is 81** | `crates/ts30/data/combat.toml:15` | `slots = { total = 81, kevlar = 10, … }` |
| The **attachment prices** are silencer 900 / laser 800 / flashlight 500 / scope 1800 | `crates/ts30/data/combat.toml:16` | — |
| The **Classic / Modern toggle** is in the ESC options overlay, default `classic` | `webxash/src/components/XashOptionsOverlay.vue`, `webxash/src/stores/store.ts:98` | — |
| The **saved loadouts are shared** between the two menus | `tsbuylist.tsa`, written by the port's menu | — |

**The mockup's prices are the real ones.** All 14 prices in the mockup match
`crates/ts30/data/weapons.toml` exactly (Glock-18 $850, Desert Eagle $1,050, Katana $2,900,
M60E3 $8,000, …). The mockup's budget ($30,000) and attachment prices match too. **The mockup's
data section is trustworthy** — it is a transcription of the game's own tables, not invented.

---

## 2. The mockup's screens → the port's pages

This is the mapping Kyle asked for ("whatever commands drive the actual buying"). It is better
than expected: **three of the four screens already exist in the port.**

| Mockup screen | Port page | Keys | Verdict |
| --- | --- | --- | --- |
| **1. Loadout** — five slot cards, budget header, A/B/C tabs, R/X | `MAIN` | 2 → categories, 3 → remove, 5 → save, 6 → load, 7 → random, 4 → reset/clear | **partial.** The port's MAIN is a list of *actions*, not *slot cards*. The slot cards are new; the actions behind them exist. |
| **2. Browse a slot** — a slot rail + a two-column weapon list + the live loadout on the right | `CATEGORY` (the rail) + `WEAPONS` (the list) | `CATEGORY`: 1–5 pick a category, 6 → accessories, 10 → back. `WEAPONS`: 1–9/A pick a weapon, 10 → back | **exists, but organised by category, not by slot.** The mockup merges the two pages into one screen with a rail — that is the port's own CATEGORY column promoted to a rail. |
| **3. Attachments** — toggle attachments, then one "Add to loadout" | `OPTIONS` | 2–5 toggle the attachments, 1 or 6 = buy | **exists, almost exactly.** The mockup's "the game buys attachments first and the gun second, the menu hides that order" *is* the port's behaviour. |
| **4. Row states** — focused / owned / can't afford / low budget / toast | — | the port's row flags: `on` (selected), `dim` (not actionable), `x` (unaffordable), `sep` | **the flags exist.** The *reason* ("Need $950 more") does not. |

**The commands are already in place** and do not change:

- `ts_buy_hide <0|1>` — hide the canvas menu, keep the state machine running.
- `ts_buy_key <n> [<page>]` — the DOM's only write path. Runs key `n` through the same
  `BuyMenu::handle_key` the canvas menu uses, optionally on a given page (so a parent column's
  row acts on its own page — this is what makes the mockup's "rail" work).
- `ts_buy_state` — prints the menu's state as `TSBUY …` lines.

**So the "magic" is not in the command layer. It is in three places:** a slot-based
organisation, an apply-on-purchase rule, and slot cards instead of action rows.

---

## 3. What the mockup needs that does not exist yet

| # | Gap | Cost | Where it lands |
| --- | --- | --- | --- |
| **D1** | **A slot dimension.** The port's pages are per *category*; the mockup is per *slot*. The mockup's complaint is exactly right: the port's "Special Purpose" page holds **M61 Grenade, Combat Knife, M60E3, Katana, Seal Knife** — five things across two slots (1 = melee/grenades/swords, 5 = the M60). The mockup wants them split. | **port.** The weapon table has `kind` (`WeaponKind`: pistol/smg/rifle/shotgun/knife/katana/grenade/kungfu/akimbo/…) and `slots` (the 81-pool cost) but **no classic weapon-slot number**, and the menu's columns are decoded from the game's own table. A slot → weapons mapping has to be introduced on the port side, or the DOM hardcodes a mapping — which would fork the game's rules into the browser and break the moment a ruleset changes them. | port |
| **D2** | **"The current loadout is always live."** Today a purchase goes into a *pending* config and the player must pick "Use New Config". The mockup removes that step. | **port.** The DOM must not form the loadout (v1's rule, and the reason the server-side validation exists). The port has to apply the pending config itself. | port |
| **D3** | **Loadout tabs A/B/C with auto-save.** The port has **nine** saved slots (`tsbuylist.tsa`) with explicit save/load pages. | **none.** The DOM already drives the port's save key; "auto-save" is the DOM calling it after an edit. The mockup shows three tabs; the port has nine — see Q4. | frontend |
| **D4** | **The breadcrumb** ("Slot 2 · Buy › Pistols › Glock-18"). | **none.** The DOM drove the navigation, so it knows the path. | frontend |
| **D5** | **"Need $X more"** on an unaffordable row, and the toast. The port's row carries an `x` flag but not the shortfall. | **small port.** One field on the row record (the shortfall), so the browser does not do arithmetic it could get wrong. | port |
| **D6** | **A "not allowed" state**, distinct from "can't afford" — the mockup's own open question. The port has the `dim` flag (not actionable) but no reason. | **small port** (a reason string), or a generic DOM message. | port or frontend |
| **D7** | **"2 of 5 slots in use"** replaces the live HUD's "Slots: 61". | **see §4.** These are two different quantities and the mockup's version hides the real constraint. | design decision |
| **D8** | **Arrow-key navigation.** | **none.** The port is number-driven (keys 1–11); arrow keys are the DOM's own focus movement, with Enter sending the port key. | frontend |
| **D9** | **"Enter · Deploy with Loadout A"** on the Loadout screen. | **moot if D2 lands** — the loadout is already live, so "deploy" becomes a no-op. | — |

**Nothing in the mockup needs a new command.** `ts_buy_key` with a page argument is already
enough to drive a rail, and the existing `TSBUY` records are enough to render a screen.

---

## 4. The mockup's open questions, answered from the code

The mockup lists six open questions. Four have answers in the code today:

1. **"What does the header's 'Slots' number (61) actually count?"** → It is the **classic
   81-slot weapon pool** (`combat.toml:15`), not a category count. Every weapon consumes N
   slots (`WeaponInfo.slots`): a Glock 10, an AK47 40, the M60E3 **70**, a Combat Knife 1. The
   live HUD's "61" is how much of the pool your loadout uses. **The mockup's "2 of 5 slots in
   use" is a different quantity** — how many of the five weapon categories are occupied — and
   it hides the constraint that actually binds. *Recommendation: show both — "3 of 5 · 41/81
   slots".*
2. **"Is M60E3 definitely slot 5, and what else is in slot 5?"** → The port's "Special Purpose"
   page is **M61 Grenade ($1,000), Combat Knife ($100), M60E3 ($8,000), Katana ($2,900), Seal
   Knife ($100)**. So slot 5 is the M60 (+ the M61 grenade), and the knives/katana in that same
   page are the ones that belong in slot 1 — the mockup's complaint, confirmed.
3. **"Do any limits exist beyond money?"** → **Yes, three.** The 81-slot pool; the weapon
   restrictions and the grenade limit (`buy_weapon` enforces them, `add()` refuses a restricted
   weapon); and the akimbo / full-load / attachment multipliers. The port already refuses an
   over-budget or over-slot purchase at add time (`buy.rs:1197-1202`), so the mockup's
   "disable Add and show the missing amount" is the port's behaviour, mirrored.
4. **"Does removing a gun refund its attachments?"** → **Yes.** A config entry's cost is the
   gun *plus* its attachments (`cost(id, att, full, item)`), and `remove()` subtracts the entry's
   whole cost (`buy.rs:1150-1155`). Removing the gun refunds both together.

Still open (and Kyle's to answer): **Q5** — are there per-slot or per-weapon-count caps beyond
the 81-pool? **Q6** — does the game restrict weapons by map or mode?

---

## 5. The decisions (Kyle, 2026-11-01)

All six answered. They are decisions, not open questions now.

1. **The redesign replaces the MODERN buy menu, in place.** It is the DOM panel that already
   lives behind the Classic / Modern switch in the ESC options overlay — same place, same
   toggle, and the **classic canvas menu is untouched and still selectable**.
2. **Apply-on-purchase: approved.** The port applies a purchase itself; the pending-config
   step goes away in the modern flow.
3. **The slot counter shows both:** `3 of 5 · 41/81 slots` — the five weapon slots in use and
   the 81-slot pool they consume.
4. **The loadout tabs are the config save slots.** The port has nine; three are visible and
   the rest are one click away.
5. **After adding a gun, return to the same slot's weapon list** — so a second pistol is one
   click away.
6. **"Clear" asks for confirmation.** Random does not.

### A correction to the mockup, from the game's own data

**The M60E3 is in slot 4, not slot 5.** The weapon table's HUD grid column *is* the classic
weapon slot, and it puts the M60E3 in the same column as the rifles and shotguns. The
mockup's own question ("Is M60E3 definitely slot 5?") is answered by the data: **no** — it is
slot 4, with the Barrett and the M16. The game's slot 5 holds the akimbo weapons.

This is good news for the implementation: **the rail needs no new table.** The port already
has the slot number for every weapon (`WeaponInfo.hud[0]`), so the five-slot rail is a read,
not a data migration.

| Classic slot | The HUD column holds |
| --- | --- |
| 1 | Kung-fu, M61 Grenade, Combat Knife, Katana, Seal Knife |
| 2 | every pistol (Glock-18 … Contender G2) |
| 3 | every SMG (Mini-Uzi … UMP) |
| 4 | every rifle and shotgun, plus the Barrett M82A1 and the M60E3 |
| 5 | the akimbo weapons |

## 6. The decisions that were open, and are now made

The six decisions are in §5. What follows is the reasoning that led to them, kept so the next
reader does not re-derive it.

1. **Where does the redesign live?**
   - **(a) The port, replacing the classic menu's pages.** One menu, no fork: the classic
     canvas menu and the DOM both change. Cost: the canvas drawing is port pixel work, and the
     pixel-diff acceptance test (`menus/buy_pixels.rs`) has to be re-baselined.
   - **(b) The DOM only, over the existing pages.** The classic menu stays exactly as it is.
     Cost: **D1 and D2 cannot be done this way** — the DOM cannot split "Special Purpose" and
     cannot apply the config, because those are the port's rules. So (b) alone cannot deliver
     the mockup's principles.
   - **(c) The port gains a second flow** (the loadout flow), the classic keeps its pages, the
     DOM renders the new flow. Cost: two state machines in the port; the saved loadouts stay
     shared.
   - *Recommendation: (c).* It delivers the mockup, leaves the classic menu (the game's own, and
     the default) untouched, and keeps one source of truth for the rules.
2. **"The current loadout is always live" — approve the port change?** The mockup's first
   principle requires the port to apply a purchase itself (D2). *Recommendation: yes — it is
   the single change that removes the mockup's most-cited complaint, and the server-side
   validation already exists to keep it honest.*
3. **The slot display (D7).** Show "3 of 5 · 41/81 slots", or just "3 of 5"? *Recommendation:
   both — the 81 is the constraint that stops people buying an M60 with a rifle.*
4. **How many loadout tabs?** The mockup shows three (A/B/C); the port has **nine** saved
   slots. *Recommendation: three visible, with the rest one click away — or nine, matching the
   game. (The mockup's mock is illustrative.)*
5. **After adding a gun: back to the same slot's list, or to the Loadout screen?** *Recommendation:
   back to the same slot's list — it is one click from a second pistol, which the mockup
   explicitly wants to be easy.*
6. **Does "Clear" need a confirmation?** The mockup lists the Random and Clear confirmations as
   out of scope. *Recommendation: confirm on Clear only (it refunds everything, and a mis-click
   loses a loadout); Random does not need one.*

---

## 7. What can start before the answers come back

- **The frontend audit** is done (§1, §2). Nothing else about the frontend is blocked.
- **The mockup's data section is verified** (§1) — no data work is needed; the port's tables
  are the data.
- **D3, D4, D8 are frontend-only** and unblocked, but they are only worth building once the
  screen structure of §2 is settled by Q1.

## 8. Out of scope

- The rules themselves (the budget, the 81 slots, the prices).
- The TEAM page (page 8 — unreachable in the port, and it stays unreachable).
- The SMG/rifle/shotgun/accessory lists (the mockup does not draw them; they reuse the Browse
  layout).
- The classic canvas menu's drawing, unless Q1 lands on (a).

## 9. Verification

- **Port (Rust):** the existing `buy.rs` suite keeps passing unchanged; new tests for the slot
  mapping, the apply-on-purchase rule, and the row's shortfall.
- **Server (Rust):** a loadout over the budget is rejected; one over the slots is rejected; a
  legal one is applied.
- **Frontend:** `vue-tsc` and the build pass; the parent's unit suite passes.
- **Browser, against a disposable instance:** the Modern menu opens with B while dead, shows the
  port's real prices, a purchase lands in the loadout the server applies, and the classic menu
  still works with the toggle off. The pointer lock is released with the panel open. No key
  leaks into the game.
- **Visual:** the four mockup screens, captured and compared side by side with the mockup at the
  mockup's own 960×620 frame.
