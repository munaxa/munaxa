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
import { busApi, type Bus, type BusRoute, type StudentBusAssignment } from '@/lib/bus';
import { schoolsApi, campusesApi, academicYearsApi, type AcademicYear } from '@/lib/structure';
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
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [assignments, setAssignments] = useState<StudentBusAssignment[]>([]);
  const [unavailable, setUnavailable] = useState(false);

  const yearName = useCallback(
    (id: string | null) => (id ? (years.find((y) => y.id === id)?.name ?? id) : null),
    [years],
  );

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
  const currentYearIds = useMemo(
    () => new Set(years.filter((y) => y.isCurrent).map((y) => y.id)),
    [years],
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
      // Academic years (across campuses) for grouping/assigning routes; optional.
      void (async () => {
        try {
          const schools = await schoolsApi.list();
          const campusLists = await Promise.all(
            schools.map((s) => campusesApi.list(s.id).catch(() => [])),
          );
          const campuses = campusLists.flat();
          const yearLists = await Promise.all(
            campuses.map((c) => academicYearsApi.list(c.id).catch(() => [])),
          );
          setYears(yearLists.flat());
        } catch {
          /* years are optional for the fleet */
        }
      })();
    } catch {
      setUnavailable(true);
    }
  }, []);

  useEffect(() => {
    void loadBase();
  }, [loadBase]);

  const loadRouteDetail = useCallback(async (routeId: string) => {
    if (!routeId) {
      setAssignments([]);
      return;
    }
    try {
      setAssignments(await busApi.listAssignments(routeId));
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
          years={years}
          yearName={yearName}
          canManage={canManage}
          onSaved={(r, isNew) => {
            setRoutes((prev) =>
              prev.some((x) => x.id === r.id)
                ? prev.map((x) => (x.id === r.id ? r : x))
                : [...prev, r],
            );
            if (isNew) setSelectedRoute(r.id);
          }}
        />
        <BusesCard
          buses={buses}
          routes={routes}
          routeName={routeName}
          currentYearIds={currentYearIds}
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
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: pick the route */}
            <div>
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
            </div>

            {/* Right: assign students to the chosen route */}
            <div>
              {selectedRoute ? (
                <AssignSection
                  routeId={selectedRoute}
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
              ) : (
                <p className="text-sm text-muted-foreground">{t('fleet.selectRoute')}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RoutesCard({
  routes,
  years,
  yearName,
  canManage,
  onSaved,
}: {
  routes: BusRoute[];
  years: AcademicYear[];
  yearName: (id: string | null) => string | null;
  canManage: boolean;
  onSaved: (r: BusRoute, isNew: boolean) => void;
}) {
  const toast = useToast();
  const { t } = useI18n();
  const EMPTY = { name: '', description: '', academicYearId: '' };
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setEditingId(null);
    setForm(EMPTY);
  }
  function startEdit(r: BusRoute) {
    setEditingId(r.id);
    setForm({
      name: r.name,
      description: r.description ?? '',
      academicYearId: r.academicYearId ?? '',
    });
  }

  async function save() {
    if (!form.name.trim()) return;
    setBusy(true);
    try {
      const name = form.name.trim();
      const description = form.description.trim();
      const r = editingId
        ? await busApi.updateRoute(editingId, {
            name,
            description,
            academicYearId: form.academicYearId || null,
          })
        : await busApi.createRoute({
            name,
            ...(description ? { description } : {}),
            ...(form.academicYearId ? { academicYearId: form.academicYearId } : {}),
          });
      onSaved(r, !editingId);
      reset();
      toast.success(editingId ? 'Route updated' : 'Route created');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save route');
    } finally {
      setBusy(false);
    }
  }

  // Group routes by academic year for display (most recent years first; "No year" last).
  const groups = useMemo(() => {
    const byYear = new Map<string, BusRoute[]>();
    for (const r of routes) {
      const key = r.academicYearId ?? '';
      const list = byYear.get(key) ?? [];
      list.push(r);
      byYear.set(key, list);
    }
    return [...byYear.entries()]
      .map(([yid, list]) => ({ yid, label: yearName(yid || null) ?? 'No academic year', list }))
      .sort((a, b) => (a.yid === '' ? 1 : b.yid === '' ? -1 : b.label.localeCompare(a.label)));
  }, [routes, yearName]);

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
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="North Amman"
              />
            </Field>
            <Field label={t('fleet.description')} className="flex-1">
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
            <Field label={t('fleet.academicYear')}>
              <Select
                value={form.academicYearId}
                onChange={(e) => setForm({ ...form, academicYearId: e.target.value })}
              >
                <option value="">{t('fleet.noYear')}</option>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </Select>
            </Field>
            {editingId ? (
              <Button size="sm" variant="outline" onClick={reset} disabled={busy}>
                {t('common.cancel')}
              </Button>
            ) : null}
            <Button size="sm" onClick={() => void save()} disabled={busy || !form.name.trim()}>
              {editingId ? t('common.save') : t('common.add')}
            </Button>
          </div>
        ) : null}
        {routes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('fleet.noRoutes')}</p>
        ) : (
          <div className="space-y-3">
            {groups.map((g) => (
              <div key={g.yid || 'none'}>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {g.label}
                </h4>
                <ul className="space-y-1 text-sm">
                  {g.list.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center gap-2 border-b border-border pb-1 last:border-0"
                    >
                      <span className="font-medium">{r.name}</span>
                      {r.description ? (
                        <span className="text-xs text-muted-foreground">{r.description}</span>
                      ) : null}
                      {canManage ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ms-auto"
                          onClick={() => startEdit(r)}
                        >
                          {t('common.edit')}
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
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
  currentYearIds,
  canManage,
  onSaved,
}: {
  buses: Bus[];
  routes: BusRoute[];
  routeName: (id: string) => string;
  currentYearIds: Set<string>;
  canManage: boolean;
  onSaved: (b: Bus) => void;
}) {
  const toast = useToast();
  const { t } = useI18n();
  const EMPTY = {
    plateNumber: '',
    busNumber: '',
    routeId: '',
    capacity: '',
    driverName: '',
    driverPhone: '',
  };
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

  // Only current-year routes are selectable for a bus (plus the one already on the bus when editing).
  const routeOptions = useMemo(
    () =>
      routes.filter(
        (r) => (r.academicYearId && currentYearIds.has(r.academicYearId)) || r.id === form.routeId,
      ),
    [routes, currentYearIds, form.routeId],
  );

  function reset() {
    setEditingId(null);
    setForm(EMPTY);
    setManualDriver(false);
  }
  function startEdit(b: Bus) {
    setEditingId(b.id);
    setForm({
      plateNumber: b.plateNumber,
      busNumber: b.label ?? '',
      routeId: b.routeId ?? '',
      capacity: b.capacity != null ? String(b.capacity) : '',
      driverName: b.driverName ?? '',
      driverPhone: b.driverPhone ?? '',
    });
    // Show the manual field when the saved driver isn't one of the HR options.
    setManualDriver(Boolean(b.driverName) && !driverNames.includes(b.driverName ?? ''));
  }

  async function save() {
    if (!form.plateNumber.trim()) return;
    setBusy(true);
    try {
      const driverName = form.driverName.trim();
      const driverPhone = form.driverPhone.trim();
      const busNumber = form.busNumber.trim();
      const payload = {
        plateNumber: form.plateNumber.trim(),
        ...(form.capacity ? { capacity: Number(form.capacity) } : {}),
      };
      const b = editingId
        ? await busApi.updateBus(editingId, {
            ...payload,
            routeId: form.routeId || null,
            label: busNumber,
            driverName,
            driverPhone,
          })
        : await busApi.createBus({
            ...payload,
            ...(form.routeId ? { routeId: form.routeId } : {}),
            ...(busNumber ? { label: busNumber } : {}),
            ...(driverName ? { driverName } : {}),
            ...(driverPhone ? { driverPhone } : {}),
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
            <Field label={t('fleet.busNumber')}>
              <Input
                value={form.busNumber}
                onChange={(e) => setForm({ ...form, busNumber: e.target.value })}
                placeholder="Bus 12"
              />
            </Field>
            <Field label={t('fleet.route')}>
              <Select
                value={form.routeId}
                onChange={(e) => setForm({ ...form, routeId: e.target.value })}
              >
                <option value="">{t('fleet.unassigned')}</option>
                {routeOptions.map((r) => (
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
            <Field label={t('fleet.driverMobile')}>
              <Input
                value={form.driverPhone}
                onChange={(e) => setForm({ ...form, driverPhone: e.target.value })}
                placeholder="07XXXXXXXX"
                dir="ltr"
              />
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
                <TH>{t('fleet.busNumber')}</TH>
                <TH>{t('fleet.plate')}</TH>
                <TH>{t('fleet.route')}</TH>
                <TH className="text-end">{t('fleet.capacity')}</TH>
                {canManage ? <TH className="text-end">{t('common.actions')}</TH> : null}
              </TR>
            </THead>
            <TBody>
              {buses.map((b) => (
                <TR key={b.id}>
                  <TD>{b.label || <span className="text-muted-foreground">—</span>}</TD>
                  <TD>
                    {b.plateNumber}
                    {b.driverName ? (
                      <span className="block text-xs text-muted-foreground">
                        {b.driverName}
                        {b.driverPhone ? ` · ${b.driverPhone}` : ''}
                      </span>
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

function AssignSection({
  routeId,
  assignments,
  canManage,
  studentName,
  onAssigned,
}: {
  routeId: string;
  assignments: StudentBusAssignment[];
  canManage: boolean;
  studentName: (id: string) => string;
  onAssigned: (a: StudentBusAssignment) => void;
}) {
  const toast = useToast();
  const { t } = useI18n();
  const [studentId, setStudentId] = useState('');
  const [busy, setBusy] = useState(false);

  async function assign() {
    if (!studentId) return;
    setBusy(true);
    try {
      const a = await busApi.assign({ studentId, routeId });
      onAssigned(a);
      setStudentId('');
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
          <Button size="sm" onClick={() => void assign()} disabled={busy || !studentId}>
            {t('fleet.assign')}
          </Button>
        </div>
      ) : null}
      {assignments.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('fleet.noAssignments')}</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {assignments.map((a) => (
            <li key={a.id} className="border-b border-border pb-1 last:border-0">
              {studentName(a.studentId)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
