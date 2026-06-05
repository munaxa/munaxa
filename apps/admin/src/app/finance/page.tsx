'use client';

import { useState } from 'react';
import { cn } from '@munaxa/ui';
import { Shell } from '@/components/shell';
import { financeApi, type Statement } from '@/lib/finance';

export default function FinancePage() {
  const [studentId, setStudentId] = useState('');
  const [statement, setStatement] = useState<Statement | null>(null);
  const [charge, setCharge] = useState({ description: '', amount: '' });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setStatement(await financeApi.statement(studentId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  }

  async function addCharge(e: React.FormEvent) {
    e.preventDefault();
    try {
      await financeApi.createCharge({
        studentId,
        description: charge.description,
        amount: Number(charge.amount),
      });
      setCharge({ description: '', amount: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  async function act(id: string, action: 'verify' | 'reject') {
    try {
      await (action === 'verify' ? financeApi.verify(id) : financeApi.reject(id));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  return (
    <Shell>
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="font-display text-2xl font-semibold">Finance</h1>
        <div className="flex gap-2">
          <input
            className={inputClass}
            placeholder="Student ID"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          />
          <button className={btnClass} onClick={() => void load()}>
            Load statement
          </button>
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {statement ? (
          <>
            <div className="flex gap-3">
              {(['charged', 'paid', 'outstanding'] as const).map((k) => (
                <div key={k} className="flex-1 rounded-xl border border-border p-3 text-center">
                  <div className="font-display text-xl">{statement.totals[k]}</div>
                  <div className="font-mono text-xs uppercase text-muted-foreground">{k}</div>
                </div>
              ))}
            </div>

            <form onSubmit={(e) => void addCharge(e)} className="flex flex-wrap gap-2">
              <input
                className={inputClass}
                placeholder="Charge description"
                value={charge.description}
                onChange={(e) => setCharge({ ...charge, description: e.target.value })}
                required
              />
              <input
                className={inputClass}
                type="number"
                step="0.001"
                placeholder="Amount (JOD)"
                value={charge.amount}
                onChange={(e) => setCharge({ ...charge, amount: e.target.value })}
                required
              />
              <button type="submit" className={btnClass}>
                Add charge
              </button>
            </form>

            <section>
              <h2 className="mb-2 font-medium">Transactions</h2>
              <ul className="divide-y divide-border rounded-xl border border-border">
                {statement.transactions.map((t) => (
                  <li key={t.id} className="flex items-center justify-between p-3 text-sm">
                    <span>
                      {t.amount} JOD · {t.method} · {t.status}
                    </span>
                    {t.status === 'PENDING' ? (
                      <span className="flex gap-2">
                        <button
                          className="text-xs text-aqua"
                          onClick={() => void act(t.id, 'verify')}
                        >
                          Verify
                        </button>
                        <button
                          className="text-xs text-destructive"
                          onClick={() => void act(t.id, 'reject')}
                        >
                          Reject
                        </button>
                      </span>
                    ) : null}
                  </li>
                ))}
                {statement.transactions.length === 0 ? (
                  <li className="p-3 text-sm text-muted-foreground">No transactions.</li>
                ) : null}
              </ul>
            </section>
          </>
        ) : null}
      </div>
    </Shell>
  );
}

const inputClass = cn(
  'rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none',
  'focus:ring-2 focus:ring-ring',
);
const btnClass = 'rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground';
