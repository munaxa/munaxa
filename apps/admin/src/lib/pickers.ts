'use client';

import type { PickerOption } from '@/components/entity-picker';
import { fullNameAr, fullNameEn, studentsApi } from './people';
import { sectionsApi } from './structure';

/** Module-level (stable) loaders so they can be passed straight to <EntityPicker load={…} />. */

export async function loadStudentOptions(): Promise<PickerOption[]> {
  const students = await studentsApi.list();
  return students.map((s) => ({
    id: s.id,
    // Full name (given · father · grandfather · family) so search matches any name part.
    label: fullNameEn(s) || fullNameAr(s) || s.qrCode,
    // Arabic full name in the sublabel keeps it searchable in Arabic too.
    sublabel: `${fullNameAr(s)} · ${s.nationalId ?? s.qrCode}`,
  }));
}

export async function loadSectionOptions(): Promise<PickerOption[]> {
  const sections = await sectionsApi.list();
  return sections.map((s) => ({ id: s.id, label: `Section ${s.name}`, sublabel: s.id }));
}
