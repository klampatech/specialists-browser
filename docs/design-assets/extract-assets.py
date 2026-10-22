#!/usr/bin/env python3
"""
Extract TS design assets from the game files, as PNG, for use in design
reference and any future information page.

WHY A SCRIPT AND NOT CHECKED-IN PNGs
-----------------------------------
`.gitignore` in the parent repo says:

    # Game assets — DO NOT COMMIT. The repo is asset-free.
    # Users source HL1 + TS mod files separately.

That policy is deliberate and correct: the portraits, logo, menu strips
and loading tiles are artwork belonging to The Specialists' authors, not
to this project. Committing PNG derivatives of them into an MIT repo
would put someone else's art under our licence and quietly invert the
distribution position the README already takes ("the engine and mod
content are not covered by this license").

So: no binaries in git. This script makes them reproducible in one
command from `tsmod.zip`, which is already present locally and already
gitignored. The palette data IS committed, because measured facts are not
artwork — see palette.json.

USAGE
-----
    python3 docs/design-assets/extract-assets.py                 # defaults
    python3 docs/design-assets/extract-assets.py --zip <path> --out <dir>

Requires Pillow. Output lands in `docs/design-assets/generated/`, which
is gitignored.
"""

from __future__ import annotations

import argparse
import io
import os
import sys
import zipfile

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    sys.exit("Pillow is required: pip install Pillow")

# (source path inside tsmod.zip, output filename)
PORTRAITS = [
    (f"ts/models/player/{n}/{n}.bmp", f"portrait_{n}.png")
    for n in ("agent", "castor", "gordon", "hitman", "laurence", "merc", "seal")
]
UI = [
    ("ts/ts_logo.tga", "logo_16px.png"),
    ("ts/logos/remapped.bmp", "logo_64px.png"),
    ("ts/resource/game_menu.tga", "menu_strip.png"),
    ("ts/resource/game_menu_mouseover.tga", "menu_strip_hover.png"),
]
# The loading tiles are matched by glob — the filenames carry a suffix
# (800_1_a_loading, 800_2_b_loading, ...) and the set is meant to change
# when the mod updates.
LOADING_GLOB_PREFIX = "ts/resource/background/800_"
LOADING_SUFFIX = "_loading.tga"


def load_from_zip(zf: zipfile.ZipFile, name: str) -> Image.Image:
    """Read an image out of the zip and normalise it to RGBA."""
    with zf.open(name) as fh:
        data = fh.read()
    im = Image.open(io.BytesIO(data))
    # Several of these are paletted BMP/TGA; convert so the PNG we write is
    # stable regardless of the source bit depth.
    return im.convert("RGBA")


def save(im: Image.Image, out_dir: str, out_name: str) -> tuple[str, int]:
    path = os.path.join(out_dir, out_name)
    im.save(path, "PNG", optimize=True)
    return out_name, os.path.getsize(path)


def main() -> int:
    here = os.path.dirname(os.path.abspath(__file__))
    repo = os.path.dirname(os.path.dirname(here))

    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--zip",
        default=os.path.join(repo, "webxash", "public", "hl", "tsmod.zip"),
        help="path to tsmod.zip",
    )
    ap.add_argument(
        "--out", default=os.path.join(here, "generated"),
        help="output directory (gitignored)",
    )
    args = ap.parse_args()

    if not os.path.exists(args.zip):
        return sys.exit(f"not found: {args.zip}")

    names = set(zipfile.ZipFile(args.zip).namelist())
    loading = sorted(
        n for n in names
        if n.startswith(LOADING_GLOB_PREFIX) and n.endswith(LOADING_SUFFIX)
    )

    os.makedirs(args.out, exist_ok=True)
    written, failed = 0, []

    for sub, items in (("portraits", PORTRAITS), ("ui", UI),
                       ("backgrounds", [(n, os.path.basename(n)[:-4] + ".png")
                                        for n in loading])):
        d = os.path.join(args.out, sub)
        os.makedirs(d, exist_ok=True)
        for src, dst in items:
            if src not in names:
                failed.append(src)
                continue
            try:
                n, size = save(load_from_zip(zipfile.ZipFile(args.zip), src), d, dst)
                written += 1
                print(f"  {sub}/{n}  ({size // 1024} KB)")
            except Exception as exc:  # noqa: BLE001 - report and continue
                failed.append(f"{src}: {exc}")

    print(f"\n{written} written to {args.out}")
    print(f"{len(loading)} loading tiles found")
    if failed:
        print("\nFAILED:")
        for f in failed:
            print(f"  {f}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())