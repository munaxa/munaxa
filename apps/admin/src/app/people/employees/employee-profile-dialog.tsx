'use client';

import { useI18n } from '@/components/i18n-provider';
import { StatusBadge } from '@/components/status-badge';
import type { Employee } from '@/lib/people';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';

/**
 * Read-only employee profile shown in a modal when an employee name is clicked. Mirrors the
 * student profile dialog. A placeholder marks the richer HR data (payroll, contracts, leave,
 * documents) that the full HR module will add later.
 */
export function EmployeeProfileDialog({
  employee,
  onClose,
  onEdit,
}: {
  employee: Employee;
  onClose: () => void;
  onEdit: () => void;
}) {
  const { t } = useI18n();
  const initials = `${employee.firstNameEn[0] ?? ''}${employee.lastNameEn[0] ?? ''}`.toUpperCase();

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
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
                  {employee.firstNameEn} {employee.lastNameEn}
                </h2>
                <span className="text-muted-foreground" dir="rtl">
                  {employee.firstNameAr} {employee.lastNameAr}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <StatusBadge status={employee.status} />
                <Badge tone="muted">{employee.jobTitle}</Badge>
                {employee.department ? <Badge tone="muted">{employee.department}</Badge> : null}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              {t('people.edit')}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('common.cancel')}>
              ✕
            </Button>
          </div>
        </div>

        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle>{t('people.employeeDetails')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
            <Detail label={t('people.jobTitle')} value={employee.jobTitle} />
            <Detail label={t('people.department')} value={employee.department} />
            <Detail label={t('common.status')} value={employee.status} />
            <Detail
              label={t('people.joined')}
              value={employee.createdAt ? employee.createdAt.slice(0, 10) : null}
              mono
            />
          </CardContent>
        </Card>

        {/* Forward-looking placeholder for the full HR module */}
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            {t('people.hrComingSoon')}
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
