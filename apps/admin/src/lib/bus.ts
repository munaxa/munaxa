'use client';

import { authFetch } from './auth';

export interface BusRoute {
  id: string;
  name: string;
  description: string | null;
  academicYearId: string | null;
  round1Time: string | null;
  round2Time: string | null;
}

export interface BusStop {
  id: string;
  routeId: string;
  name: string;
  sequence: number;
  lat: number | null;
  lng: number | null;
  pickupTime: string | null;
}

export interface Bus {
  id: string;
  plateNumber: string;
  routeId: string | null;
  label: string | null;
  capacity: number | null;
  driverName: string | null;
  driverPhone: string | null;
  lastLat?: number | null;
  lastLng?: number | null;
}

export interface StudentBusAssignment {
  id: string;
  studentId: string;
  routeId: string;
  stopId: string | null;
}

export interface StudentTransport {
  routeName: string;
  busNumber: string | null;
  busPlate: string | null;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new Error(message ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export const busApi = {
  listRoutes: (academicYearId?: string) =>
    authFetch(
      `/bus/routes${academicYearId ? `?academicYearId=${encodeURIComponent(academicYearId)}` : ''}`,
    ).then((r) => json<BusRoute[]>(r)),
  createRoute: (data: {
    name: string;
    description?: string;
    academicYearId?: string;
    round1Time?: string;
    round2Time?: string;
  }) =>
    authFetch('/bus/routes', { method: 'POST', body: JSON.stringify(data) }).then((r) =>
      json<BusRoute>(r),
    ),
  updateRoute: (
    id: string,
    data: Partial<{
      name: string;
      description: string;
      academicYearId: string | null;
      round1Time: string;
      round2Time: string;
    }>,
  ) =>
    authFetch(`/bus/routes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }).then((r) =>
      json<BusRoute>(r),
    ),

  listStops: (routeId: string) =>
    authFetch(`/bus/routes/${routeId}/stops`).then((r) => json<BusStop[]>(r)),
  createStop: (data: {
    routeId: string;
    name: string;
    sequence?: number;
    pickupTime?: string;
    lat?: number;
    lng?: number;
  }) =>
    authFetch('/bus/routes/stops', { method: 'POST', body: JSON.stringify(data) }).then((r) =>
      json<BusStop>(r),
    ),

  listBuses: () => authFetch('/bus/vehicles').then((r) => json<Bus[]>(r)),
  createBus: (data: {
    plateNumber: string;
    routeId?: string;
    label?: string;
    capacity?: number;
    driverName?: string;
    driverPhone?: string;
  }) =>
    authFetch('/bus/vehicles', { method: 'POST', body: JSON.stringify(data) }).then((r) =>
      json<Bus>(r),
    ),
  updateBus: (
    id: string,
    data: Partial<{
      plateNumber: string;
      routeId: string | null;
      label: string;
      capacity: number;
      driverName: string;
      driverPhone: string;
    }>,
  ) =>
    authFetch(`/bus/vehicles/${id}`, { method: 'PATCH', body: JSON.stringify(data) }).then((r) =>
      json<Bus>(r),
    ),

  listAssignments: (routeId?: string) =>
    authFetch(`/bus/assignments${routeId ? `?routeId=${routeId}` : ''}`).then((r) =>
      json<StudentBusAssignment[]>(r),
    ),
  assign: (data: { studentId: string; routeId: string; stopId?: string }) =>
    authFetch('/bus/assignments', { method: 'POST', body: JSON.stringify(data) }).then((r) =>
      json<StudentBusAssignment>(r),
    ),
  studentTransport: (studentId: string) =>
    authFetch(`/bus/students/${studentId}/transport`).then((r) => json<StudentTransport | null>(r)),
};
