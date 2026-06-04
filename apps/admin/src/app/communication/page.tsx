'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@munaxa/ui';
import { tokenStore } from '@/lib/auth';
import { communicationApi, type Announcement } from '@/lib/communication';

const AUDIENCES = ['ALL', 'PARENTS', 'TEACHERS', 'STUDENTS'];

export default function CommunicationPage() {
  const router = useRouter();
  const [list, setList] = useState<Announcement[]>([]);
  const [form, setForm] = useState({ title: '', body: '', audience: 'ALL' });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setList(await communicationApi.listAnnouncements());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  }, []);

  useEffect(() => {
    if (!tokenStore.access) {
      router.replace('/login');
      return;
    }
    void load();
  }, [router, load]);

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await communicationApi.publish(form);
      setMessage(`Published to ${res.recipients} recipient(s).`);
      setForm({ title: '', body: '', audience: 'ALL' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  async function toggleWhatsApp(enabled: boolean) {
    try {
      await communicationApi.setFlag('whatsapp_bridge', enabled);
      setMessage(`WhatsApp bridge ${enabled ? 'enabled' : 'disabled'}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8">
      <h1 className="font-display text-2xl font-semibold">Communication</h1>

      <form
        onSubmit={(e) => void publish(e)}
        className="space-y-2 rounded-xl border border-border p-4"
      >
        <h2 className="font-medium">New announcement</h2>
        <input
          className={cn(inputClass, 'w-full')}
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
        <textarea
          className={cn(inputClass, 'h-20 w-full')}
          placeholder="Body"
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          required
        />
        <div className="flex gap-2">
          <select
            className={inputClass}
            value={form.audience}
            onChange={(e) => setForm({ ...form, audience: e.target.value })}
          >
            {AUDIENCES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <button type="submit" className={btnClass}>
            Publish
          </button>
        </div>
      </form>

      <div className="flex items-center gap-3 rounded-xl border border-border p-4">
        <span className="font-medium">WhatsApp bridge</span>
        <button className={btnClass} onClick={() => void toggleWhatsApp(true)}>
          Enable
        </button>
        <button
          className="rounded-lg border border-border px-3 py-2 text-sm"
          onClick={() => void toggleWhatsApp(false)}
        >
          Disable
        </button>
      </div>

      {message ? <p className="text-sm text-aqua">{message}</p> : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="divide-y divide-border rounded-xl border border-border">
        {list.map((a) => (
          <li key={a.id} className="flex justify-between p-3 text-sm">
            <span>{a.title}</span>
            <span className="font-mono text-xs text-muted-foreground">{a.audience}</span>
          </li>
        ))}
        {list.length === 0 ? (
          <li className="p-3 text-sm text-muted-foreground">No announcements yet.</li>
        ) : null}
      </ul>
    </main>
  );
}

const inputClass = cn(
  'rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none',
  'focus:ring-2 focus:ring-ring',
);
const btnClass = 'rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground';
