import { Badge } from '@/components/ui';
import type { EmploymentStatus } from '@/lib/people';

const TONE: Record<EmploymentStatus, 'success' | 'warning' | 'danger'> = {
  ACTIVE: 'success',
  ON_LEAVE: 'warning',
  TERMINATED: 'danger',
};

const LABEL: Record<EmploymentStatus, string> = {
  ACTIVE: 'Active',
  ON_LEAVE: 'On leave',
  TERMINATED: 'Terminated',
};

/** Renders an employment status as a colored badge. */
export function StatusBadge({ status }: { status: EmploymentStatus }) {
  return <Badge tone={TONE[status]}>{LABEL[status]}</Badge>;
}
