'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { useI18n } from './i18n-provider';
import { Button } from './ui/button';

interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm button as a destructive action (default: true). */
  destructive?: boolean;
}

type ConfirmFn = (opts?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Returns an async `confirm(opts)` that opens a modal and resolves to `true` only when the user
 * accepts. Use it to guard destructive actions: `if (!(await confirm({ description }))) return;`.
 */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within <ConfirmProvider>');
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setOpts(options ?? {});
    });
  }, []);

  const close = useCallback((result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setOpts(null);
  }, []);

  const destructive = opts?.destructive ?? true;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => close(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="font-display text-lg font-semibold">
              {opts.title ?? t('common.confirmTitle')}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {opts.description ?? t('common.confirmDeleteBody')}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => close(false)}>
                {opts.cancelLabel ?? t('common.cancel')}
              </Button>
              <Button
                variant={destructive ? 'destructive' : 'default'}
                size="sm"
                onClick={() => close(true)}
                autoFocus
              >
                {opts.confirmLabel ?? t('common.delete')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}
