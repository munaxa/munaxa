'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  studentsApi,
  fullNameEn,
  fullNameAr,
  type Student,
} from '@/lib/people';
import {
  busApi,
  type Bus,
  type BusRoute,
  type BusStop,
  type StudentBusAssignment,
} from '@/lib/bus';
import {
  schoolsApi,
  campusesApi,
  academicYearsApi,
  sectionsApi,
  type AcademicYear,
  type Section,
} from '@/lib/structure';

/** Debounce a fast-changing value (e.g. a search box) for cheaper filtering. */
export function useDebouncedValue<T>(value: T, ms = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

/** Map a UI trip value to the API payload's tripRound (undefined = No trip). */
export function tripToRound(trip: TripValue): number | undefined {
  return trip === '' ? undefined : Number(trip);
}

export interface BulkOutcome {
  ok: number;
  failed: number;
}

/**
 * Run a per-id async action sequentially (keeps the server + audit log calm) and
 * report a summary. Capacity never blocks here — every id is attempted.
 */
export async function runBulk<T>(
  ids: T[],
  action: (id: T) => Promise<void>,
): Promise<BulkOutcome> {
  let ok = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      await action(id);
      ok += 1;
    } catch {
      failed += 1;
    }
  }
  return { ok, failed };
}

/** Multi-select state for the selectable tables + bulk action bar. */
export function useSelection() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggle = useCallback(
    (id: string) =>
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    [],
  );
  const toggleVisible = useCallback(
    (ids: string[], checked: boolean) =>
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of ids) {
          if (checked) next.add(id);
          else next.delete(id);
        }
        return next;
      }),
    [],
  );
  const clear = useCallback(() => setSelected(new Set()), []);
  return { selected, setSelected, toggle, toggleVisible, clear };
}

/** Trigger a client-side CSV download for the given student rows. */
export function exportRowsCsv(rows: StudentRow[], filename: string): void {
  const header = ['Student ID', 'Name', 'Grade', 'Area', 'Pickup Point', 'Route', 'Trip'];
  const tripText = (n: number | null | undefined) =>
    n === 1 ? '1st Trip' : n === 2 ? '2nd Trip' : n === 3 ? 'Both Trips' : 'No Trip';
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [header.map(escape).join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.student.moeStudentNumber || r.student.qrCode,
        r.name,
        r.grade ?? '',
        r.area,
        r.pickup ?? '',
        r.routeName ?? '',
        tripText(r.assignment?.tripRound),
      ]
        .map((v) => escape(String(v)))
        .join(','),
    );
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Trip vocabulary — single source of truth.
// Persisted as `tripRound`: null/0 = No trip, 1 = 1st, 2 = 2nd, 3 = Both.
// (3/Both is a Phase‑2 backend value; the UI treats it as a first‑class label
// and filter today. See TRANSPORTATION_REDESIGN.md §8.)
// ---------------------------------------------------------------------------
export type TripValue = '' | '1' | '2' | '3';

export const TRIP_OPTIONS: ReadonlyArray<{ value: TripValue; key: string }> = [
  { value: '', key: 'transport.trip.none' },
  { value: '1', key: 'transport.trip.first' },
  { value: '2', key: 'transport.trip.second' },
  { value: '3', key: 'transport.trip.both' },
];

/** i18n key for a stored tripRound. */
export function tripKey(round: number | null | undefined): string {
  switch (round) {
    case 1:
      return 'transport.trip.first';
    case 2:
      return 'transport.trip.second';
    case 3:
      return 'transport.trip.both';
    default:
      return 'transport.trip.none';
  }
}

/** Does a stored tripRound satisfy a trip filter value? */
export function tripMatches(round: number | null | undefined, filter: TripValue): boolean {
  if (filter === '') return round == null;
  if (filter === '1') return round === 1 || round === 3;
  if (filter === '2') return round === 2 || round === 3;
  if (filter === '3') return round === 3;
  return true;
}

// ---------------------------------------------------------------------------
// Capacity — visual status only. NEVER blocks assignment.
// ---------------------------------------------------------------------------
export type CapacityState = 'normal' | 'near' | 'exceeded' | 'unset';

export interface Capacity {
  capacity: number;
  assigned: number;
  available: number;
  exceeded: number;
  state: CapacityState;
  /** 0–100 fill for the occupancy bar (clamped). */
  percent: number;
}

export function capacityStatus(capacity: number, assigned: number): Capacity {
  const available = Math.max(capacity - assigned, 0);
  const exceeded = Math.max(assigned - capacity, 0);
  let state: CapacityState;
  if (capacity <= 0) state = 'unset';
  else if (assigned > capacity) state = 'exceeded';
  else if (assigned === capacity) state = 'near';
  else state = 'normal';
  const percent = capacity > 0 ? Math.min(Math.round((assigned / capacity) * 100), 100) : 0;
  return { capacity, assigned, available, exceeded, state, percent };
}

// ---------------------------------------------------------------------------
// Areas — geographic buckets. Phase 1 derives the area from route / pickup‑point
// naming; Phase 2 swaps in a real `Student.areaId`. See redesign doc §8/§9.
// ---------------------------------------------------------------------------
export const AREA_PRESETS = ['Khalda', 'Dabouq', 'Abdoun', 'Shafa Badran', 'Tla Al Ali'] as const;
export const UNZONED = 'Unzoned';

/** Derive an area name from a route + its stops by matching the preset list. */
export function deriveAreaFromText(...texts: Array<string | null | undefined>): string {
  const hay = texts.filter(Boolean).join(' ').toLowerCase();
  for (const area of AREA_PRESETS) {
    if (hay.includes(area.toLowerCase())) return area;
  }
  return UNZONED;
}

// ---------------------------------------------------------------------------
// Derived view models
// ---------------------------------------------------------------------------
export interface RouteVM {
  route: BusRoute;
  area: string;
  buses: Bus[];
  busLabel: string | null;
  driverName: string | null;
  capacity: Capacity;
  trip1: number;
  trip2: number;
}

export interface StudentRow {
  student: Student;
  name: string;
  nameAr: string;
  grade: string | null;
  area: string;
  pickup: string | null;
  assignment: StudentBusAssignment | null;
  routeName: string | null;
  assignedAt: string | null;
}

export interface AreaVM {
  name: string;
  routes: RouteVM[];
  assignedCount: number;
  capacity: number;
}

/** Shared transport data + optimistic mutators, loaded once per workspace mount. */
export interface TransportData {
  loading: boolean;
  error: string | null;
  unavailable: boolean;
  routes: BusRoute[];
  buses: Bus[];
  students: Student[];
  years: AcademicYear[];
  sections: Section[];
  stopsByRoute: Record<string, BusStop[]>;
  assignments: StudentBusAssignment[];
  routeVMs: RouteVM[];
  areas: AreaVM[];
  rows: StudentRow[];
  reload: () => Promise<void>;
  /** Apply assignments locally after a successful API call (optimistic merge). */
  mergeAssignment: (a: StudentBusAssignment) => void;
  removeAssignment: (id: string) => void;
  setRoutes: React.Dispatch<React.SetStateAction<BusRoute[]>>;
  setBuses: React.Dispatch<React.SetStateAction<Bus[]>>;
}

export function useTransport(): TransportData {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [assignments, setAssignments] = useState<StudentBusAssignment[]>([]);
  const [stopsByRoute, setStopsByRoute] = useState<Record<string, BusStop[]>>({});

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, b, a] = await Promise.all([
        busApi.listRoutes(),
        busApi.listBuses(),
        busApi.listAssignments(),
      ]);
      setRoutes(r);
      setBuses(b);
      setAssignments(a);
      // Optional, permission‑gated extras — never fatal.
      studentsApi.list().then(setStudents).catch(() => undefined);
      sectionsApi.list().then(setSections).catch(() => undefined);
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
          /* years optional */
        }
      })();
      // Stops feed pickup‑point derivation; best‑effort per route.
      void (async () => {
        try {
          const entries = await Promise.all(
            r.map(async (route) => [route.id, await busApi.listStops(route.id).catch(() => [])] as const),
          );
          setStopsByRoute(Object.fromEntries(entries));
        } catch {
          /* stops optional */
        }
      })();
    } catch (e) {
      // A 403 here means the module/permission is off rather than a hard error.
      setUnavailable(true);
      setError(e instanceof Error ? e.message : 'Failed to load transport');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const mergeAssignment = useCallback((a: StudentBusAssignment) => {
    setAssignments((prev) => {
      // One assignment per student — replace any existing row for the student.
      const without = prev.filter((x) => x.studentId !== a.studentId && x.id !== a.id);
      return [a, ...without];
    });
  }, []);

  const removeAssignment = useCallback((id: string) => {
    setAssignments((prev) => prev.filter((x) => x.id !== id));
  }, []);

  // --- derivations -------------------------------------------------------
  const sectionMap = useMemo(() => {
    const m = new Map<string, Section>();
    for (const s of sections) m.set(s.id, s);
    return m;
  }, [sections]);

  const gradeOf = useCallback(
    (sectionId: string | null | undefined): string | null => {
      if (!sectionId) return null;
      const sec = sectionMap.get(sectionId);
      if (!sec) return null;
      return sec.grade ? `${sec.grade.nameEn} · ${sec.name}` : sec.name;
    },
    [sectionMap],
  );

  const routeAreas = useMemo(() => {
    const m = new Map<string, string>();
    for (const route of routes) {
      const stopNames = (stopsByRoute[route.id] ?? []).map((s) => s.name).join(' ');
      m.set(route.id, deriveAreaFromText(route.name, route.description, stopNames));
    }
    return m;
  }, [routes, stopsByRoute]);

  const assignmentsByRoute = useMemo(() => {
    const m = new Map<string, StudentBusAssignment[]>();
    for (const a of assignments) {
      const list = m.get(a.routeId) ?? [];
      list.push(a);
      m.set(a.routeId, list);
    }
    return m;
  }, [assignments]);

  const routeVMs = useMemo<RouteVM[]>(() => {
    return routes.map((route) => {
      const routeBuses = buses.filter((b) => b.routeId === route.id);
      const capacity = routeBuses.reduce((sum, b) => sum + (b.capacity ?? 0), 0);
      const list = assignmentsByRoute.get(route.id) ?? [];
      const assigned = list.length;
      const trip1 = list.filter((a) => a.tripRound === 1 || a.tripRound === 3).length;
      const trip2 = list.filter((a) => a.tripRound === 2 || a.tripRound === 3).length;
      const withLabel = routeBuses.find((b) => b.label) ?? routeBuses[0];
      const withDriver = routeBuses.find((b) => b.driverName);
      return {
        route,
        area: routeAreas.get(route.id) ?? UNZONED,
        buses: routeBuses,
        busLabel: withLabel?.label ?? withLabel?.plateNumber ?? null,
        driverName: withDriver?.driverName ?? null,
        capacity: capacityStatus(capacity, assigned),
        trip1,
        trip2,
      };
    });
  }, [routes, buses, assignmentsByRoute, routeAreas]);

  const areas = useMemo<AreaVM[]>(() => {
    const byArea = new Map<string, RouteVM[]>();
    for (const vm of routeVMs) {
      const list = byArea.get(vm.area) ?? [];
      list.push(vm);
      byArea.set(vm.area, list);
    }
    const result: AreaVM[] = [...byArea.entries()].map(([name, vms]) => ({
      name,
      routes: vms,
      assignedCount: vms.reduce((s, v) => s + v.capacity.assigned, 0),
      capacity: vms.reduce((s, v) => s + v.capacity.capacity, 0),
    }));
    // Known presets first (stable order), then any extras, Unzoned last.
    const order = (n: string) =>
      n === UNZONED ? 999 : (AREA_PRESETS as readonly string[]).indexOf(n) + 1 || 500;
    return result.sort((a, b) => order(a.name) - order(b.name) || a.name.localeCompare(b.name));
  }, [routeVMs]);

  const routeNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of routes) m.set(r.id, r.name);
    return m;
  }, [routes]);

  const assignmentByStudent = useMemo(() => {
    const m = new Map<string, StudentBusAssignment>();
    for (const a of assignments) m.set(a.studentId, a);
    return m;
  }, [assignments]);

  const stopNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const list of Object.values(stopsByRoute)) {
      for (const s of list) m.set(s.id, s.name);
    }
    return m;
  }, [stopsByRoute]);

  const rows = useMemo<StudentRow[]>(() => {
    return students.map((student) => {
      const assignment = assignmentByStudent.get(student.id) ?? null;
      const routeName = assignment ? (routeNameById.get(assignment.routeId) ?? null) : null;
      const area = assignment ? (routeAreas.get(assignment.routeId) ?? UNZONED) : UNZONED;
      const pickup = assignment?.stopId ? (stopNameById.get(assignment.stopId) ?? null) : null;
      return {
        student,
        name: fullNameEn(student) || fullNameAr(student) || student.qrCode,
        nameAr: fullNameAr(student),
        grade: gradeOf(student.sectionId),
        area,
        pickup,
        assignment,
        routeName,
        assignedAt: assignment?.createdAt ?? null,
      };
    });
  }, [students, assignmentByStudent, routeNameById, routeAreas, stopNameById, gradeOf]);

  return {
    loading,
    error,
    unavailable,
    routes,
    buses,
    students,
    years,
    sections,
    stopsByRoute,
    assignments,
    routeVMs,
    areas,
    rows,
    reload,
    mergeAssignment,
    removeAssignment,
    setRoutes,
    setBuses,
  };
}
