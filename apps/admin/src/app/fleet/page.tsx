'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Shell, usePrincipal } from '@/components/shell';
import { EntityPicker } from '@/components/entity-picker';
import { useToast } from '@/components/toast';
import { useI18n } from '@/components/i18n-provider';
import { loadStudentOptions } from '@/lib/pickers';
import { studentsApi, fullNameEn, fullNameAr, type Student } from '@/lib/people';
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
            Transport is not enabled for this school. Ask an administrator to turn on the
            <span className="font-medium"> Bus tracking </span> module under Modules.
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
          <Badge tone="muted">{routes.length} routes</Badge>
          <Badge tone="muted">{buses.length} buses</Badge>
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
          onCreated={(b) => setBuses((prev) => [...prev, b])}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Route detail & student assignments</CardTitle>
          <CardDescription>
            Pick a route to manage its stops and assign students to it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field label="Route">
            <Select value={selectedRoute} onChange={(e) => setSelectedRoute(e.target.value)}>
              <option value="">Select a route…</option>
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
                canManage={canManage}
                studentName={studentName}
                onAssigned={(a) => setAssignments((prev) => [...prev, a])}
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
        <CardTitle>Routes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {canManage ? (
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Name" className="flex-1">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="North Amman"
              />
            </Field>
            <Field label="Description" className="flex-1">
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <Button size="sm" onClick={() => void create()} disabled={busy || !name.trim()}>
              Add
            </Button>
          </div>
        ) : null}
        {routes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No routes yet.</p>
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

function BusesCard({
  buses,
  routes,
  routeName,
  canManage,
  onCreated,
}: {
  buses: Bus[];
  routes: BusRoute[];
  routeName: (id: string) => string;
  canManage: boolean;
  onCreated: (b: Bus) => void;
}) {
  const toast = useToast();
  const [plateNumber, setPlateNumber] = useState('');
  const [routeId, setRouteId] = useState('');
  const [capacity, setCapacity] = useState('');
  const [driverName, setDriverName] = useState('');
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!plateNumber.trim()) return;
    setBusy(true);
    try {
      const b = await busApi.createBus({
        plateNumber: plateNumber.trim(),
        ...(routeId ? { routeId } : {}),
        ...(capacity ? { capacity: Number(capacity) } : {}),
        ...(driverName.trim() ? { driverName: driverName.trim() } : {}),
      });
      onCreated(b);
      setPlateNumber('');
      setCapacity('');
      setDriverName('');
      toast.success('Bus registered');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to register bus');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Buses</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {canManage ? (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Plate number">
              <Input
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                placeholder="21-12345"
              />
            </Field>
            <Field label="Route">
              <Select value={routeId} onChange={(e) => setRouteId(e.target.value)}>
                <option value="">Unassigned</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Capacity">
              <Input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
            </Field>
            <Field label="Driver">
              <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} />
            </Field>
            <div className="col-span-2 flex justify-end">
              <Button
                size="sm"
                onClick={() => void create()}
                disabled={busy || !plateNumber.trim()}
              >
                Register bus
              </Button>
            </div>
          </div>
        ) : null}
        {buses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No buses yet.</p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Plate</TH>
                <TH>Route</TH>
                <TH className="text-end">Capacity</TH>
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
      <h3 className="font-display text-sm font-semibold">Stops</h3>
      {canManage ? (
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Stop name" className="flex-1">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sweifieh Square"
            />
          </Field>
          <Field label="Pickup time">
            <Input type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} />
          </Field>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void create()}
            disabled={busy || !name.trim()}
          >
            Add stop
          </Button>
        </div>
      ) : null}
      {ordered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No stops on this route.</p>
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
      <h3 className="font-display text-sm font-semibold">Student assignments</h3>
      {canManage ? (
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Student" className="flex-1">
            <EntityPicker
              value={studentId}
              onChange={setStudentId}
              load={loadStudentOptions}
              placeholder="Search students…"
            />
          </Field>
          <Field label="Stop">
            <Select value={stopId} onChange={(e) => setStopId(e.target.value)}>
              <option value="">No specific stop</option>
              {stops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Button size="sm" onClick={() => void assign()} disabled={busy || !studentId}>
            Assign
          </Button>
        </div>
      ) : null}
      {assignments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No students assigned to this route.</p>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Student</TH>
              <TH>Stop</TH>
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
