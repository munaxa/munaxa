'use client';

import type { PickerOption } from '@/components/entity-picker';
import { studentsApi } from './people';
import { sectionsApi } from './structure';

/** Module-level (stable) loaders so they can be passed straight to <EntityPicker load={…} />. */

export async function loadStudentOptions(): Promise<PickerOption[]> {
  const students = await studentsApi.list();
  return students.map((s) => ({
    id: s.id,
    label: `${s.firstNameEn} ${s.lastNameEn}`.trim() || s.qrCode,
    sublabel: s.qrCode,
  }));
}

export async function loadSectionOptions(): Promise<PickerOption[]> {
  const sections = await sectionsApi.list();
  return sections.map((s) => ({ id: s.id, label: `Section ${s.name}`, sublabel: s.id }));
}
