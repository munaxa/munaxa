'use client';

import { useCallback, useEffect, useState } from 'react';
import { Shell } from '@/components/shell';
import { useToast } from '@/components/toast';
import {
  attendanceSettingsApi,
  type AttendanceSettings,
  type AttendanceSourceMode,
  type TransportMethod,
} from '@/lib/attendance-settings';
import { Card, CardContent, CardHeader, CardTitle, Field, Select, Spinner } from '@/components/ui';

const MODES: { value: AttendanceSourceMode; label: string; help: string }[] = [
  { value: 'TEACHER_ONLY', label: 'Teacher only', help: 'Only teachers mark attendance.' },
  { value: 'GATE_ARRIVAL', label: 'Gate arrival', help: 'A gate entry auto-marks Present.' },
  {
    value: 'BUS_ARRIVAL',
    label: 'Bus arrival',
    help: 'Arrival at school (bus) auto-marks Present.',
  },
  { value: 'HYBRID', label: 'Hybrid', help: 'Either a gate entry or bus arrival marks Present.' },
];
const BUS_METHODS: TransportMethod[] = ['NFC', 'RFID', 'QR', 'MANUAL'];

export default function AttendanceSettingsPage() {
  const toast = useToast();
  const [settings, setSettings] = useState<AttendanceSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setSettings(await attendanceSettingsApi.get());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(patch: Partial<AttendanceSettings>) {
    try {
      setSettings(await attendanceSettingsApi.update(patch));
      toast.success('Saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    }
  }

  if (loading) {
    return (
      <Shell>
        <Spinner />
      </Shell>
    );
  }
  if (!settings) return <Shell>{null}</Shell>;
  const s = settings;

  return (
    <Shell>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Attendance</h1>
          <p className="text-sm text-muted-foreground">
            How attendance is captured. Teacher marking is never removed — these settings only add
            automatic <strong>Present</strong> from arrival events (a teacher mark always wins).
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Attendance source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Source mode">
              <Select
                value={s.mode}
                onChange={(e) => void save({ mode: e.target.value as AttendanceSourceMode })}
              >
                {MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </Field>
            <p className="text-xs text-muted-foreground">
              {MODES.find((m) => m.value === s.mode)?.help}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Presence tracking">
                <Select
                  value={s.presenceEnabled ? 'on' : 'off'}
                  onChange={(e) => void save({ presenceEnabled: e.target.value === 'on' })}
                >
                  <option value="off">Off</option>
                  <option value="on">On</option>
                </Select>
              </Field>
              <Field label="Transportation tracking">
                <Select
                  value={s.transportEnabled ? 'on' : 'off'}
                  onChange={(e) => void save({ transportEnabled: e.target.value === 'on' })}
                >
                  <option value="off">Off</option>
                  <option value="on">On</option>
                </Select>
              </Field>
              <Field label="Bus attendance method">
                <Select
                  value={s.busMethod}
                  onChange={(e) => void save({ busMethod: e.target.value as TransportMethod })}
                >
                  {BUS_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <p className="text-xs text-muted-foreground">
              Bus method is the default the attendant&apos;s mobile app uses to identify students
              (NFC cards recommended — no student phone required; offline-first).
            </p>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
