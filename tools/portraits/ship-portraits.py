#!/usr/bin/env python3
"""Ship the character portraits into the web app.

WHAT THIS IS
------------
`capture-portraits.sh` renders every model in the mod and
`normalize-portraits.py` writes two uniform sets from those captures:

    <out>/full/      512x512   the whole character, feet on a baseline
    <out>/portrait/  256x256   head and shoulders, square

The web app shows the `portrait/` set: every character's picture is the
same square with the same framing, so the picker reads as one roster
rather than two kinds of picture.

WHY THE CHARACTER LIST LIVES HERE
---------------------------------
The set that ships is NOT "everything the normaliser produced". The mod
ships SEVENTEEN model directories and SIXTEEN usable characters, and
the seventeenth is `ala`:

    ts/models/player/ala/ala2.mdl

The engine resolves a player model as `models/player/<name>/<name>.mdl`
(`R_StudioSetupPlayerModel`, `ref/gl/gl_studio.c` in xash3d-fwgs), so
the name "ala" resolves to a file that does not exist and the engine
SILENTLY falls back to the default player model. There is no such
character in the game, so there is no portrait for it.

A directory copy of `portrait/` would ship `ala.png` — a picture of a
character that cannot be played. The list below is the playable set,
and it is the same list the client offers (`TS_MODELS` in
`webxash/src/services/player-identity.ts`).

THE CASE IS THE NAME
--------------------
The list below carries each character's spelling EXACTLY as the mod
ships it, because the engine puts the name straight into a file path:

    Bodysaver   Spetsnaz   SpeziClaus

`bodysaver.png` is a 404 on the case-sensitive filesystem the archive
is unpacked into, and `models/player/bodysaver/bodysaver.mdl` is a
file that does not exist.

WHAT THIS PROMISES, AND WHAT IT DOES NOT
----------------------------------------
It makes the REPOSITORY's portrait folder exactly the roster, and it
fails loudly rather than shipping half a roster.

It cannot make the DEPLOYED directory exactly the roster. The deploy
ships the frontend with `rsync -az` and deliberately without
`--delete`, so a portrait removed from the repository can still be
served until something removes it by hand. (Right now: `/models/ala.png`
on production, 30 KB, never requested — the roster has no `ala` in it.)

USAGE
-----
    tools/portraits/ship-portraits.py <portrait-dir> <webxash-dir>

    <portrait-dir>   the normaliser's `portrait/` output
    <webxash-dir>    the webXash checkout (its `public/models/` is written)
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

# THE PLAYABLE SET. The mod's own spelling, in the mod's own order.
#
# Every name here is a directory under `ts/models/player/<name>/`
# holding a `<name>.mdl` the engine can resolve, AND a character the
# game can spawn. `ala` is deliberately absent — see the module
# docstring.
CHARACTERS: tuple[str, ...] = (
    "agent",
    "agentsmith",
    "Bodysaver",
    "castor",
    "dude",
    "gordon",
    "hitman",
    "jesus",
    "laurence",
    "merc",
    "niobe",
    "sandman",
    "seal",
    "seraph",
    "Spetsnaz",
    "SpeziClaus",
)


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print(__doc__)
        return 2

    portrait_dir = Path(argv[1])
    out_dir = Path(argv[2]) / "public" / "models"

    if not portrait_dir.is_dir():
        print(f"no such portrait directory: {portrait_dir}", file=sys.stderr)
        return 1

    out_dir.mkdir(parents=True, exist_ok=True)

    missing: list[str] = []
    for name in CHARACTERS:
        src = portrait_dir / f"{name}.png"
        if not src.is_file():
            missing.append(name)
            continue
        shutil.copyfile(src, out_dir / f"{name}.png")
        print(f"shipped {name}.png")

    if missing:
        print(
            f"missing portraits for: {', '.join(missing)} — "
            f"run capture-portraits.sh and normalize-portraits.py first",
            file=sys.stderr,
        )
        return 1

    # Anything else in the destination is a portrait for a character
    # that is not playable, and it is a picture of nothing. It is
    # removed rather than left behind, so the folder and the playable
    # set are the same set.
    for stray in sorted(out_dir.glob("*.png")):
        if stray.stem not in CHARACTERS:
            print(f"removed {stray.name} — not a playable character")
            stray.unlink()

    print(f"\n{len(CHARACTERS)} portraits shipped to {out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
