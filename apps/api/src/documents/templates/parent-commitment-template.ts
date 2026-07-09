import { DocumentLanguage } from '@prisma/client';
import type { DocumentLayout, LayoutBlock } from '../pdf/document-layout';
import { L, amount, dateStr, docNumber, money } from './util';

/**
 * The permanent snapshot a Parent Financial Commitment & Undertaking is rendered from. Stored verbatim
 * (never recomputed) so a printed/signed copy always reprints byte-identically — it is a legal record.
 */
export interface ParentCommitmentSnapshot {
  commitmentNo: number;
  academicYearName: string;
  issueDate: string;
  /** Student identity (both scripts kept so the label's own script signals the name's language). */
  studentNameEn: string;
  studentNameAr: string;
  studentNumber: string;
  gradeName: string;
  sectionName?: string | null;
  /** Parent / guardian identity. */
  parentNameEn: string;
  parentNameAr?: string | null;
  parentNationalId: string;
  parentPhone: string;
  parentAddress?: string | null;
  /** Financial summary lines (fils-precision strings from the ledger; discount is a positive figure). */
  fees: {
    registration: string;
    tuition: string;
    transportation: string;
    activities: string;
    discount: string;
    total: string;
  };
  schedule: Array<{ index: number; dueDate: string | null; amount: string }>;
  /**
   * Tenant-configurable legal undertaking, as an ordered list of clauses embedded verbatim (Part 7
   * school settings). English and Arabic are parallel arrays rendered as a mirrored two-column,
   * numbered declaration; a single-language document uses only its own side.
   */
  legalClausesEn: string[];
  legalClausesAr: string[];
  representativeName?: string | null;
}

/**
 * The master enterprise-document template. Every section is a reusable {@link LayoutBlock}, so this
 * document shares the exact same header/footer, information blocks, table, totals, legal-text and
 * signature components — and therefore the same spacing, typography, colours and branding — as every
 * other Munaxa document. New document types are built the same way: compose blocks, never draw.
 */
export function buildParentCommitmentLayout(
  s: ParentCommitmentSnapshot,
  language: DocumentLanguage,
): DocumentLayout {
  const blocks: LayoutBlock[] = [
    // ---- Student information -------------------------------------------------------------------
    { kind: 'heading', text: L(language, 'Student Information', 'معلومات الطالب') },
    {
      kind: 'fields',
      columns: 2,
      rows: [
        { label: 'Student', value: s.studentNameEn },
        { label: 'الطالب', value: s.studentNameAr },
        { label: L(language, 'Student No.', 'الرقم الطلابي'), value: s.studentNumber },
        { label: L(language, 'Academic Year', 'العام الدراسي'), value: s.academicYearName },
        { label: L(language, 'Grade', 'الصف'), value: s.gradeName },
        { label: L(language, 'Section', 'الشعبة'), value: s.sectionName ?? '—' },
      ],
    },

    // ---- Parent / guardian information ---------------------------------------------------------
    { kind: 'heading', text: L(language, 'Parent / Guardian Information', 'معلومات ولي الأمر') },
    {
      kind: 'fields',
      columns: 2,
      rows: [
        { label: 'Parent / Guardian', value: s.parentNameEn },
        { label: 'ولي الأمر', value: s.parentNameAr ?? s.parentNameEn },
        { label: L(language, 'National ID', 'الرقم الوطني'), value: s.parentNationalId },
        { label: L(language, 'Phone', 'الهاتف'), value: s.parentPhone },
        { label: L(language, 'Address', 'العنوان'), value: s.parentAddress ?? '—' },
      ],
    },

    // ---- Financial summary --------------------------------------------------------------------
    { kind: 'heading', text: L(language, 'Financial Summary', 'الملخص المالي') },
    {
      kind: 'table',
      columns: [
        { header: L(language, 'Item', 'البند'), key: 'item', width: 2 },
        { header: L(language, 'Amount', 'المبلغ'), key: 'amount', align: 'right' },
      ],
      rows: [
        {
          item: L(language, 'Registration Fees', 'رسوم التسجيل'),
          amount: amount(s.fees.registration),
        },
        { item: L(language, 'Tuition Fees', 'الرسوم الدراسية'), amount: amount(s.fees.tuition) },
        { item: L(language, 'Transportation', 'النقل'), amount: amount(s.fees.transportation) },
        { item: L(language, 'Activities', 'الأنشطة'), amount: amount(s.fees.activities) },
        { item: L(language, 'Discounts', 'الخصومات'), amount: `-${amount(s.fees.discount)}` },
      ],
      totalsRow: {
        item: L(language, 'Total Amount', 'إجمالي المبلغ'),
        amount: amount(s.fees.total),
      },
    },
    {
      kind: 'totals',
      rows: [{ label: L(language, 'Grand Total', 'الإجمالي النهائي'), value: money(s.fees.total) }],
    },
  ];

  if (s.schedule.length > 0) {
    blocks.push(
      { kind: 'heading', text: L(language, 'Installment Schedule', 'جدول الأقساط') },
      {
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
      },
    );
  }

  // ---- Legal undertaking (embedded verbatim, mirrored two-column) -----------------------------
  blocks.push(
    { kind: 'heading', text: L(language, 'Acknowledgement & Undertaking', 'الإقرار والتعهد') },
    {
      kind: 'legal',
      en: language === DocumentLanguage.AR ? [] : s.legalClausesEn,
      ar: language === DocumentLanguage.EN ? [] : s.legalClausesAr,
    },
    { kind: 'spacer', size: 8 },
    {
      kind: 'signatures',
      blocks: [
        {
          label: L(language, 'Parent / Guardian Signature', 'توقيع ولي الأمر'),
          name: s.parentNameAr ?? s.parentNameEn,
        },
        {
          label: L(language, 'School Representative', 'ممثل المدرسة'),
          ...(s.representativeName ? { name: s.representativeName } : {}),
        },
        { label: L(language, 'Official Stamp', 'الختم الرسمي') },
      ],
    },
  );

  return {
    title: L(language, 'Parent Financial Commitment & Undertaking', 'تعهد والتزام مالي لولي الأمر'),
    subtitle: L(
      language,
      'A binding financial commitment for the stated academic year.',
      'التزام مالي ملزم للعام الدراسي المذكور.',
    ),
    language,
    meta: [
      {
        label: L(language, 'Document No.', 'رقم الوثيقة'),
        value: docNumber('COM', s.commitmentNo),
      },
      { label: L(language, 'Academic Year', 'العام الدراسي'), value: s.academicYearName },
      { label: L(language, 'Date', 'التاريخ'), value: dateStr(s.issueDate) },
    ],
    blocks,
  };
}

/**
 * Placeholder default ONLY. The real, legally binding undertaking clauses are set per school in the
 * Organization settings and embedded verbatim — they are never authored or edited here. These neutral
 * bracketed notes make an unconfigured tenant obvious rather than shipping invented legal text.
 */
export const DEFAULT_PARENT_COMMITMENT_LEGAL_CLAUSES_EN: string[] = [
  '[ The binding undertaking clauses are configured per school in Organization settings and embedded verbatim. ]',
];
export const DEFAULT_PARENT_COMMITMENT_LEGAL_CLAUSES_AR: string[] = [
  '[ تُضبط بنود التعهد والالتزام المالي من إعدادات المدرسة وتُدرج كما هي. ]',
];
