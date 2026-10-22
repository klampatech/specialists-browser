# Design assets & measured palette

Reference material for building pages against The Specialists' actual
look. **No artwork is committed here** — see [Why](#why-there-are-no-pngs-in-this-folder).

## What's here

| File | What it is |
|---|---|
| `palette.json` | Every colour, font and content fact, with the file or constant it was sampled from |
| `extract-assets.py` | Regenerates the art from `tsmod.zip` into `generated/` |
| `generated/` | Output — gitignored, not tracked |

## Getting the artwork

```bash
python3 docs/design-assets/extract-assets.py
```

Produces 24 files, byte-identical to a reference extraction:

```
generated/portraits/     7 × 164×200   agent castor gordon hitman laurence merc seal
generated/ui/            logo 16px, logo 64px, menu strip + hover strip
generated/backgrounds/   13 loading tiles (800_{1,2,3}_{a..e}_loading)
```

`tsmod.zip` is expected at `webxash/public/hl/tsmod.zip` (494 MB,
gitignored). Override with `--zip`. Requires Pillow.

## Why there are no PNGs in this folder

The parent repo's `.gitignore` is explicit:

```gitignore
# ─────────────────────────────────────────────────────────────
# Game assets — DO NOT COMMIT. The repo is asset-free.
# Users source HL1 + TS mod files separately.
# ─────────────────────────────────────────────────────────────
```

That is the correct policy, and it is worth keeping. The portraits, logo,
menu strips and loading tiles are artwork belonging to The Specialists'
authors. Committing PNG derivatives into an MIT-licensed repo would place
someone else's art under our licence, and would quietly invert the
distribution position the README already takes:

> Repo content is MIT. The engine and mod content are **not** covered by
> this license.

So the **recipe** is committed and the **meal** is regenerated. That
also means the art can never drift from the game files — it is derived at
the moment you need it, not frozen at the moment someone ran a script.

The measurement survives, because **a measured fact is not artwork**.
`palette.json` records that the accent is `#ffaa00` and that it came from
`TEAM_COLORS[0]` at `0x10096974`. That is knowledge about the mod, not
the mod's bytes.

## The one thing to get right

There are two plausible "TS orange" colours and they are not
interchangeable:

| Hex | Source | What it actually is |
|---|---|---|
| **`#ffaa00`** | `TEAM_COLORS[0]`, `iTeamColors` `0x10096974` | **The accent.** HUD status bar, scoreboard, team bars — the colour players see constantly |
| `#f06e00` | `game/titles.txt` `$color2 240 110 0` | The **intro text** colour. Real, but incidental |

The first pass used `#f06e00`. It was a genuine sample of the wrong thing.
Leading with amber also makes the landing page hand off to the game
amber-to-amber instead of changing colour mid-session.

Likewise, **TS green `#00a600` is the logo mark only** — a live 1600×900
game capture measured **zero** green pixels. It is not a UI accent.

## Content that is verified and safe to use

From `palette.json`: 37 usable weapons, 19 maps, 7 characters with their
default team groupings, 4 modes, 9 powerups, 6 spectator camera modes.

See also `docs/UPSTREAM-ISSUES.md` for what this build genuinely cannot
do, and the README's "Current state" for the proved list.

### Do not advertise

- **A cash economy.** `CashBased()` is hard-wired to return `0` in TS 3.0.
  `ts_sellzone` refunds do nothing and dropped weapons are never buyable.
- **Round-based teamplay.** `m_mode` 2/3 are only assigned in
  `InitObjectives`; nothing sets `g_teamplay` to 2 or 3. Intact but dead.
- **`superjump` as a cvar.** It is a powerup in TS 3.0.
- **`TSHud.vue` screenshots.** It is a JS-animated demo with hardcoded
  values, and its buy panel would advertise a shop that does not exist.
  Use real engine captures only.