import type { DocumentLanguage} from '@prisma/client';
import { QuotePaymentMode } from '@prisma/client';
import type { DocumentLayout, LayoutBlock } from '../pdf/document-layout';
import { L, amount, dateStr, docNumber, money } from './util';

/** The permanent snapshot an agreement PDF is rendered from (stored verbatim, never recomputed). */
export interface AgreementSnapshot {
  agreementNo: number;
  version: number;
  academicYearName: string;
  registrationDate: string;
  studentNameEn: string;
  studentNameAr: string;
  studentNationalId?: string | null;
  parentNameEn?: string | null;
  parentNameAr?: string | null;
  parentPhone?: string | null;
  gradeName: string;
  sectionName?: string | null;
  paymentMode: QuotePaymentMode;
  installments: number;
  lines: Array<{ label: string; gross: string; discount: string; net: string }>;
  subtotal: string;
  totalDiscount: string;
  grandTotal: string;
  schedule: Array<{ index: number; dueDate: string | null; amount: string }>;
  /** Tenant-configurable legal wording; a neutral default is used when unset. */
  legalText: string;
  registrarName?: string | null;
}

export function buildAgreementLayout(
  s: AgreementSnapshot,
  language: DocumentLanguage,
): DocumentLayout {
  const blocks: LayoutBlock[] = [
    { kind: 'heading', text: L(language, 'Parties & Student', 'الأطراف والطالب') },
    {
      kind: 'fields',
      columns: 2,
      rows: [
        {
          label: L(language, 'Student (EN)', 'الطالب (إنجليزي)'),
          value: s.studentNameEn,
        },
        { label: L(language, 'Student (AR)', 'الطالب (عربي)'), value: s.studentNameAr },
        {
          label: L(language, 'National ID', 'الرقم الوطني'),
          value: s.studentNationalId ?? '—',
        },
        { label: L(language, 'Grade', 'الصف'), value: s.gradeName },
        { label: L(language, 'Section', 'الشعبة'), value: s.sectionName ?? '—' },
        {
          label: L(language, 'Parent / Guardian', 'ولي الأمر'),
          value: s.parentNameEn ?? s.parentNameAr ?? '—',
        },
        { label: L(language, 'Parent Phone', 'هاتف ولي الأمر'), value: s.parentPhone ?? '—' },
        { label: L(language, 'Academic Year', 'العام الدراسي'), value: s.academicYearName },
      ],
    },
    { kind: 'heading', text: L(language, 'Fee Breakdown', 'تفصيل الرسوم') },
    {
      kind: 'table',
      columns: [
        { header: L(language, 'Category', 'البند'), key: 'label', width: 2 },
        { header: L(language, 'Amount', 'المبلغ'), key: 'gross', align: 'right' },
        { header: L(language, 'Discount', 'الخصم'), key: 'discount', align: 'right' },
        { header: L(language, 'Net', 'الصافي'), key: 'net', align: 'right' },
      ],
      rows: s.lines.map((l) => ({
        label: l.label,
        gross: amount(l.gross),
        discount: amount(l.discount),
        net: amount(l.net),
      })),
      totalsRow: {
        label: L(language, 'Total', 'الإجمالي'),
        gross: amount(s.subtotal),
        discount: amount(s.totalDiscount),
        net: amount(s.grandTotal),
      },
    },
    {
      kind: 'totals',
      rows: [
        { label: L(language, 'Subtotal', 'المجموع الفرعي'), value: money(s.subtotal) },
        { label: L(language, 'Discounts', 'الخصومات'), value: money(s.totalDiscount) },
        { label: L(language, 'Grand Total', 'الإجمالي النهائي'), value: money(s.grandTotal) },
      ],
    },
    { kind: 'heading', text: L(language, 'Payment Plan', 'خطة الدفع') },
    {
      kind: 'fields',
      columns: 2,
      rows: [
        {
          label: L(language, 'Payment Mode', 'طريقة الدفع'),
          value:
            s.paymentMode === QuotePaymentMode.FULL
              ? L(language, 'Full Payment', 'دفعة كاملة')
              : L(language, 'Installments', 'أقساط'),
        },
        {
          label: L(language, 'Installments', 'عدد الأقساط'),
          value: String(s.installments),
        },
      ],
    },
  ];

  if (s.schedule.length > 0) {
    blocks.push({
      kind: 'table',
      columns: [
        { header: '#', key: 'index', width: 0.5 },
        { header: L(language, 'Due Date', 'تاريخ الاستحقاق'), key: 'dueDate' },
        { header: L(language, 'Amount', 'المبلغ'), key: 'amount', align: 'right' },
      ],
      rows: s.schedule.map((i) => ({
        index: i.index,
        dueDate: i.dueDate ?? '—',
        amount: amount(i.amount),
      })),
    });
  }

  blocks.push(
    { kind: 'spacer', size: 6 },
    { kind: 'paragraph', text: s.legalText, muted: false },
    {
      kind: 'signatures',
      blocks: [
        { label: L(language, 'Parent / Guardian', 'توقيع ولي الأمر') },
        {
          label: L(language, 'Registrar', 'المسجل'),
          ...(s.registrarName ? { name: s.registrarName } : {}),
        },
        { label: L(language, 'School Stamp', 'ختم المدرسة') },
      ],
    },
  );

  return {
    title: L(language, 'Registration Agreement', 'اتفاقية التسجيل'),
    subtitle: L(
      language,
      'A binding commitment between the school and the parent/guardian.',
      'التزام ملزم بين المدرسة وولي الأمر.',
    ),
    language,
    meta: [
      {
        label: L(language, 'Agreement No.', 'رقم الاتفاقية'),
        value: docNumber('AGR', s.agreementNo),
      },
      { label: L(language, 'Version', 'الإصدار'), value: `v${s.version}` },
      { label: L(language, 'Date', 'التاريخ'), value: dateStr(s.registrationDate) },
    ],
    blocks,
  };
}

export const DEFAULT_AGREEMENT_LEGAL_TEXT =
  'By signing below, the parent/guardian acknowledges and agrees to the fees and payment schedule ' +
  'set out above for the stated academic year, and undertakes to settle all amounts due on their ' +
  'respective dates in accordance with the school’s financial policy. This agreement constitutes a ' +
  'binding financial commitment between the school and the parent/guardian.';
