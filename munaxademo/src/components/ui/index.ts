/**
 * The Demo Portal consumes the canonical Munaxa component layer from `@munaxa/ui`.
 * This barrel re-exports it so existing `@/components/ui` imports keep working unchanged;
 * there are no demo-local primitive implementations anymore (single source of truth).
 */
export * from '@munaxa/ui';
