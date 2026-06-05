'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@munaxa/ui';
import { Input } from './ui';

export interface PickerOption {
  id: string;
  label: string;
  sublabel?: string;
}

/**
 * Searchable entity picker (combobox) backed by a list API. Loads options once; while options are
 * available it offers type-to-filter selection. If the list can't be loaded (e.g. the signed-in
 * role lacks the list permission), it gracefully falls back to a plain ID input so the flow still
 * works. Returns the selected entity id via `onChange`.
 */
export function EntityPicker({
  value,
  onChange,
  load,
  placeholder = 'Search…',
}: {
  value: string;
  onChange: (id: string) => void;
  load: () => Promise<PickerOption[]>;
  placeholder?: string;
}) {
  const [options, setOptions] = useState<PickerOption[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    load()
      .then((opts) => active && setOptions(opts))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [load]);

  const selected = useMemo(() => options?.find((o) => o.id === value) ?? null, [options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = options ?? [];
    if (!q) return list.slice(0, 50);
    return list
      .filter((o) => `${o.label} ${o.sublabel ?? ''}`.toLowerCase().includes(q))
      .slice(0, 50);
  }, [options, query]);

  // Fallback: manual id entry when the list isn't available.
  if (failed) {
    return (
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Paste ID" />
    );
  }

  const display = open ? query : (selected?.label ?? query);

  return (
    <div className="relative">
      <Input
        value={display}
        placeholder={options ? placeholder : 'Loading…'}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQuery('');
          setOpen(true);
        }}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 120);
        }}
      />
      {open && options ? (
        <ul
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-card p-1 shadow-card"
          onMouseDown={() => blurTimer.current && clearTimeout(blurTimer.current)}
        >
          {filtered.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(o.id);
                  setQuery('');
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full flex-col items-start rounded-md px-2 py-1.5 text-start text-sm',
                  o.id === value
                    ? 'bg-secondary/80 text-foreground'
                    : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground',
                )}
              >
                <span>{o.label}</span>
                {o.sublabel ? (
                  <span className="font-mono text-[10px] text-muted-foreground/70">
                    {o.sublabel}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
          {filtered.length === 0 ? (
            <li className="px-2 py-1.5 text-sm text-muted-foreground">No matches.</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
