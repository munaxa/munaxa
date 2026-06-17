'use client';

import { useCallback, useState } from 'react';
import { cn } from '@munaxa/ui';
import { Shell } from '@/components/shell';
import { timetableApi, type ResolvedDay } from '@/lib/timetable';
import { EntityPicker } from '@/components/entity-picker';
import { useToast } from '@/components/toast';
import { useI18n } from '@/components/i18n-provider';
import { loadSectionOptions } from '@/lib/pickers';
import { Badge, Button, Card, CardContent, Field, Input } from '@/components/ui';

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: 'text-foreground',
  CANCELLED: 'text-destructive line-through',
  SUBSTITUTED: 'text-aqua',
  REPLACED: 'text-coral',
};

// Jordan school week: Sunday → Thursday.
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'];

/** The Sunday on/just-before the given date, then the 5 working days. */
function weekDates(anchorIso: string): string[] {
  const d = new Date(`${anchorIso}T00:00:00Z`);
  const sunday = new Date(d);
  sunday.setUTCDate(d.getUTCDate() - d.getUTCDay()); // getUTCDay: Sun=0
  return WEEKDAYS.map((_, i) => {
    const x = new Date(sunday);
    x.setUTCDate(sunday.getUTCDate() + i);
    return x.toISOString().slice(0, 10);
  });
}

export default function TimetablePage() {
  const toast = useToast();
  const { t } = useI18n();
  const [sectionId, setSectionId] = useState('');
  const [anchor, setAnchor] = useState(new Date().toISOString().slice(0, 10));
  const [days, setDays] = useState<{ date: string; day: ResolvedDay }[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!sectionId) return;
    setLoading(true);
    try {
      const dates = weekDates(anchor);
      const resolved = await Promise.all(dates.map((date) => timetableApi.day(sectionId, date)));
      setDays(dates.map((date, i) => ({ date, day: resolved[i]! })));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to resolve timetable');
    } finally {
      setLoading(false);
    }
  }, [sectionId, anchor, toast]);

  // Union of period rows across the week (index → times from the first day that has it).
  const periodRows = (() => {
    if (!days) return [];
    const map = new Map<number, { startTime: string; endTime: string }>();
    for (const { day } of days) {
      for (const p of day.periods) {
        if (!map.has(p.periodIndex)) {
          map.set(p.periodIndex, { startTime: p.startTime, endTime: p.endTime });
        }
      }
    }
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([periodIndex, times]) => ({ periodIndex, ...times }));
  })();

  const dayNames = [
    t('timetable.sun'),
    t('timetable.mon'),
    t('timetable.tue'),
    t('timetable.wed'),
    t('timetable.thu'),
  ];

  return (
    <Shell>
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="font-display text-2xl font-semibold">{t('nav.timetable')}</h1>

        <div className="flex flex-wrap items-end gap-2">
          <Field label={t('timetable.section')} className="flex-1">
            <EntityPicker
              value={sectionId}
              onChange={setSectionId}
              load={loadSectionOptions}
              placeholder={t('timetable.searchSections')}
            />
          </Field>
          <Field label={t('timetable.weekOf')}>
            <Input type="date" value={anchor} onChange={(e) => setAnchor(e.target.value)} />
          </Field>
          <Button onClick={() => void load()} disabled={!sectionId || loading}>
            {loading ? t('common.loading') : t('timetable.loadWeek')}
          </Button>
        </div>

        {days ? (
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-border p-2 text-start font-mono text-[10px] uppercase text-muted-foreground">
                      {t('timetable.period')}
                    </th>
                    {days.map(({ date, day }, i) => (
                      <th
                        key={date}
                        className="border-b border-border p-2 text-start font-display text-xs font-semibold"
                      >
                        {dayNames[i]}
                        <span className="block font-mono text-[10px] font-normal text-muted-foreground">
                          {date.slice(5)}
                          {day.isHoliday ? ` · ${t('timetable.holidaySuffix')}` : ''}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {periodRows.map((row) => (
                    <tr key={row.periodIndex}>
                      <td className="whitespace-nowrap border-b border-border p-2 align-top font-mono text-[11px] text-muted-foreground">
                        P{row.periodIndex}
                        <span className="block">
                          {row.startTime}–{row.endTime}
                        </span>
                      </td>
                      {days.map(({ date, day }) => {
                        const p = day.periods.find((x) => x.periodIndex === row.periodIndex);
                        return (
                          <td key={date} className="border-b border-border p-2 align-top">
                            {day.isHoliday ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : p ? (
                              <span className={cn('text-xs font-medium', STATUS_COLOR[p.status])}>
                                {p.subject}
                                {p.status !== 'SCHEDULED' ? (
                                  <span className="block font-mono text-[10px] opacity-80">
                                    {p.status}
                                  </span>
                                ) : null}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">·</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {periodRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={WEEKDAYS.length + 1}
                        className="p-3 text-sm text-muted-foreground"
                      >
                        {t('timetable.noClasses')}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">{t('timetable.emptyHint')}</p>
        )}

        {days ? (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge tone="muted">{days[0]?.day.scheduleType}</Badge>
            <span className="text-muted-foreground">{t('timetable.legend')}</span>
          </div>
        ) : null}
      </div>
    </Shell>
  );
}
