# Assets

Binary and non-code brand material.

```
assets/
├── logos/<product>/   product logo lockups (PNG)
└── brand/             brand usage guidance
```

## `logos/`

One folder per product. Munaxa ships the full lockup set: primary, horizontal, stacked
wordmark, symbol, app icon and favicon. Applications reference these through their own
`public/` directory — the design system is the *source* of the artwork, not a runtime CDN.

## What is deliberately NOT here

There is no `assets/colors/`. Colour has exactly one source of truth — the theme palettes in
[`../themes/`](../themes) — and exporting a second, hand-maintained copy into `assets/` is how
palettes drift. Anything that needs a raw hex (email templates, OG images, favicons) reads it
from the typed registry instead:

```ts
import { themes } from '@axa/design-system/themes';
themes.munaxa.brand.color.DEFAULT; // '#007595'
```
