#!/usr/bin/env python3
"""Generate the Munaxa *minimized* logo — lowercase "m" + the square teal brand dot — as the
square app icons and favicons.

The full open-book + graduation-cap mark (docs/design-system/logo.png) is used inline where
there's room (headers, login). Tab/app icons are small, so they use the minimized "m." monogram
instead: a teal-gradient "m" in the brand display font (IBM Plex Sans) followed by the square
teal dot, matching the on-page wordmark.

Writes (transparent unless noted):
  Web — each Next app's src/app/ (admin, demo, landing):
    favicon.ico   (16/32/48/64)
    icon.png      (512)
    apple-icon.png (180, opaque on brand ink #090B0C — iOS ignores transparency)
  Mobile launcher sources (apps/mobile/assets/icon/):
    ic_launcher.png            (1024, opaque on ink) — iOS + legacy Android
    ic_launcher_foreground.png (1024, transparent)   — Android adaptive foreground

Usage:  python3 scripts/gen-icons.py   (requires Pillow; reads the vendored woff2 directly)
Then wire mobile icons with:  cd apps/mobile && dart run flutter_launcher_icons
"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = os.path.join(ROOT, "apps/admin/src/fonts/IBMPlexSans-latin.woff2")

INK = (9, 11, 12, 255)      # brand ink-900 #090B0C
GRAD_TOP = (0x00, 0xB8, 0xDB)  # light teal
GRAD_BOT = (0x00, 0x50, 0x66)  # deep teal
DOT = (0x00, 0x75, 0x95, 255)  # primary teal #007595 — the square brand dot


def _teal_gradient(size, y0, y1):
    g = Image.new("RGB", size)
    gp = g.load()
    span = max(1, y1 - y0)
    for y in range(size[1]):
        t = min(1.0, max(0.0, (y - y0) / span))
        c = tuple(round(GRAD_TOP[k] + (GRAD_BOT[k] - GRAD_TOP[k]) * t) for k in range(3))
        for x in range(size[0]):
            gp[x, y] = c
    return g


def monogram(px, fill_frac=0.66, bg=None):
    """Render the 'm.' monogram on a px×px canvas (4× supersampled). fill_frac is the glyph
    height as a fraction of the canvas; bg=None → transparent, else an opaque RGB tuple."""
    ss = 4
    s = px * ss
    canvas = Image.new("RGBA", (s, s), bg if bg else (0, 0, 0, 0))
    fs = int(s * fill_frac)
    font = ImageFont.truetype(FONT, fs)
    stroke = int(fs * 0.05)  # faux-bold so the regular weight reads at small sizes
    probe = ImageDraw.Draw(canvas)
    tb = probe.textbbox((0, 0), "m", font=font, stroke_width=stroke)
    mw, mh = tb[2] - tb[0], tb[3] - tb[1]
    dot = int(mh * 0.5)
    gap = int(mh * 0.16)
    total_w = mw + gap + dot
    ox = (s - total_w) // 2 - tb[0]
    oy = (s - mh) // 2 - tb[1]
    # the 'm' filled with the vertical teal gradient
    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).text((ox, oy), "m", font=font, fill=255,
                              stroke_width=stroke, stroke_fill=255)
    canvas.paste(_teal_gradient((s, s), oy + tb[1], oy + tb[3]).convert("RGBA"), (0, 0), mask)
    # the square teal dot, sitting on the glyph's baseline (bottom-aligned)
    dx, dby = ox + tb[2] + gap, oy + tb[3]
    ImageDraw.Draw(canvas).rectangle([dx, dby - dot, dx + dot, dby], fill=DOT)
    out = canvas.resize((px, px), Image.LANCZOS)
    return out.convert("RGB") if bg else out


def write(img, *paths, **kw):
    for p in paths:
        full = os.path.join(ROOT, p)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        img.save(full, **kw)
        print("wrote", p)


web = ["apps/admin/src/app", "munaxademo/src/app", "munaxalanding/src/app"]
write(monogram(512, 0.60), *[f"{d}/icon.png" for d in web])
write(monogram(180, 0.56, bg=INK), *[f"{d}/apple-icon.png" for d in web])
write(monogram(256, 0.66), *[f"{d}/favicon.ico" for d in web],
      sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])

write(monogram(1024, 0.52, bg=INK), "apps/mobile/assets/icon/ic_launcher.png")
write(monogram(1024, 0.60), "apps/mobile/assets/icon/ic_launcher_foreground.png")
