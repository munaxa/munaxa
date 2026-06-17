'use client';

import { useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { useToast } from '@/components/toast';
import { parentsApi, type Parent, type UpdateParentInput } from '@/lib/people';
import { Button, Field, Input } from '@/components/ui';

/** Edit a guardian's contact details. Stacks on top of the student profile dialog. */
export function ParentEditDialog({
  parent,
  onClose,
  onSaved,
}: {
  parent: Parent;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [form, setForm] = useState<UpdateParentInput>({
    firstNameEn: parent.firstNameEn,
    lastNameEn: parent.lastNameEn,
    firstNameAr: parent.firstNameAr,
    lastNameAr: parent.lastNameAr,
    phone: parent.phone ?? '',
    nationalId: parent.nationalId ?? '',
    occupation: parent.occupation ?? '',
  });
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<UpdateParentInput>) => setForm((f) => ({ ...f, ...patch }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await parentsApi.update(parent.id, form);
      toast.success(t('people.parentUpdated'));
      await onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        className="relative my-8 w-full max-w-xl rounded-xl border border-border bg-card p-5 shadow-card"
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">{t('people.editParent')}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('common.cancel')}>
            ✕
          </Button>
        </div>

        <form onSubmit={(e) => void save(e)} className="grid gap-3 sm:grid-cols-2">
          <Field label={t('common.firstNameEn')}>
            <Input
              value={form.firstNameEn ?? ''}
              onChange={(e) => set({ firstNameEn: e.target.value })}
              required
            />
          </Field>
          <Field label={t('common.lastNameEn')}>
            <Input
              value={form.lastNameEn ?? ''}
              onChange={(e) => set({ lastNameEn: e.target.value })}
              required
            />
          </Field>
          <Field label="الاسم (AR)">
            <Input
              dir="rtl"
              value={form.firstNameAr ?? ''}
              onChange={(e) => set({ firstNameAr: e.target.value })}
              required
            />
          </Field>
          <Field label="العائلة (AR)">
            <Input
              dir="rtl"
              value={form.lastNameAr ?? ''}
              onChange={(e) => set({ lastNameAr: e.target.value })}
              required
            />
          </Field>
          <Field label={t('people.phone')}>
            <Input value={form.phone ?? ''} onChange={(e) => set({ phone: e.target.value })} />
          </Field>
          <Field label={t('people.nationalId')}>
            <Input
              value={form.nationalId ?? ''}
              onChange={(e) => set({ nationalId: e.target.value })}
            />
          </Field>
          <Field label={t('people.occupation')}>
            <Input
              value={form.occupation ?? ''}
              onChange={(e) => set({ occupation: e.target.value })}
            />
          </Field>
          <div className="col-span-full flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? t('common.saving') : t('common.saveChanges')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
