'use client';

import { useCallback, useEffect, useState } from 'react';
import { cn } from '@munaxa/ui';
import { Shell } from '@/components/shell';
import { useI18n } from '@/components/i18n-provider';
import { communicationApi, type Announcement } from '@/lib/communication';
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

const AUDIENCES = ['ALL', 'PARENTS', 'TEACHERS', 'STUDENTS'];

export default function CommunicationPage() {
  const { t } = useI18n();
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
    void load();
  }, [load]);

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
    <Shell>
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="font-display text-2xl font-semibold">{t('nav.communication')}</h1>

        <Card>
          <CardHeader>
            <CardTitle>New announcement</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void publish(e)} className="space-y-3">
              <Field label="Title">
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </Field>
              <Field label="Body">
                <textarea
                  className={cn(
                    'h-24 w-full rounded-lg border border-input bg-background/60 px-3 py-2 text-sm',
                    'outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40',
                  )}
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  required
                />
              </Field>
              <div className="flex items-end gap-2">
                <Field label="Audience" className="flex-1">
                  <Select
                    value={form.audience}
                    onChange={(e) => setForm({ ...form, audience: e.target.value })}
                  >
                    {AUDIENCES.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Button type="submit">Publish</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 pt-6">
            <span className="font-medium">WhatsApp bridge</span>
            <Button size="sm" onClick={() => void toggleWhatsApp(true)}>
              Enable
            </Button>
            <Button size="sm" variant="outline" onClick={() => void toggleWhatsApp(false)}>
              Disable
            </Button>
          </CardContent>
        </Card>

        {message ? <p className="text-sm text-aqua">{message}</p> : null}
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <Table>
          <THead>
            <TR>
              <TH>Announcement</TH>
              <TH className="text-end">Audience</TH>
            </TR>
          </THead>
          <TBody>
            {list.map((a) => (
              <TR key={a.id}>
                <TD>{a.title}</TD>
                <TD className="text-end">
                  <Badge tone="muted">{a.audience}</Badge>
                </TD>
              </TR>
            ))}
            {list.length === 0 ? (
              <TR>
                <TD colSpan={2} className="text-muted-foreground">
                  No announcements yet.
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </div>
    </Shell>
  );
}
