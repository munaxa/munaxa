/**
 * Re-export the canonical Button from @munaxa/ui (single implementation).
 * Existing `@/components/ui/button` imports — incl. `buttonVariants` for `<a>` CTAs — keep working.
 */
export {
  Button,
  buttonVariants,
  type ButtonProps,
  type ButtonVariant,
  type ButtonSize,
} from '@munaxa/ui';
