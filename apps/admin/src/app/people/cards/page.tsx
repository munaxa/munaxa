'use client';

import { useCallback, useState } from 'react';
import { Shell } from '@/components/shell';
import { EntityPicker } from '@/components/entity-picker';
import { useToast } from '@/components/toast';
import { loadStudentOptions } from '@/lib/pickers';
import { cardsApi, type CardStatus, type CardType, type StudentCard } from '@/lib/cards';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/components/ui';

const STATUS_TONE: Record<CardStatus, 'success' | 'warning' | 'danger' | 'muted'> = {
  ACTIVE: 'success',
  SUSPENDED: 'warning',
  STOLEN: 'danger',
  LOST: 'danger',
  REVOKED: 'muted',
};
const STATUSES: CardStatus[] = ['ACTIVE', 'SUSPENDED', 'STOLEN', 'LOST', 'REVOKED'];

export default function StudentCardsPage() {
  const toast = useToast();
  const [studentId, setStudentId] = useState('');
  const [cards, setCards] = useState<StudentCard[]>([]);
  const [form, setForm] = useState<{ cardUid: string; type: CardType; label: string }>({
    cardUid: '',
    type: 'NFC',
    label: '',
  });

  const load = useCallback(
    async (id = studentId) => {
      if (!id) return;
      try {
        setCards(await cardsApi.list(id));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to load');
      }
    },
    [studentId, toast],
  );

  async function run(fn: () => Promise<unknown>, ok: string) {
    try {
      await fn();
      toast.success(ok);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Action failed');
    }
  }

  return (
    <Shell>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Student cards</h1>
          <p className="text-sm text-muted-foreground">
            NFC / RFID cards used for gate, reception and bus identification. Suspended, stolen,
            lost or revoked cards stop working immediately.
          </p>
        </div>

        <div className="flex items-end gap-2">
          <Field label="Student" className="flex-1">
            <EntityPicker
              value={studentId}
              onChange={(v) => {
                setStudentId(v);
                void load(v);
              }}
              load={loadStudentOptions}
              placeholder="Search by student / father / family name…"
            />
          </Field>
        </div>

        {studentId ? (
          <Card>
            <CardHeader>
              <CardTitle>Cards</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <THead>
                  <TR>
                    <TH>Card UID</TH>
                    <TH>Type</TH>
                    <TH>Label</TH>
                    <TH>Status</TH>
                    <TH className="text-end">Actions</TH>
                  </TR>
                </THead>
                <TBody>
                  {cards.map((c) => (
                    <TR key={c.id}>
                      <TD className="font-mono text-xs">{c.cardUid}</TD>
                      <TD>{c.type}</TD>
                      <TD className="text-muted-foreground">{c.label ?? '—'}</TD>
                      <TD>
                        <Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge>
                      </TD>
                      <TD className="text-end">
                        <span className="flex items-center justify-end gap-2">
                          <Select
                            value={c.status}
                            onChange={(e) =>
                              void run(
                                () =>
                                  cardsApi.update(c.id, { status: e.target.value as CardStatus }),
                                'Card updated',
                              )
                            }
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </Select>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => void run(() => cardsApi.remove(c.id), 'Card deleted')}
                          >
                            Delete
                          </Button>
                        </span>
                      </TD>
                    </TR>
                  ))}
                  {cards.length === 0 ? (
                    <TR>
                      <TD colSpan={5} className="text-muted-foreground">
                        No cards issued.
                      </TD>
                    </TR>
                  ) : null}
                </TBody>
              </Table>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(
                    () =>
                      cardsApi.issue({
                        studentId,
                        cardUid: form.cardUid.trim(),
                        type: form.type,
                        ...(form.label ? { label: form.label } : {}),
                      }),
                    'Card issued',
                  ).then(() => setForm({ cardUid: '', type: 'NFC', label: '' }));
                }}
                className="flex flex-wrap items-end gap-2"
              >
                <Field label="Card UID" className="flex-1">
                  <Input
                    placeholder="04:A2:39:B1:5C:80"
                    value={form.cardUid}
                    onChange={(e) => setForm({ ...form, cardUid: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Type">
                  <Select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as CardType })}
                  >
                    <option value="NFC">NFC</option>
                    <option value="RFID">RFID</option>
                  </Select>
                </Field>
                <Field label="Label">
                  <Input
                    placeholder="Blue lanyard"
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                  />
                </Field>
                <Button type="submit">Issue card</Button>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </Shell>
  );
}
