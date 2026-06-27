#!/usr/bin/env node
/**
 * sync-theme — generate the Tailwind-v3 (hsl) theme from the canonical oklch palette.
 *
 * `packages/design-tokens/css/theme.oklch.css` is THE single source of truth for the Munaxa
 * palette (the Tailwind-v4 design-system site @imports it directly). This script parses its
 * `:root`/`.dark` blocks, gamut-maps each color to sRGB and emits
 * `packages/design-tokens/css/theme.css` as "H S% L%" channels that the Tailwind-v3 apps consume
 * via the preset's `hsl(var(--token))` bridge. So one edit to theme.oklch.css re-themes the DS
 * site AND (after sync) Admin, Landing, Demo and every @munaxa/ui component.
 *
 *   pnpm sync:theme          # regenerate theme.css from theme.oklch.css
 *   pnpm sync:theme:check    # CI: fail if theme.css has drifted from theme.oklch.css
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { converter, parse, clampChroma } from 'culori';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(repoRoot, 'packages/design-tokens/css/theme.oklch.css');
const OUT = resolve(repoRoot, 'packages/design-tokens/css/theme.css');
const check = process.argv.includes('--check');

// The palette variables the apps consume (DS var name -> app var name; identity here).
const NEEDED = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'destructive-foreground',
  'coral',
  'aqua',
  'border',
  'input',
  'ring',
  'success',
  'warning',
  'info',
];

const toHsl = converter('hsl');
function triplet(value) {
  const parsed = parse(value);
  if (!parsed) return null;
  const mapped = clampChroma(parsed, parsed.mode || 'oklch', 'rgb');
  const c = toHsl(mapped);
  let h = Math.round((c.h || 0) * 10) / 10;
  let s = Math.round((c.s || 0) * 1000) / 10;
  const l = Math.round((c.l || 0) * 1000) / 10;
  if (l >= 100 || l <= 0 || s <= 0) {
    h = 0;
    s = 0;
  }
  const base = `${h} ${s}% ${l}%`;
  const a = mapped.alpha ?? parsed.alpha;
  return a !== undefined && a < 1 ? `${base} / ${Math.round(a * 100)}%` : base;
}

function blockBody(css, selector) {
  const m = css.match(new RegExp(`${selector}\\s*\\{([\\s\\S]*?)\\n\\}`));
  if (!m) throw new Error(`Could not find ${selector} block in ${SRC}`);
  return m[1];
}
function vars(body) {
  const out = {};
  for (const m of body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

const css = readFileSync(SRC, 'utf8');
const light = vars(blockBody(css, ':root'));
const dark = vars(blockBody(css, '\\.dark'));

function render(name, map) {
  const lines = NEEDED.map((k) => {
    const raw = map[k];
    if (!raw) throw new Error(`munaxadesignsystem is missing --${k} in ${name}`);
    const t = triplet(raw);
    if (!t) throw new Error(`Could not convert --${k}: ${raw}`);
    return `  --${k}: ${t}; /* ${raw} */`;
  }).join('\n');
  return `${name} {\n${lines}\n}`;
}

const header = `/**
 * @munaxa/design-tokens — Tailwind-v3 theme (hsl). GENERATED — DO NOT EDIT BY HAND.
 *
 * Single source of truth: packages/design-tokens/css/theme.oklch.css.
 * Regenerate with:  pnpm sync:theme   (CI guards drift via pnpm sync:theme:check)
 *
 * The full Munaxa Design System palette (neutral surfaces, teal primary, theme-aware accents)
 * for light (:root) and dark (.dark), as sRGB-mapped HSL channels consumed via the preset's
 * \`hsl(var(--token))\` bridge. Every Tailwind-v3 app imports this file; editing theme.oklch.css
 * and re-running \`pnpm sync:theme\` re-themes Admin, Landing, Demo and every @munaxa/ui component.
 */
`;
const content = `${header}\n${render(':root', light)}\n\n${render('.dark', dark)}\n`;

const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : null;
if (current === content) {
  console.log('✓ theme.css is in sync with theme.oklch.css');
} else if (check) {
  console.error('✗ theme.css has drifted from theme.oklch.css. Run `pnpm sync:theme` and commit.');
  process.exit(1);
} else {
  writeFileSync(OUT, content);
  console.log(`↻ wrote ${OUT} from ${SRC}`);
}
