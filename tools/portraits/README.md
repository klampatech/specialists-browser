# Character portraits

The recipe that produces the character portraits the web app shows.

## Why a render at all

The game draws portrait art for **seven** characters - the seven in its
own default `mp_teammodels`:

```
seal;merc|gordon;laurence|agent|hitman;castor
```

`ts/models/player/<name>/<name>.bmp` exists for exactly those seven and
for nobody else. The mod ships **sixteen** usable character models, so
nine characters had no portrait at all, and the character picker could
not show them.

For those, the portrait is a **render** of the character model, drawn by
the [Half-Life Asset Manager](https://github.com/SamVanheer/HalfLifeAssetManager)
(3.0, the Linux build), which renders GoldSource studio models the way
the engine does.

## The three scripts

```bash
# 1. render every model in the mod
tools/portraits/capture-portraits.sh \
  _runtime_assets/half-life/ts/models/player /tmp/captures

# 2. normalise the captures into uniform portraits
python3 tools/portraits/normalize-portraits.py /tmp/captures /tmp/portraits

# 3. ship the sixteen playable ones into the web app
python3 tools/portraits/ship-portraits.py /tmp/portraits/portrait webxash
```

Step 2 writes two uniform sets:

```
/tmp/portraits/full/      512×512   the whole character, feet on a baseline
/tmp/portraits/portrait/  256×256   head and shoulders, square
```

The 256×256 set is what the web app shows.

Step 3 is the one that decides **which** portraits ship, and it is a
script rather than a copy because the set is not "everything the
normaliser produced". It ships the mod's **playable** sixteen and
refuses `ala`, and it removes any stray portrait left in the
destination — a picture of a character that cannot be played is a
picture of nothing.

**THE CASE IS THE NAME.** Step 3 copies `Bodysaver.png`, not
`bodysaver.png`. The engine puts the model name straight into a file
path, and the archive is unpacked into a case-sensitive filesystem, so
a lowercased name resolves to nothing and the engine falls back to the
default player model without saying so.

## Dependencies

| What | Why |
|---|---|
| `hlam` 3.0 | the renderer. `halflifeassetmanager_3.0.0_amd64.deb` from the upstream releases |
| `xvfb`, `openbox` | a display and a window manager - HLAM's menus and dialogs need focus to be driven |
| `xdotool` | drives HLAM: F10 is "Take Screenshot...", the timeline buttons set the pose |
| Mesa's software rasteriser | `llvmpipe`; no GPU needed |
| Pillow | the normaliser |

## What the capture has to get right

**The pose must be deterministic.** The viewport shows frame N of
sequence 0, and N is whatever the clock said - so the capture pauses
the animation and rewinds to frame 0 before the screenshot. The result
is the character's own idle, not a random frame.

**One HLAM at a time.** HLAM is single-instance: a second process hands
its file to the first one and exits. A capture loop that does not wait
for the previous instance to die captures the PREVIOUS model again. The
script kills any instance before it starts, and matches the window by
THIS model's file name.

**The capture is geometrically reproducible, not byte-identical.** The
same model captured twice has the same silhouette to the pixel, but the
software rasteriser's texture filtering differs by a level or two.

## What "uniform" means here

Applied to every character the same way:

- the subject is the **silhouette** (alpha > 16);
- the **height** is normalised, not the width, so a wide stance and a
  narrow one end up the same size on screen;
- the portrait crop is sized in **head widths**, so every head is the
  same size in the frame whatever the character is wearing;
- the background is transparent, like the game's own portrait art;
- the RGB is **gamma-lifted** (0.60): GoldSource's studio lighting
  leaves the black-clad characters nearly black, and the picker's tile
  is dark too, so a straight render of `merc` is a dark blob on a dark
  tile.

## The one model that cannot be used

`ala` ships as `models/player/ala/ala2.mdl`. The engine resolves a
player model as `models/player/<name>/<name>.mdl`
(`R_StudioSetupPlayerModel`, `ref/gl/gl_studio.c` in xash3d-fwgs), so
the name "ala" resolves to a file that does not exist and the engine
silently falls back to the default player model. There is no such
character in the game, so there is no portrait for it.
