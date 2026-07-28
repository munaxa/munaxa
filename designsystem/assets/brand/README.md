# Brand

Per-product brand guidance. A *brand* in this system is three things, and only the third lives
as prose:

1. **The palette** — `themes/<product>/palette.css`. Complete values for the theme contract.
2. **The raw hexes and logos** — `themes/<product>/brand.ts` and `assets/logos/<product>/`.
3. **Usage rules** — this folder.

## Munaxa

- Brand hue: teal (`#007595`), light `#00B8DB`, deep `#005066`.
- Lockups: [`../logos/munaxa/`](../logos/munaxa).
- Clear space: at least the height of the symbol on every side of a lockup.
- Never recolour a lockup. The symbol may be rendered in a single flat colour (brand, white, or
  ink) when the full lockup does not fit.
- On screen, never hardcode the brand hex — use `bg-primary` / `text-primary`, which follow the
  active theme and both colour schemes. The hexes above exist for surfaces with no CSS at all
  (email, favicons, OG images).

## Workaxa · Inkaxa

Palettes and hexes are authored (`themes/workaxa`, `themes/inkaxa`); logo artwork has not been
produced yet. Add it under `assets/logos/<product>/` and extend this file when it lands.
