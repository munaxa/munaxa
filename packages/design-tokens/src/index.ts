/**
 * @munaxa/design-tokens — the single source of truth for every Munaxa design token.
 *
 * Changing a value here propagates to:
 *   - @munaxa/config-tailwind (the shared Tailwind preset) → every app using it
 *   - @munaxa/ui components
 *   - any app importing tokens directly
 *
 * No application should hardcode a color, spacing, radius, shadow, z-index or breakpoint.
 */
export { colors, type Colors } from './colors.js';
export { typography, type Typography } from './typography.js';
export { spacing, type Spacing, type SpacingToken } from './spacing.js';
export { radius, type Radius } from './radius.js';
export { elevation, type Elevation } from './elevation.js';
export { border, type Border } from './border.js';
export { motion, type Motion } from './motion.js';
export { transitions, type Transitions } from './transitions.js';
export { zIndex, type ZIndex, type ZIndexToken } from './z-index.js';
export { breakpoints, type Breakpoints, type BreakpointToken } from './breakpoints.js';

import { colors } from './colors.js';
import { typography } from './typography.js';
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
  colors,
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
