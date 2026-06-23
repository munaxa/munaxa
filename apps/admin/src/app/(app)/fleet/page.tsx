'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Shell, usePrincipal } from '@/components/shell';
import { EntityPicker } from '@/components/entity-picker';
import { useToast } from '@/components/toast';
import { useI18n } from '@/components/i18n-provider';
import { loadStudentOptions } from '@/lib/pickers';
import {
  studentsApi,
  employeesApi,
  fullNameEn,
  fullNameAr,
  type Student,
  type Employee,
} from '@/lib/people';
import {
  busApi,
  type Bus,
  type BusRoute,
  type BusStop,
  type StudentBusAssignment,
} from '@/lib/bus';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
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

export default function FleetPage() {
  return (
    <Shell>
      <Fleet />
    </Shell>
  );
}

function Fleet() {
  const toast = useToast();
  const { t } = useI18n();
  const principal = usePrincipal();
  const held = new Set(principal.permissions);
  const canManage = held.has('bus:manage') || held.has('*');
  // Narrower than canManage: may assign students to routes without reconfiguring the fleet.
  const canAssign = canManage || held.has('bus:assign');

  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [stops, setStops] = useState<BusStop[]>([]);
  const [assignments, setAssignments] = useState<StudentBusAssignment[]>([]);
  const [unavailable, setUnavailable] = useState(false);

  const studentName = useCallback(
    (id: string) => {
      const s = students.find((x) => x.id === id);
      return s ? fullNameEn(s) || fullNameAr(s) || id : id;
    },
    [students],
  );
  const routeName = useCallback(
    (id: string) => routes.find((r) => r.id === id)?.name ?? id,
    [routes],
  );

  const loadBase = useCallback(async () => {
    try {
      const [r, b] = await Promise.all([busApi.listRoutes(), busApi.listBuses()]);
      setRoutes(r);
      setBuses(b);
      // Students list is optional (depends on student:manage); ignore if forbidden.
      studentsApi
        .list()
        .then(setStudents)
        .catch(() => undefined);
    } catch {
      setUnavailable(true);
    }
  }, []);

  useEffect(() => {
    void loadBase();
  }, [loadBase]);

  const loadRouteDetail = useCallback(async (routeId: string) => {
    if (!routeId) {
      setStops([]);
      setAssignments([]);
      return;
    }
    try {
      const [s, a] = await Promise.all([
        busApi.listStops(routeId),
        busApi.listAssignments(routeId),
      ]);
      setStops(s);
      setAssignments(a);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load route');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadRouteDetail(selectedRoute);
  }, [selectedRoute, loadRouteDetail]);

  if (unavailable) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="font-display text-2xl font-semibold">{t('nav.fleet')}</h1>
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            {t('fleet.unavailable')}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold">{t('nav.fleet')}</h1>
        <div className="flex gap-2 text-xs">
          <Badge tone="muted">
            {routes.length} {t('fleet.routesSuffix')}
          </Badge>
          <Badge tone="muted">
            {buses.length} {t('fleet.busesSuffix')}
          </Badge>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <RoutesCard
          routes={routes}
          canManage={canManage}
          onCreated={(r) => {
            setRoutes((prev) => [...prev, r]);
            setSelectedRoute(r.id);
          }}
        />
        <BusesCard
          buses={buses}
          routes={routes}
          routeName={routeName}
          canManage={canManage}
          onSaved={(b) =>
            setBuses((prev) =>
              prev.some((x) => x.id === b.id)
                ? prev.map((x) => (x.id === b.id ? b : x))
                : [...prev, b],
            )
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('fleet.routeDetail')}</CardTitle>
          <CardDescription>{t('fleet.routeDetailDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field label={t('fleet.route')}>
            <Select value={selectedRoute} onChange={(e) => setSelectedRoute(e.target.value)}>
              <option value="">{t('fleet.selectRoute')}</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </Field>

          {selectedRoute ? (
            <>
              <StopsSection
                routeId={selectedRoute}
                stops={stops}
                canManage={canManage}
                onCreated={(s) => setStops((prev) => [...prev, s])}
              />
              <AssignSection
                routeId={selectedRoute}
                stops={stops}
                assignments={assignments}
                canManage={canAssign}
                studentName={studentName}
                onAssigned={(a) =>
                  setAssignments((prev) =>
                    prev.some((x) => x.id === a.id)
                      ? prev.map((x) => (x.id === a.id ? a : x))
                      : [...prev, a],
                  )
                }
              />
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function RoutesCard({
  routes,
  canManage,
  onCreated,
}: {
  routes: BusRoute[];
  canManage: boolean;
  onCreated: (r: BusRoute) => void;
}) {
  const toast = useToast();
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const r = await busApi.createRoute({
        name: name.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
      });
      onCreated(r);
      setName('');
      setDescription('');
      toast.success('Route created');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create route');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('fleet.routes')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {canManage ? (
          <div className="flex flex-wrap items-end gap-2">
            <Field label={t('fleet.name')} className="flex-1">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="North Amman"
              />
            </Field>
            <Field label={t('fleet.description')} className="flex-1">
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <Button size="sm" onClick={() => void create()} disabled={busy || !name.trim()}>
              {t('common.add')}
            </Button>
          </div>
        ) : null}
        {routes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('fleet.noRoutes')}</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {routes.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between border-b border-border pb-1 last:border-0"
              >
                <span className="font-medium">{r.name}</span>
                {r.description ? (
                  <span className="text-xs text-muted-foreground">{r.description}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

const MANUAL_DRIVER = '__manual__';

function BusesCard({
  buses,
  routes,
  routeName,
  canManage,
  onSaved,
}: {
  buses: Bus[];
  routes: BusRoute[];
  routeName: (id: string) => string;
  canManage: boolean;
  onSaved: (b: Bus) => void;
}) {
  const toast = useToast();
  const { t } = useI18n();
  const EMPTY = { plateNumber: '', routeId: '', capacity: '', driverName: '' };
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  // True when the driver is typed manually rather than picked from HR.
  const [manualDriver, setManualDriver] = useState(false);
  const [busy, setBusy] = useState(false);

  // HR may be unavailable (module/permission); fall back to manual entry silently.
  useEffect(() => {
    employeesApi
      .list()
      .then(setEmployees)
      .catch(() => setEmployees([]));
  }, []);

  const driverNames = useMemo(
    () =>
      employees
        .filter((e) => e.status === 'ACTIVE')
        .map((e) => `${e.firstNameEn} ${e.lastNameEn}`.trim())
        .filter(Boolean),
    [employees],
  );
  const hrAvailable = driverNames.length > 0;

  function reset() {
    setEditingId(null);
    setForm(EMPTY);
    setManualDriver(false);
  }
  function startEdit(b: Bus) {
    setEditingId(b.id);
    setForm({
      plateNumber: b.plateNumber,
      routeId: b.routeId ?? '',
      capacity: b.capacity != null ? String(b.capacity) : '',
      driverName: b.driverName ?? '',
    });
    // Show the manual field when the saved driver isn't one of the HR options.
    setManualDriver(Boolean(b.driverName) && !driverNames.includes(b.driverName ?? ''));
  }

  async function save() {
    if (!form.plateNumber.trim()) return;
    setBusy(true);
    try {
      const driverName = form.driverName.trim();
      const payload = {
        plateNumber: form.plateNumber.trim(),
        ...(form.capacity ? { capacity: Number(form.capacity) } : {}),
      };
      const b = editingId
        ? await busApi.updateBus(editingId, {
            ...payload,
            routeId: form.routeId || null,
            driverName,
          })
        : await busApi.createBus({
            ...payload,
            ...(form.routeId ? { routeId: form.routeId } : {}),
            ...(driverName ? { driverName } : {}),
          });
      onSaved(b);
      reset();
      toast.success(editingId ? 'Bus updated' : 'Bus registered');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save bus');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('fleet.buses')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {canManage ? (
          <div className="grid grid-cols-2 gap-2">
            <Field label={t('fleet.plateNumber')}>
              <Input
                value={form.plateNumber}
                onChange={(e) => setForm({ ...form, plateNumber: e.target.value })}
                placeholder="21-12345"
              />
            </Field>
            <Field label={t('fleet.route')}>
              <Select
                value={form.routeId}
                onChange={(e) => setForm({ ...form, routeId: e.target.value })}
              >
                <option value="">{t('fleet.unassigned')}</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('fleet.capacity')}>
              <Input
                type="number"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              />
            </Field>
            <Field label={t('fleet.driver')}>
              {hrAvailable && !manualDriver ? (
                <Select
                  value={form.driverName}
                  onChange={(e) => {
                    if (e.target.value === MANUAL_DRIVER) {
                      setManualDriver(true);
                      setForm({ ...form, driverName: '' });
                    } else {
                      setForm({ ...form, driverName: e.target.value });
                    }
                  }}
                >
                  <option value="">{t('fleet.unassigned')}</option>
                  {driverNames.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                  <option value={MANUAL_DRIVER}>＋ Enter manually…</option>
                </Select>
              ) : (
                <Input
                  value={form.driverName}
                  onChange={(e) => setForm({ ...form, driverName: e.target.value })}
                  placeholder="Driver name"
                />
              )}
            </Field>
            <div className="col-span-2 flex justify-end gap-2">
              {editingId ? (
                <Button size="sm" variant="outline" onClick={reset} disabled={busy}>
                  {t('common.cancel')}
                </Button>
              ) : null}
              <Button
                size="sm"
                onClick={() => void save()}
                disabled={busy || !form.plateNumber.trim()}
              >
                {editingId ? t('common.save') : t('fleet.registerBus')}
              </Button>
            </div>
          </div>
        ) : null}
        {buses.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('fleet.noBuses')}</p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>{t('fleet.plate')}</TH>
                <TH>{t('fleet.route')}</TH>
                <TH className="text-end">{t('fleet.capacity')}</TH>
                {canManage ? <TH className="text-end">{t('common.actions')}</TH> : null}
              </TR>
            </THead>
            <TBody>
              {buses.map((b) => (
                <TR key={b.id}>
                  <TD>
                    {b.plateNumber}
                    {b.driverName ? (
                      <span className="block text-xs text-muted-foreground">{b.driverName}</span>
                    ) : null}
                  </TD>
                  <TD className="text-xs text-muted-foreground">
                    {b.routeId ? routeName(b.routeId) : '—'}
                  </TD>
                  <TD className="text-end font-mono text-xs">{b.capacity ?? '—'}</TD>
                  {canManage ? (
                    <TD className="text-end">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(b)}>
                        {t('common.edit')}
                      </Button>
                    </TD>
                  ) : null}
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function StopsSection({
  routeId,
  stops,
  canManage,
  onCreated,
}: {
  routeId: string;
  stops: BusStop[];
  canManage: boolean;
  onCreated: (s: BusStop) => void;
}) {
  const toast = useToast();
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [busy, setBusy] = useState(false);

  const nextSequence = useMemo(
    () => stops.reduce((m, s) => Math.max(m, s.sequence), 0) + 1,
    [stops],
  );

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const s = await busApi.createStop({
        routeId,
        name: name.trim(),
        sequence: nextSequence,
        ...(pickupTime ? { pickupTime } : {}),
      });
      onCreated(s);
      setName('');
      setPickupTime('');
      toast.success('Stop added');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add stop');
    } finally {
      setBusy(false);
    }
  }

  const ordered = [...stops].sort((a, b) => a.sequence - b.sequence);

  return (
    <div className="space-y-3">
      <h3 className="font-display text-sm font-semibold">{t('fleet.stops')}</h3>
      {canManage ? (
        <div className="flex flex-wrap items-end gap-2">
          <Field label={t('fleet.stopName')} className="flex-1">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sweifieh Square"
            />
          </Field>
          <Field label={t('fleet.pickupTime')}>
            <Input type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} />
          </Field>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void create()}
            disabled={busy || !name.trim()}
          >
            {t('fleet.addStop')}
          </Button>
        </div>
      ) : null}
      {ordered.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('fleet.noStops')}</p>
      ) : (
        <ol className="space-y-1 text-sm">
          {ordered.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-2 border-b border-border pb-1 last:border-0"
            >
              <span className="font-mono text-[11px] text-muted-foreground">#{s.sequence}</span>
              <span className="font-medium">{s.name}</span>
              {s.pickupTime ? (
                <span className="ms-auto font-mono text-xs text-muted-foreground">
                  {s.pickupTime}
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function AssignSection({
  routeId,
  stops,
  assignments,
  canManage,
  studentName,
  onAssigned,
}: {
  routeId: string;
  stops: BusStop[];
  assignments: StudentBusAssignment[];
  canManage: boolean;
  studentName: (id: string) => string;
  onAssigned: (a: StudentBusAssignment) => void;
}) {
  const toast = useToast();
  const { t } = useI18n();
  const [studentId, setStudentId] = useState('');
  const [stopId, setStopId] = useState('');
  const [busy, setBusy] = useState(false);

  const stopName = useCallback(
    (id: string | null) => (id ? (stops.find((s) => s.id === id)?.name ?? id) : '—'),
    [stops],
  );

  async function assign() {
    if (!studentId) return;
    setBusy(true);
    try {
      const a = await busApi.assign({ studentId, routeId, ...(stopId ? { stopId } : {}) });
      onAssigned(a);
      setStudentId('');
      setStopId('');
      toast.success('Student assigned to route');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to assign student');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="font-display text-sm font-semibold">{t('fleet.studentAssignments')}</h3>
      {canManage ? (
        <div className="flex flex-wrap items-end gap-2">
          <Field label={t('fleet.student')} className="flex-1">
            <EntityPicker
              value={studentId}
              onChange={setStudentId}
              load={loadStudentOptions}
              placeholder={t('fleet.searchStudents')}
            />
          </Field>
          <Field label={t('fleet.stop')}>
            <Select value={stopId} onChange={(e) => setStopId(e.target.value)}>
              <option value="">{t('fleet.noSpecificStop')}</option>
              {stops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Button size="sm" onClick={() => void assign()} disabled={busy || !studentId}>
            {t('fleet.assign')}
          </Button>
        </div>
      ) : null}
      {assignments.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('fleet.noAssignments')}</p>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>{t('fleet.student')}</TH>
              <TH>{t('fleet.stop')}</TH>
            </TR>
          </THead>
          <TBody>
            {assignments.map((a) => (
              <TR key={a.id}>
                <TD>{studentName(a.studentId)}</TD>
                <TD className="text-xs text-muted-foreground">{stopName(a.stopId)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
