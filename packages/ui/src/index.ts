/**
 * @munaxa/ui — the single, canonical component library for the Munaxa platform.
 *
 * Every application (Admin, Landing, Demo, future portals) and the design system website
 * import components from this package root only:
 *
 *   import { Button, Card } from "@munaxa/ui";
 *
 * Never deep-import internal paths. Components are organized internally by category
 * (primitives / forms / feedback / navigation / layout / data-display / patterns); the
 * public surface is this flat barrel, so the internal taxonomy can evolve without breaking
 * consumers.
 */

// Helpers
export { cn } from './lib/index.js';

// Components — grouped by internal category, surfaced flat.
export * from './components/primitives/index.js';
export * from './components/forms/index.js';
export * from './components/feedback/index.js';
export * from './components/navigation/index.js';
export * from './components/layout/index.js';
export * from './components/data-display/index.js';
export * from './components/patterns/index.js';

// Design tokens — convenience namespace. The canonical import path remains
// `@munaxa/design-tokens`; this mirror lets consumers read tokens via the UI package.
export * as tokens from './tokens/index.js';
