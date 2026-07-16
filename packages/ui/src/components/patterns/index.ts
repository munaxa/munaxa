/**
 * Composite patterns built from primitives (StatCard, Stepper, Progress, ReadinessRing, …).
 * Domain/composite components are migrated here from the apps and the design system over time
 * (see MIGRATION_REPORT.md).
 */
export { StatCard, type StatCardProps } from './stat-card.js';
export { Stepper, type StepperProps, type StepperStep } from './stepper.js';
export {
  Progress,
  type ProgressProps,
  ReadinessRing,
  type ReadinessRingProps,
} from './progress.js';
