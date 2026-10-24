# Rebrand plan — BulletBallet

Written 2026-10-24. This is the plan for turning the site from "The
Specialists, a fan page" into **BulletBallet**, with a design system
instead of a collection of one-off styles.

**Status: SHIPPED — all four phases, 2026-10-24.** Phase 0 (the
Half-Life lambda ghosting through the running game), Phase 1 (the green
shell, the head, the brand assets), Phase 2 (the landing page), Phase 3
(the boot screen, the connecting splash, the options overlay) and Phase 4
(the docs sweep) all landed. webXash #10, #13, #14, #15 and #16; the
parent repo took a pointer bump for each.

This document is kept as the **record of what was decided and why**, not
as a to-do. Where the plan and the shipped code disagree, the code is
right and this file is the thing that needs fixing.

What the plan got right: the token names were frozen and only the values
swapped, which meant the whole shell re-skinned through one file. What it
got wrong: it assumed the mock's code rain was animated, and it was not
— it was twelve columns of one identical string translating ±8% of a
120%-tall element, so the glyphs shimmered in place and never travelled.
The shipped rain is a repeating background, because a seamless loop needs
the pattern's period to equal the travel distance exactly.

**Where the code lives:** the frontend is the **`webxash` submodule**
(`github.com/klampatech/webXash`). Every line of UI work happens there,
then the parent repo takes a **pointer bump**. The game server image is
NOT touched by any of this.

**The design reference:** the single-file HTML mock Kyle supplied on
2026-10-24 (saved at
`~/.hermes/cache/documents/doc_c87640459978_bulletballet.html`). The BB
mark in it is **original**, made for BulletBallet, and is the source of
truth for the brand. The mock is a *reference*, not a spec: everything in
§ Missing from the mock has to survive the rebrand.

---

## 1. The decision in one paragraph

**Green shell, amber game.** The site chrome — landing page, boot
screen, options overlay, disconnect panel — becomes a phosphor-green
operator terminal. The *game* keeps TS's own amber, because TS's HUD,
scoreboard and menus are amber in the original and that amber is the
nostalgia. A player sees a green terminal with an amber match playing
inside it, and the seam reads as intentional rather than accidental.

This is a deliberate change from the current theme, which is amber
*everywhere*. That was not laziness: `src/assets/ts-theme.css` documents
that TS's `iTeamColors[0]` (255,170,0) drives the in-game HUD and
scoreboard, so the amber page handed off amber-to-amber. Under the new
palette that handoff inverts, and the shell's green becomes the
distinguishing thing.

---

## 2. The brand

| Thing | Value |
|---|---|
| Name | **BulletBallet** |
| Mark | the BB cartridge mark — two mirrored B's, the negative space forming a bullet |
| Wordmark | `BULLET` in ghost-white + `BALLET` in phosphor (the mock's two-tone split) |
| Voice | terse, technical, slightly cinematic — the mock's "SCENE 01 /" register |
| Attribution | keep "Fan project · not affiliated with Valve or Half-Life" |

### Assets to produce

All of these are **ours**, so they may be committed (the asset-free rule
in the repo's `.gitignore` covers *game* assets, not our own SVGs).

| File | Size / use |
|---|---|
| `webxash/src/assets/brand/bb-mark.svg` | the mark as drawn — nav (≥32px) and hero |
| `webxash/src/assets/brand/bb-mark-24.svg` | simplified, for small UI (24px) |
| `webxash/src/assets/brand/bb-favicon.svg` | **solid silhouette**, no internal cutouts, on the void ground |
| `webxash/src/assets/brand/bb-wordmark.svg` | optional; the wordmark is DOM text and is better as text |

**The favicon cannot be the mark as drawn.** It is built from thin
strokes with internal cutouts; at 16px the cutouts vanish and it reads as
a green blob. It needs a second, filled silhouette — the bullet shape
with no interior detail, on `#010A04`. This is the single most likely
thing to get wrong on the first pass, and it is the thing users see in
the tab strip.

**Today the live favicon is Half-Life's lambda**
(`/src/assets/hl-bright.svg` → served as
`/assets/hl-bright-BcANNclR.svg`). We are shipping Valve's logo under our
own domain. Replacing it is both a brand fix and a licence-posture fix.
`hl-bright.svg` can be deleted once nothing references it.

---

## 3. The colour system

### 3.1 The shell palette

Taken from the mock and **verified for contrast** — every text pair
below passes WCAG AA with room to spare. The mock's muted green was
already strong; nothing needs to change to make it accessible.

| Token | Value | Role |
|---|---|---|
| `--bb-void` | `#010A04` | page ground |
| `--bb-terminal` | `#06150A` | panels, rows |
| `--bb-line` | `#123A1C` | 1px borders |
| `--bb-phosphor` | `#00FF41` | **the accent** — CTA, active, focus, live |
| `--bb-ghost` | `#D8FFE2` | body text, wordmark's first half |
| `--bb-mute` | `#6FA67C` | small labels, meta, secondary |
| `--bb-amber` | `#FFC44D` | **warning** — and the in-game accent |
| `--bb-red` | `#FF5C5C` | **error** — the launch error, the empty-error state |

Measured contrast (computed, not estimated):

| Foreground | Background | Ratio | AA normal (4.5) | AA large (3.0) |
|---|---|---|---|---|
| `--bb-ghost` | `--bb-void` | 18.46 | PASS | PASS |
| `--bb-ghost` | `--bb-terminal` | 17.26 | PASS | PASS |
| `--bb-mute` | `--bb-void` | 7.09 | PASS | PASS |
| `--bb-mute` | `--bb-terminal` | 6.63 | PASS | PASS |
| `--bb-mute` | `#000` (the bars) | 7.42 | PASS | PASS |
| `--bb-phosphor` | `--bb-void` | 14.70 | PASS | PASS |
| `--bb-phosphor` | `--bb-terminal` | 13.74 | PASS | PASS |
| `--bb-phosphor` | `--bb-line` | 9.33 | PASS | PASS |

### 3.2 The game palette — unchanged

TS's own amber (`#ffaa00`), its khaki/cream menu chrome, and the
engine's bitmap HUD fonts are the *game*. We do not restyle them and we
do not ship them.

### 3.3 The signal rule

The shell speaks in three colours and nothing else:

- **phosphor green** = nominal, live, active, "this works"
- **amber** = warning, degraded, "the server is not answering"
- **red** = error, "this failed"

### 3.4 ⚠️ The most likely silent regression in this rebrand

The existing theme uses `--ts-signal` (amber) for **both** the primary
CTA *and* for error surfaces — the launch error in `XashLanding.vue` and
the server-list error state in `TSServerList.vue` are both
`--ts-signal`. If `--ts-signal` simply becomes phosphor green, **errors
turn green**, which is a lie the player will read as success.

Every error surface must be moved to `--bb-red` explicitly in the same
change. Grep for `--ts-signal` and classify each use before swapping the
token's value.

### 3.5 Token mapping — how the swap actually works

The existing theme exposes **26 tokens**, consumed by only **6 component
files**. That is small enough to re-skin by **redefining the tokens**,
with no component rewrites — which is the cheapest and safest way to
change the whole shell at once.

Keep the `--ts-*` **names** (renaming them means touching every
component and every `var()`; redefining them means touching one file),
and change the values:

| Old token | Old value | New value | Note |
|---|---|---|---|
| `--ts-void` | `#000301` | `#010A04` | |
| `--ts-abyss` | `#060c14` | `#06150A` | |
| `--ts-panel` | `#292a22` | `#06150A` | |
| `--ts-panel-hi` | `#303129` | `#0A1F0E` | |
| `--ts-raised` | `#333333` | `#0E2A13` | |
| `--ts-khaki` | `#ccc19a` | `#D8FFE2` | ghost-white |
| `--ts-khaki-dim` | `#b0a883` | `#A8E8B8` | |
| `--ts-khaki-deep` | `#9e9574` | `#6FA67C` | |
| `--ts-header` | `#a69c7a` | `#9FD9AC` | |
| `--ts-edge` | `#2c2d24` | `#123A1C` | |
| `--ts-signal` | `#ffaa00` | `#00FF41` | **the accent changes** — see §3.4 |
| `--ts-signal-hot` | `#ffc44d` | `#7CFFA6` | hover |
| `--ts-green` | `#00a600` | `#00FF41` | deprecated — the old mark is gone |
| `--ts-lime` | `#e8ecbb` | `#D8FFE2` | the wordmark colour |
| `--ts-alert` | `#ffff00` | `#FFC44D` | warning |
| `--ts-ink` | `#9e9daf` | `#D8FFE2` | body text |
| `--ts-ink-bright` | `#e9e9e9` | `#EAFFF0` | |
| `--ts-ink-dim` | `#646464` | `#4E7A5A` | |
| `--ts-ink-muted` | `#9696ab` | `#6FA67C` | |
| `--ts-ink-faint` | `#3d3a2d` | `#2A4A31` | |
| `--ts-notch` | `10px` | `0px` | **square corners** — see §3.6 |
| `--ts-edge-thin` | 1px solid | unchanged | |
| `--ts-edge-lit` | 1px solid | unchanged | |
| `--ts-ease` / `--ts-sweep` | | unchanged | |

**New** tokens to add: `--ts-error` (`#FF5C5C`), `--ts-warn`
(`#FFC44D`), `--ts-ok` (`#00FF41`), `--ts-font-body`, `--ts-rule` (the
4px phosphor left-rule the mock puts on its rows).

### 3.6 Geometry — square, not chamfered

The current panels use a GoldSrc-style chamfer (`clip-path` with a 10px
notch). The mock uses **square corners with a 4px phosphor left-rule**,
which is the terminal language. `--ts-notch: 0px` turns the chamfer off
everywhere at once; the left-rule is added per-panel.

---

## 4. The type system

| Role | Face | Fallback |
|---|---|---|
| Display | **Anton** | `'Arial Narrow', sans-serif` |
| Body | **Space Grotesk** | `system-ui, sans-serif` |
| Technical | **JetBrains Mono** | `ui-monospace, monospace` |

Replaces Barlow Condensed + Share Tech Mono. The change in
`index.html` is one `<link>`; the token values are
`--ts-font-display: 'Anton', …`, `--ts-font-mono: 'JetBrains Mono', …`,
and a new `--ts-font-body: 'Space Grotesk', …`.

**Note on provenance:** the current theme's fonts were chosen with
documented reasoning — Barlow Condensed stands in for GoldSrc's
condensed HUD lettering, and TS's `client.dll` requests Arial and draws
HUD text from bitmap fonts in `fonts.wad` that we cannot ship. That
reasoning still applies to the *game*, which we do not restyle. The
*shell* is ours and is free to use a louder face; Anton is right for it.

Google Fonts is already a dependency today, so this is not a new class
of external dependency. It does go from 2 families to 3.

---

## 5. The surfaces

### 5.1 Landing page — `XashLanding.vue`

**Structure from the mock:** a fixed top bar, a fixed bottom bar, the
code-rain stage, a nav row, the hero (mark, eyebrow, wordmark, dashed
rule, lede, PLAY), the tab panel, the footer.

**Everything currently on the live page must survive.** The mock has none
of these, and losing any of them is a regression:

| Must survive | Where it is now | Why it matters |
|---|---|---|
| **"Start full screen" checkbox** | `XashLanding.vue` | browser fullscreen only grants *inside* the click gesture, so the player needs the opt-out **before** the game takes the screen |
| **Download progress** (`Loading game data · N%`) | `XashLanding.vue` | the 493 MB fetch — the mock has no progress at all |
| **Launch error surface** | `XashLanding.vue` | "No servers answered…", "Could not reach the server list." That silence is exactly what made the first production bug take a day to find |
| **Server-list states** | `TSServerList.vue` | "Scanning for servers…", "No servers answered." + hint, and an error state **distinct** from empty |
| **Refresh button** | `TSServerList.vue` | with its spinning and disabled states |
| **Join per server** | `TSServerList.vue` | the row is a target, not a label |
| **The real "How It Works" copy** | `TSHowToPlay.vue` | three cards (Rust port → WS↔UDP bridge → input path) **plus the full controls table**. The mock's three steps are much thinner |
| **Real footer links** | `XashLanding.vue` | tsmod.net, webXash, Xash3D FWGS. The mock's are `href="#"` |

**New in the server row**, from data the registry already returns: the
**humans / bots split** (today "16 / 32" reads as 16 players when it is
16 bots), the **tickrate**, and a **health chip** (`responsive`,
`degrading`, `stale`).

**The fold.** Measured on the mock at 1280×577, the wordmark renders at
166px and *both* PLAY and the server list are below the fold. The live
page today has everything above the fold. The fix is **scale, not
layout inversion** — stay with the mock's centred structure and shrink:

- the hero mark 220px → ~150px
- `h1` `clamp(60px, 13vw, 200px)` → `clamp(56px, 9vw, 120px)`
- tighten `.stage` padding and the hero's internal gaps
- the tab panel moves up

**Accept:** measured at 1280×720 and 1440×900, the PLAY button *and* the
first server row are both above the fold. If they are not, the fallback
is a two-column layout at ≥1024px (hero left, panel right) rather than
shrinking further.

**The code rain.** The mock's does not rain: measured, it is **12 columns
of one identical string**, and the animation translates only −8%→+8% of
a 120%-tall element, so the glyphs shimmer in place and never travel.
Fix: one string per column, and translate the full height. Keep it to
transform/opacity so it costs nothing.

**The live status in the top bar.** The mock's "TC 00:00:04:12 / bullet
time" is a static string. Make it **live** — the registry already
publishes the current map and the server list is polled on a timer, so
the bar can show the real map and player count. Optional; do it only
after the static version ships.

### 5.2 Boot screen — `XashLoading.vue`

**Good news: this screen already is a terminal.** It is a progress ring
with a determinate arc plus a numbered step list — `▸` active, `■` done,
`·` pending — with real phase names fed from the loader's actual `await`
boundaries, and a foot line that says "First run downloads the game data —
later runs are cached".

The mock's aesthetic and this screen are the same idea. It needs a
restyle, not a rebuild: green shell, the BB mark, the same honest phases.
Keep the determinate/indeterminate distinction — the arc holding at 97%
while one 36 MB archive member inflates is real, and the rotating tick
over a stalled arc is what makes it read as *working* rather than *hung*.

### 5.3 Options overlay — `XashOptionsOverlay.vue`

Restyle only. Every control stays: Identity (name, 24 chars), Controls
(sensitivity, FOV, volume), Camera (third person + the note that it
needs you alive), Session (Quit to web UI). Green shell, square corners,
phosphor focus rings, the group legends become mono uppercase labels.

### 5.4 CONNECTION LOST panel — inside `XashCanvas.vue`

Restyle only. Keep the reason line, the "Reconnecting in Ns" countdown
and the "Reconnect now" button. The title goes **red**, not green — it
is an error, and §3.4 applies.

### 5.5 Head, meta, favicon — `index.html`

- `<title>` → `BulletBallet — The Specialists in your browser`
- favicon → `bb-favicon.svg`; add an apple-touch-icon
- `<meta name="description">`
- `<meta name="theme-color" content="#010A04">`
- Open Graph + Twitter card (title, description, image)
- fonts → Anton / Space Grotesk / JetBrains Mono

⚠️ **The engine hijacks the title.** Verified on the live site: the
static HTML says "The Specialists" but the runtime title is
**"🐴 The Specialists"** — `xash3d-fwgs` sets `document.title` from the
engine's own window title once it boots
(`document.title = UTF8ToString(title)` in `dist/raw.js`). So
`index.html` governs the landing page — which is where the brand matters —
but the tab reverts to the game's title the moment you enter a match.
**The client has to re-assert the title after boot** if the tab should
stay BulletBallet. This is easy to miss and looks like the title change
"didn't take".

---

## 6. What is deliberately NOT changing

| Thing | Why |
|---|---|
| The engine's HUD, scoreboard and menus | that is the *game*; TS's amber is the nostalgia. See §1 |
| The Vue HUD (`TSHud.vue`) | **off by default** — its cash/killfeed/scores are JS-simulated, which is why it carries a DEMO banner. Do not re-enable it in the new skin. (Its live-state strip — MAP / TEAMS / NAME — *is* real engine data, so that part is fine.) |
| The dev-only surfaces | file pickers, zip loader, saves, the WebRTC P2P panel (superseded by the dedicated server), the dev launch options |
| The server's A2S name | already `bulletballet TS` (`TS_HOSTNAME` default in `entrypoint.sh`) |
| The repo name, container names, service names | internal only. Renaming `specialists-browser`, `ts-server`, `registry` or `ts-bridge` risks the production path for **zero** player-visible gain. Say it here so it is a decision, not an oversight. |

---

## 7. Sequencing

Each phase is independently shippable and independently verifiable.

**Phase 0 — the fix Kyle wants first.** Not yet named. Gates Phase 1.

**Phase 1 — tokens, head, brand assets.** One `webxash` PR + one
pointer-bump PR here.
- extract the mark into `src/assets/brand/` at three sizes (§2)
- swap the 26 token values (§3.5), add `--ts-error` / `--ts-warn` /
  `--ts-ok` / `--ts-font-body` / `--ts-rule`
- **move every error surface to `--ts-error`** (§3.4)
- square the corners, add the left-rule
- `index.html`: fonts, title, favicon, meta, OG (§5.5)
- re-assert `document.title` after boot

*Accept:* the live site is green, the tab shows the BB mark, the boot
screen and the options overlay are green, the launch error is red, the
in-game HUD is still amber, and the contrast table in §3.1 still holds.

**Phase 2 — the landing page.** One `webxash` PR.
- the mock's structure: top bar, bottom bar, stage, nav, hero, tabs
- the code rain fixed (per-column strings, full-height travel)
- the server row rebuilt with humans/bots, tickrate, health chip
- the fold measured at 1280×720 and 1440×900

**Phase 3 — boot, options, disconnect.** One `webxash` PR. Restyle only;
no behaviour change.

**Phase 4 — docs, README, OG image.** One PR here.
- README refresh (it also still carries the **withdrawn** keyboard
  root cause — see §9)
- `docs/FE-MOD-PLAN.md`: B3 and B4 marked done
- `HANDOFF.md` § CURRENT STATE and § NEXT TASK
- a real OG image (1200×630) built from the brand

---

## 8. Verification

Every phase:

- `bunx vue-tsc --noEmit` and `bun run build` (what CI runs)
- `node --test tests/unit/*.test.mjs` in the parent repo
- a real browser at **1280×720**, **1440×900** and **375×667**, with
  screenshots
- the contrast table in §3.1 recomputed against the *shipped* token
  values, and the numbers recorded
- the fold measured: PLAY's and the first server row's bounding boxes
  against the viewport

Every phase that touches the launch path must also keep the deploy's own
browser checks green — `tools/deploy/play-button-e2e.cjs` and
`tools/deploy/two-player-e2e.cjs` run against production on every
deploy. Those are the real regression net for the landing page; a
screenshot is not.

---

## 9. Open items and risks

- **Phase 0 is unnamed.** Whatever it is, it lands before Phase 1.
- **Error surfaces turning green** (§3.4) is the most likely silent
  regression. Grep and classify before swapping the token.
- **The favicon at 16px** (§2) is the most likely visible failure.
- **The engine's title hijack** (§5.5) will silently undo the title
  change if nobody re-asserts it.
- **The README still carries a withdrawn claim.** The "the published WASM
  build never drains its SDL event queue" root cause was **withdrawn**
  (the engine's own key path works — the bug was ours: we sent every key
  twice). `docs/UPSTREAM-ISSUES.md` retracts it and the fix shipped, but
  `README.md` still describes it as one of "the four things that make it
  work", and `webxash/src/services/sdl-key-inject.ts` is unimported dead
  code whose header still asserts the withdrawn theory. Both should be
  swept in Phase 4 — a withdrawn claim in a prominent file outlives the
  evidence.
- **The 16px mark and the 24px mark are new drawings**, not
  downscales. Budget for actually drawing them.
- **A possible "one thing" candidate:** if the fix Kyle wants first is
  the README/withdrawn-claim sweep, it is small and independent — say so
  and it can ride along in Phase 4 instead of blocking Phase 1.
