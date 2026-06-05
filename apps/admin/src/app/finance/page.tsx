'use client';

import { useState } from 'react';
import { Shell } from '@/components/shell';
import { financeApi, type Statement } from '@/lib/finance';
import { EntityPicker } from '@/components/entity-picker';
import { useToast } from '@/components/toast';
import { useI18n } from '@/components/i18n-provider';
import { loadStudentOptions } from '@/lib/pickers';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Field,
  Input,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/components/ui';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'muted'> = {
  VERIFIED: 'success',
  PENDING: 'warning',
  REJECTED: 'danger',
};

export default function FinancePage() {
  const toast = useToast();
  const { t } = useI18n();
  const [studentId, setStudentId] = useState('');
  const [statement, setStatement] = useState<Statement | null>(null);
  const [charge, setCharge] = useState({ description: '', amount: '' });

  async function load() {
    if (!studentId) return;
    try {
      setStatement(await financeApi.statement(studentId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load statement');
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
      toast.success('Charge added');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add charge');
    }
  }

  async function act(id: string, action: 'verify' | 'reject') {
    try {
      await (action === 'verify' ? financeApi.verify(id) : financeApi.reject(id));
      toast.success(`Transaction ${action === 'verify' ? 'verified' : 'rejected'}`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  }

  return (
    <Shell>
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="font-display text-2xl font-semibold">{t('nav.finance')}</h1>

        <div className="flex items-end gap-2">
          <Field label="Student" className="flex-1">
            <EntityPicker
              value={studentId}
              onChange={setStudentId}
              load={loadStudentOptions}
              placeholder="Search students…"
            />
          </Field>
          <Button onClick={() => void load()}>Load statement</Button>
        </div>

        {statement ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              {(['charged', 'paid', 'outstanding'] as const).map((k) => (
                <Card key={k}>
                  <CardContent className="p-4 text-center">
                    <div className="font-display text-2xl">{statement.totals[k]}</div>
                    <div className="font-mono text-xs uppercase text-muted-foreground">{k}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardContent className="pt-6">
                <form
                  onSubmit={(e) => void addCharge(e)}
                  className="flex flex-wrap items-end gap-2"
                >
                  <Field label="Charge description" className="flex-1">
                    <Input
                      placeholder="Term fee"
                      value={charge.description}
                      onChange={(e) => setCharge({ ...charge, description: e.target.value })}
                      required
                    />
                  </Field>
                  <Field label="Amount (JOD)">
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="0.000"
                      value={charge.amount}
                      onChange={(e) => setCharge({ ...charge, amount: e.target.value })}
                      required
                    />
                  </Field>
                  <Button type="submit">Add charge</Button>
                </form>
              </CardContent>
            </Card>

            <section className="space-y-2">
              <h2 className="font-display font-medium">Transactions</h2>
              <Table>
                <THead>
                  <TR>
                    <TH>Amount</TH>
                    <TH>Method</TH>
                    <TH>Status</TH>
                    <TH className="text-end">Actions</TH>
                  </TR>
                </THead>
                <TBody>
                  {statement.transactions.map((t) => (
                    <TR key={t.id}>
                      <TD>{t.amount} JOD</TD>
                      <TD>{t.method}</TD>
                      <TD>
                        <Badge tone={STATUS_TONE[t.status] ?? 'muted'}>{t.status}</Badge>
                      </TD>
                      <TD className="text-end">
                        {t.status === 'PENDING' ? (
                          <span className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => void act(t.id, 'verify')}
                            >
                              Verify
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => void act(t.id, 'reject')}
                            >
                              Reject
                            </Button>
                          </span>
                        ) : null}
                      </TD>
                    </TR>
                  ))}
                  {statement.transactions.length === 0 ? (
                    <TR>
                      <TD colSpan={4} className="text-muted-foreground">
                        No transactions.
                      </TD>
                    </TR>
                  ) : null}
                </TBody>
              </Table>
            </section>
          </>
        ) : null}
      </div>
    </Shell>
  );
}
