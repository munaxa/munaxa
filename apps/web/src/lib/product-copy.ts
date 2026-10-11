import type { BrandedProductId } from '@munaxa/ui';

/**
 * Short product copy shared by more than one surface: the hub's product chapters and the welcome
 * email a visitor receives after asking for a demo. Each product page keeps its own longer copy.
 */
export interface ProductCopy {
  /** The descriptor under the product name, e.g. "Human Capital Management". */
  tagline: string;
  /** One paragraph saying what the product is. */
  summary: string;
  /** The four headline capabilities. */
  points: { t: string; d: string }[];
}

export const productCopy: Record<BrandedProductId, ProductCopy> = {
  school: {
    tagline: 'The School Operating System',
    summary:
      'Munaxa School runs the whole school day in one system: people, timetables, attendance, academics, finance and communication with families, in Arabic and English.',
    points: [
      {
        t: 'Timetable engine',
        d: 'Builds the week and resolves teacher, room and class conflicts for you.',
      },
      {
        t: 'Attendance to report cards',
        d: 'Daily attendance, grading and report cards on one academic record.',
      },
      {
        t: 'Fees and collections',
        d: 'Billing, payments and outstanding balances in the same system.',
      },
      {
        t: 'Apps for every family',
        d: 'Mobile apps for parents, students and teachers, plus a parent portal on the web.',
      },
    ],
  },
  work: {
    tagline: 'Human Capital Management',
    summary:
      'Munaxa Work keeps one employee record, from offer to payslip. Hiring, onboarding, attendance, leave, payroll and performance read and write the same record, so nothing is typed in twice.',
    points: [
      {
        t: 'Hire to retire',
        d: 'Pipelines, offers and onboarding checklists that turn a candidate into an employee.',
      },
      {
        t: 'Attendance and leave',
        d: 'Your leave policies and overtime rules, applied automatically.',
      },
      {
        t: 'Payroll by exception',
        d: 'Attendance and leave flow into the run. You review only what needs a decision.',
      },
      {
        t: 'Performance cycles',
        d: 'Goals, check-ins and calibrated reviews on the same record.',
      },
    ],
  },
  docs: {
    tagline: 'Document Management',
    summary:
      'Munaxa Docs turns every document into a controlled record, with a lifecycle, permanent numbering, approvals, e-signatures and a tamper-proof audit trail, for organizations that answer to auditors.',
    points: [
      {
        t: 'Controlled lifecycle',
        d: 'Draft to retired, with a permanent number assigned on approval.',
      },
      {
        t: 'Workflows that keep moving',
        d: 'Deadlines, delegation and automatic escalation on every approval step.',
      },
      {
        t: 'Witnessed e-signatures',
        d: 'Identity is re-verified at signing, and the meaning of each signature is recorded.',
      },
      {
        t: 'Search inside every file',
        d: 'OCR and full-text search, filtered by what each user is allowed to see.',
      },
    ],
  },
};
