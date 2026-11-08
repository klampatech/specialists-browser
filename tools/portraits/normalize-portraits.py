#!/usr/bin/env python3
"""Normalise raw HLAM captures into uniform character portraits.

    python3 docs/design-assets/normalize-portraits.py <raw-dir> <out-dir>

Input : raw captures from `capture-portraits.sh` (RGBA, transparent
        background, one PNG per character model).
Output: two uniform sets:
  <out-dir>/full/<name>.png      512x512  the whole character, feet on a
                                             baseline
  <out-dir>/portrait/<name>.png  256x256  head and shoulders, square so it
                                             fills the picker's square slot

UNIFORMITY, applied to every character the same way
--------------------------------------------------
  * the silhouette (alpha > 16) is the subject,
  * the subject's HEIGHT is normalised, not its width - a wide stance and a
    narrow one end up the same size on screen,
  * the subject is centred horizontally and stands on a fixed baseline,
  * the portrait crop is sized in HEAD WIDTHS, so every head is the same
    size in the frame whatever the character is wearing,
  * the background is transparent, like the game's own portrait art.

WHY THE SHADOWS ARE LIFTED
--------------------------
GoldSource's studio lighting gives the black-clad characters almost no
ambient term, so `merc` and `seal` render nearly black - and the picker's
tile is dark too, so a straight render is a dark blob on a dark tile. A
gamma lift on the RGB (the alpha is untouched) is the difference between
"a character" and "a shadow". It is applied to every character alike, so
it does not break the uniformity.

The game's own portrait art for the seven default characters is painted,
not rendered, and it needs no lift: that is why the lift is gentle enough
to leave the rendered faces readable rather than washed out.
"""
import os
import sys
from PIL import Image

ALPHA_CUTOFF = 16
FULL_SIZE = (512, 512)
FULL_HEIGHT_FRACTION = 0.88   # subject height as a fraction of the canvas
FULL_BASELINE = 0.96          # where the feet sit, as a fraction of the canvas
PORTRAIT_SIZE = (256, 256)
HEAD_BAND = 0.12              # top slice of the subject used to find the head
PORTRAIT_CROP_FACTOR = 2.80   # portrait crop size, in head widths
PORTRAIT_HEADROOM = 0.20      # headroom above the head, as a fraction of the crop
PORTRAIT_LIFT_GAMMA = 0.60    # gamma lift on the RGB, so the dark-clad
                              # characters (merc, seal, gordon) still read
                              # against the picker's dark tile


def silhouette_bbox(im):
    a = im.getchannel("A")
    mask = a.point(lambda v: 255 if v > ALPHA_CUTOFF else 0)
    return mask.getbbox()


def lift_shadows(im, gamma=PORTRAIT_LIFT_GAMMA):
    """Gamma-lift the RGB channels; the alpha (the silhouette) is untouched."""
    if gamma is None or gamma >= 1.0:
        return im
    r, g, b, a = im.split()
    lut = [min(255, int(round(255 * ((i / 255) ** gamma)))) for i in range(256)]
    return Image.merge("RGBA", (r.point(lut), g.point(lut), b.point(lut), a))


def normalise_full(im, size=FULL_SIZE):
    bbox = silhouette_bbox(im)
    if bbox is None:
        return None
    x0, y0, x1, y1 = bbox
    subject = im.crop(bbox)
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))

    target_h = int(size[1] * FULL_HEIGHT_FRACTION)
    scale = target_h / subject.height
    target_w = max(1, int(round(subject.width * scale)))
    subject = subject.resize((target_w, target_h), Image.LANCZOS)

    # Feet on the baseline, centred on the subject's own centre.
    ox = (size[0] - target_w) // 2
    oy = int(size[1] * FULL_BASELINE) - target_h
    canvas.alpha_composite(subject, (ox, oy))
    return canvas


def normalise_portrait(im, size=PORTRAIT_SIZE):
    bbox = silhouette_bbox(im)
    if bbox is None:
        return None
    mask = im.getchannel("A").point(lambda v: 255 if v > ALPHA_CUTOFF else 0)
    x0, y0, x1, y1 = bbox
    subject_h = y1 - y0

    # The head is the top slice of the silhouette. Its width sets the
    # scale of the portrait: the head ends up about half the frame, which
    # is how the game's own portrait art is framed.
    band = mask.crop((x0, y0, x1, y0 + max(1, int(subject_h * HEAD_BAND))))
    bb = band.getbbox()
    if bb is None:
        return None
    head_w = max(1, bb[2] - bb[0])
    head_top = y0 + bb[1]
    head_cx = x0 + (bb[0] + bb[2]) / 2.0

    crop = max(8, int(round(head_w * PORTRAIT_CROP_FACTOR)))
    left = head_cx - crop / 2.0
    top = head_top - crop * PORTRAIT_HEADROOM
    region = im.crop((int(round(left)), int(round(top)),
                      int(round(left)) + crop, int(round(top)) + crop))

    # Cover-fit into the target box, centred on the head.
    scale = max(size[0] / region.width, size[1] / region.height)
    region = region.resize((max(1, int(round(region.width * scale))),
                             max(1, int(round(region.height * scale)))), Image.LANCZOS)
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    ox = int(round(head_cx - left) * scale) - size[0] // 2
    oy = int(round((head_top - top) * scale)) - int(round(head_w * scale * PORTRAIT_HEADROOM))
    canvas.alpha_composite(region, (ox, oy))
    return lift_shadows(canvas)


def main():
    if len(sys.argv) < 3:
        print("usage: normalize-portraits.py <raw-dir> <out-dir>", file=sys.stderr)
        return 1
    raw_dir, out_dir = sys.argv[1], sys.argv[2]
    full_dir = os.path.join(out_dir, "full")
    port_dir = os.path.join(out_dir, "portrait")
    os.makedirs(full_dir, exist_ok=True)
    os.makedirs(port_dir, exist_ok=True)

    names = sorted(n for n in os.listdir(raw_dir) if n.lower().endswith(".png"))
    for name in names:
        stem = os.path.splitext(name)[0]
        im = Image.open(os.path.join(raw_dir, name)).convert("RGBA")
        full = normalise_full(im)
        if full is None:
            print(f"SKIP {stem}: empty silhouette")
            continue
        full.save(os.path.join(full_dir, f"{stem}.png"))
        portrait = normalise_portrait(im)
        if portrait is not None:
            portrait.save(os.path.join(port_dir, f"{stem}.png"))
        print(f"OK {stem}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
