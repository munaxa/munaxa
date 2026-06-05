'use client';

import { authFetch } from './auth';

export interface School {
  id: string;
  nameEn: string;
  nameAr: string;
  moeSchoolCode?: string | null;
  isActive: boolean;
}

export interface Campus {
  id: string;
  schoolId: string;
  nameEn: string;
  nameAr: string;
  isMain: boolean;
}

export interface Section {
  id: string;
  gradeId: string;
  name: string;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new Error(message ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export const schoolsApi = {
  list: () => authFetch('/schools').then((r) => json<School[]>(r)),
  create: (data: { nameEn: string; nameAr: string; moeSchoolCode?: string }) =>
    authFetch('/schools', { method: 'POST', body: JSON.stringify(data) }).then((r) =>
      json<School>(r),
    ),
  remove: (id: string) => authFetch(`/schools/${id}`, { method: 'DELETE' }).then(() => undefined),
};

export const campusesApi = {
  list: (schoolId: string) =>
    authFetch(`/campuses?schoolId=${encodeURIComponent(schoolId)}`).then((r) => json<Campus[]>(r)),
  create: (data: { schoolId: string; nameEn: string; nameAr: string; isMain?: boolean }) =>
    authFetch('/campuses', { method: 'POST', body: JSON.stringify(data) }).then((r) =>
      json<Campus>(r),
    ),
  remove: (id: string) => authFetch(`/campuses/${id}`, { method: 'DELETE' }).then(() => undefined),
};

export const sectionsApi = {
  list: (gradeId?: string) =>
    authFetch(`/sections${gradeId ? `?gradeId=${encodeURIComponent(gradeId)}` : ''}`).then((r) =>
      json<Section[]>(r),
    ),
};
