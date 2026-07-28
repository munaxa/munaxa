/**
 * Design tokens — the single source of truth for every value in the AXA design system.
 *
 * These typed tokens are the reference for design tooling and documentation. The *runtime*
 * palette is authored as CSS custom properties under `themes/` and exposed to applications
 * through the Tailwind v4 theme contract (`themes/base.css`), which every component and every
 * product application consumes.
 *
 * No application may hardcode a color, spacing, radius, shadow, z-index or breakpoint.
 */
export { typography, type Typography } from '../typography/index.js';
export { spacing, type Spacing, type SpacingToken } from './spacing.js';
export { radius, type Radius } from './radius.js';
export { elevation, type Elevation } from './elevation.js';
export { border, type Border } from './border.js';
export { motion, type Motion } from './motion.js';
export { transitions, type Transitions } from './transitions.js';
export { zIndex, type ZIndex, type ZIndexToken } from './z-index.js';
export { breakpoints, type Breakpoints, type BreakpointToken } from './breakpoints.js';

import { typography } from '../typography/index.js';
import { spacing } from './spacing.js';
import { radius } from './radius.js';
import { elevation } from './elevation.js';
import { border } from './border.js';
import { motion } from './motion.js';
import { transitions } from './transitions.js';
import { zIndex } from './z-index.js';
import { breakpoints } from './breakpoints.js';

/** The complete token set as a single object, for tooling and documentation. */
export const tokens = {
  typography,
  spacing,
  radius,
  elevation,
  border,
  motion,
  transitions,
  zIndex,
  breakpoints,
} as const;

export type Tokens = typeof tokens;
