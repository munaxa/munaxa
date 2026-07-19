#!/usr/bin/env python3
"""Generate the Munaxa *minimized* logo — lowercase "m" + the square teal brand dot — as the
square app icons and favicons.

The full open-book + graduation-cap mark (docs/design-system/logo.png) is used inline where
there's room (headers, login). Tab/app icons are small, so they use the minimized "m." monogram
instead: the "m" in the wordmark's letter colour (ink on light, white on the ink-background
icons) followed by the square teal dot, matching the on-page munaxa wordmark exactly.

Writes (transparent unless noted):
  Web — each Next app's src/app/ (admin, demo, landing):
    favicon.ico   (16/32/48/64, ink "m")
    icon.png      (512, ink "m")
    apple-icon.png (180, opaque on brand ink #090B0C, white "m" — iOS ignores transparency)
  Mobile launcher sources (apps/mobile/assets/icon/):
    ic_launcher.png            (1024, opaque on ink, white "m") — iOS + legacy Android
    ic_launcher_foreground.png (1024, transparent, white "m")   — Android adaptive foreground

Usage:  python3 scripts/gen-icons.py   (requires Pillow; reads the vendored woff2 directly)
Then wire mobile icons with:  cd apps/mobile && dart run flutter_launcher_icons
"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = os.path.join(ROOT, "apps/admin/src/fonts/IBMPlexSans-latin.woff2")

INK = (9, 11, 12, 255)        # brand ink-900 #090B0C - opaque icon background
INK_M = (0x11, 0x18, 0x1C)    # wordmark letter colour (near-black) - the "m" on light surfaces
WHITE_M = (0xFF, 0xFF, 0xFF)  # the "m" on ink-background icons (wordmark's colour on dark)
DOT = (0x00, 0x75, 0x95, 255)  # primary teal #007595 - the square brand dot


def monogram(px, fill_frac=0.66, m_color=INK_M, bg=None):
    """Render the 'm.' monogram on a px x px canvas (4x supersampled). The "m" uses `m_color`
    (matching the wordmark's letters) and the dot is the fixed teal square. fill_frac is the
    glyph height as a fraction of the canvas; bg=None -> transparent, else an opaque RGB tuple."""
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
    # the 'm', in the wordmark letter colour
    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).text((ox, oy), "m", font=font, fill=255,
                              stroke_width=stroke, stroke_fill=255)
    canvas.paste(Image.new("RGBA", (s, s), m_color + (255,)), (0, 0), mask)
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
# Transparent tab/PWA icons use the ink "m" (light contexts); the opaque ink-background icons
# use the white "m" so it stays legible - mirroring the theme-aware wordmark.
write(monogram(512, 0.60), *[f"{d}/icon.png" for d in web])
write(monogram(180, 0.56, m_color=WHITE_M, bg=INK), *[f"{d}/apple-icon.png" for d in web])
write(monogram(256, 0.66), *[f"{d}/favicon.ico" for d in web],
      sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])

write(monogram(1024, 0.52, m_color=WHITE_M, bg=INK), "apps/mobile/assets/icon/ic_launcher.png")
# Android adaptive foreground is composited on the ink adaptive background -> white "m".
write(monogram(1024, 0.60, m_color=WHITE_M), "apps/mobile/assets/icon/ic_launcher_foreground.png")
