'use client';

import { useI18n } from '@/components/i18n-provider';
import { StatusBadge } from '@/components/status-badge';
import type { Teacher } from '@/lib/people';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';

/**
 * Read-only teacher profile shown when a teacher name is clicked in the unified Staff directory.
 * Mirrors the employee profile dialog. Teaching assignments stay managed on the Teachers tab.
 */
export function TeacherProfileDialog({
  teacher,
  onClose,
}: {
  teacher: Teacher;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const initials = `${teacher.firstNameEn[0] ?? ''}${teacher.lastNameEn[0] ?? ''}`.toUpperCase();

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4">
      <div className="absolute inset-0 bg-foreground/40" onClick={onClose} aria-hidden="true" />
      <div
        className="relative my-8 w-full max-w-2xl space-y-4 rounded-xl border border-border bg-card p-5 shadow-card"
        role="dialog"
        aria-modal="true"
      >
        {/* Identity header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-secondary font-display text-xl font-semibold">
              {initials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-x-3">
                <h2 className="font-display text-xl font-semibold">
                  {teacher.firstNameEn} {teacher.lastNameEn}
                </h2>
                <span className="text-muted-foreground" dir="rtl">
                  {teacher.firstNameAr} {teacher.lastNameAr}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <StatusBadge status={teacher.status} />
                <Badge tone="muted">{t('people.typeTeacher')}</Badge>
                {teacher.specialization ? (
                  <Badge tone="muted">{teacher.specialization}</Badge>
                ) : null}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('common.cancel')}>
            ✕
          </Button>
        </div>

        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle>{t('people.teacherDetails')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
            <Detail label={t('people.specialization')} value={teacher.specialization} />
            <Detail label={t('people.employeeNumber')} value={teacher.employeeNumber} mono />
            <Detail label={t('common.status')} value={teacher.status} />
          </CardContent>
        </Card>

        {/* Forward-looking placeholder */}
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            {t('people.manageInTeachers')}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string | null | undefined;
  mono?: boolean | undefined;
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={`text-sm ${mono ? 'font-mono' : ''}`}>{value || '—'}</div>
    </div>
  );
}
