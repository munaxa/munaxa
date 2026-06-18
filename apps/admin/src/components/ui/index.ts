/**
 * The Admin Portal consumes the canonical Munaxa component layer from `@munaxa/ui`.
 * This barrel re-exports it so existing `@/components/ui` imports keep working; new code
 * may import from either path. Primitives (Button, Card, Dialog, Tabs, …) now live in
 * packages/ui/src/components — there are no app-local primitive implementations.
 */
export * from '@munaxa/ui';
