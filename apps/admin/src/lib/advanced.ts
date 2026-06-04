'use client';

import { authFetch } from './auth';

export interface FeatureFlag {
  key: string;
  enabled: boolean;
}

export interface AdvancedModuleDef {
  key: string;
  label: string;
  description: string;
}

/** The optional, feature-flagged modules (disabled by default). */
export const ADVANCED_MODULES: AdvancedModuleDef[] = [
  {
    key: 'bus_tracking',
    label: 'Bus Tracking',
    description: 'Routes, buses, live GPS, student assignments',
  },
  { key: 'library_management', label: 'Library', description: 'Catalogue books and manage loans' },
  {
    key: 'inventory_management',
    label: 'Inventory',
    description: 'Stock items and IN/OUT movements',
  },
  {
    key: 'school_clinic',
    label: 'School Clinic',
    description: 'Clinic visits and medical records',
  },
];

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new Error(message ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export const advancedApi = {
  flags: () => authFetch('/feature-flags').then((r) => json<FeatureFlag[]>(r)),

  setFlag: (key: string, enabled: boolean) =>
    authFetch(`/feature-flags/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    }).then((r) => json<FeatureFlag>(r)),

  // Lightweight per-module reads/writes for the management panel.
  busRoutes: () =>
    authFetch('/bus/routes').then((r) => json<Array<{ id: string; name: string }>>(r)),
  createBusRoute: (name: string) =>
    authFetch('/bus/routes', { method: 'POST', body: JSON.stringify({ name }) }).then((r) =>
      json(r),
    ),

  books: () =>
    authFetch('/library/books').then((r) =>
      json<Array<{ id: string; title: string; copiesAvailable: number; copiesTotal: number }>>(r),
    ),
  createBook: (title: string, copiesTotal: number) =>
    authFetch('/library/books', {
      method: 'POST',
      body: JSON.stringify({ title, copiesTotal }),
    }).then((r) => json(r)),

  inventoryItems: () =>
    authFetch('/inventory/items').then((r) =>
      json<Array<{ id: string; name: string; quantity: number; unit?: string }>>(r),
    ),
  createItem: (name: string, quantity: number) =>
    authFetch('/inventory/items', {
      method: 'POST',
      body: JSON.stringify({ name, quantity }),
    }).then((r) => json(r)),

  clinicVisits: () =>
    authFetch('/clinic/visits').then((r) =>
      json<Array<{ id: string; reason: string; outcome: string; visitedAt: string }>>(r),
    ),
};
