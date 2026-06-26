#!/usr/bin/env node
/**
 * sync-design-tokens — propagate @munaxa/design-tokens into the standalone apps.
 *
 * The standalone Cloudflare apps (munaxalanding, munaxademo, munaxadesignsystem) are
 * independent pnpm roots with their own lockfiles, so they cannot import the private
 * workspace package `@munaxa/design-tokens` directly without changing their deploy model.
 *
 * This script bridges that gap: it runs inside the monorepo (where @munaxa/design-tokens is
 * built), reads the canonical token values, and writes a **committed, dependency-free**
 * `design-tokens.generated.ts` into each target app. The app's tailwind.config imports that
 * generated file instead of hardcoding values — so editing packages/design-tokens and
 * re-running `pnpm sync:tokens` reflows the standalone apps, with no per-app hand-editing and
 * no new runtime dependency.
 *
 * Run from the repo root:  pnpm sync:tokens
 * CI runs it with --check to fail if a target has drifted from the source of truth.
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');

// Import the built token package directly. It is a private workspace package not linked at the
// repo root, so resolve its compiled entry by path. Build it first: `pnpm --filter @munaxa/design-tokens build`.
const tokensEntry = resolve(repoRoot, 'packages/design-tokens/dist/index.js');
if (!existsSync(tokensEntry)) {
  console.error(
    `@munaxa/design-tokens is not built (${tokensEntry} missing).\n` +
      `Run: pnpm --filter @munaxa/design-tokens build`,
  );
  process.exit(1);
}
const { colors, radius, elevation, motion, zIndex, breakpoints } = await import(tokensEntry);

/** Apps that consume the generated token module (relative to repo root). */
const targets = ['munaxalanding/src/design-tokens.generated.ts'];

/**
 * The static, theme-independent token values the standalone Tailwind configs need.
 * Theme-aware colors (primary/border/coral/aqua/…) stay as CSS variables in each app's
 * globals.css — those are intentionally not generated here.
 */
function render() {
  const data = {
    brand: { DEFAULT: colors.brand.DEFAULT, light: colors.brand.light },
    ink: {
      900: colors.ink[900],
      800: colors.ink[800],
      700: colors.ink[700],
      600: colors.ink[600],
    },
    radius: {
      sm: radius.sm,
      md: radius.md,
      lg: radius.lg,
      xl: radius.xl,
      '2xl': radius['2xl'],
    },
    shadowFocus: elevation.focus,
    motion: { duration: motion.duration, easing: motion.easing },
    zIndex,
    breakpoints,
  };

  return `// AUTO-GENERATED — DO NOT EDIT BY HAND.
// Source of truth: packages/design-tokens (@munaxa/design-tokens).
// Regenerate with:  pnpm sync:tokens   (from the monorepo root)
//
// These are the static design tokens shared from the canonical token package into this
// standalone app. Theme-aware colors remain CSS variables in globals.css.
/* eslint-disable */

export const brand = ${JSON.stringify(data.brand, null, 2)} as const;

export const ink = ${JSON.stringify(data.ink, null, 2)} as const;

export const radius = ${JSON.stringify(data.radius, null, 2)} as const;

export const shadowFocus = ${JSON.stringify(data.shadowFocus)} as const;

export const motion = ${JSON.stringify(data.motion, null, 2)} as const;

export const zIndex = ${JSON.stringify(data.zIndex, null, 2)} as const;

export const breakpoints = ${JSON.stringify(data.breakpoints, null, 2)} as const;
`;
}

const content = render();
let drifted = [];

for (const rel of targets) {
  const path = resolve(repoRoot, rel);
  const current = existsSync(path) ? readFileSync(path, 'utf8') : null;
  if (current === content) {
    console.log(`✓ up to date: ${rel}`);
    continue;
  }
  if (check) {
    drifted.push(rel);
    console.error(`✗ drifted: ${rel}`);
  } else {
    writeFileSync(path, content);
    console.log(`↻ written: ${rel}`);
  }
}

if (check && drifted.length > 0) {
  console.error(
    `\nDesign-token drift detected in ${drifted.length} file(s). Run \`pnpm sync:tokens\` and commit.`,
  );
  process.exit(1);
}
