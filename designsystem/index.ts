/**
 * @axa/design-system — the single, canonical UI layer for every AXA product.
 *
 * Applications import from the package root:
 *
 *   import { Button, Card, cn } from '@axa/design-system';
 *
 * Never deep-import an internal file path. Components are organised internally by category
 * (primitives / forms / feedback / navigation / layout / data-display) with composite
 * `patterns` and page-level `templates` kept separate; the public surface is this flat
 * barrel, so the internal taxonomy can evolve without breaking consumers.
 *
 * Narrower entry points exist for consumers that want only part of the system:
 *   `@axa/design-system/tokens`      typed design tokens
 *   `@axa/design-system/typography`  the type scale
 *   `@axa/design-system/themes`      the typed product-theme registry
 *   `@axa/design-system/icons`       the shared icon set
 *   `@axa/design-system/hooks`       UI hooks
 *   `@axa/design-system/patterns`    composite patterns
 *
 * The CSS side is consumed through the theme entry points, e.g.
 *   `@import '@axa/design-system/css/themes/munaxa';`
 */

// Helpers
export { cn } from './lib/index.js';

// Hooks
export * from './hooks/index.js';

// Components — grouped by internal category, surfaced flat.
export * from './components/primitives/index.js';
export * from './components/forms/index.js';
export * from './components/feedback/index.js';
export * from './components/navigation/index.js';
export * from './components/layout/index.js';
export * from './components/data-display/index.js';

// Composite patterns built on top of the components.
export * from './patterns/index.js';

// Product themes — the typed registry of the themes shipped as CSS under `themes/`.
export { themes, type Theme, type ThemeId, type Brand } from './themes/index.js';

// Design tokens — convenience namespace. The canonical import path remains
// `@axa/design-system/tokens`; this mirror lets consumers read tokens from the root.
export * as tokens from './tokens/index.js';
