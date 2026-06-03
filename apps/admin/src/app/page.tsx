import { cn } from '@munaxa/ui';

/**
 * Foundation placeholder home page. Real authenticated dashboard shells arrive in Phase 3+.
 */
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="flex items-center gap-3">
        <span className="font-display text-4xl font-semibold tracking-tight">Munaxa</span>
        <span className="font-mono text-xs text-muted-foreground">School OS</span>
      </div>
      <p className="max-w-md text-center text-muted-foreground">
        Multi-tenant School Operating System. Admin Portal foundation is ready — feature modules are
        delivered phase by phase.
      </p>
      <div
        className={cn(
          'rounded-lg border border-border bg-card px-4 py-2',
          'font-mono text-xs text-muted-foreground',
        )}
      >
        Phase 1 — Foundation Setup ✓
      </div>
    </main>
  );
}
