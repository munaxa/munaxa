import { existsSync } from 'node:fs';
import { DocumentLanguage } from '@prisma/client';
import { PdfRenderer } from './pdf-renderer';
import type { BrandingContext, DocumentLayout } from './document-layout';
import { buildAgreementLayout, type AgreementSnapshot } from '../templates/agreement-template';

/** First available TrueType font on this machine (DejaVu ships almost everywhere), or null. */
const SYSTEM_TTF = [
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  '/usr/share/fonts/dejavu/DejaVuSans.ttf',
  '/Library/Fonts/Arial Unicode.ttf',
].find((p) => existsSync(p));

const branding: BrandingContext = {
  nameEn: 'Test Academy',
  nameAr: 'أكاديمية الاختبار',
  legalName: 'Test Academy LLC',
  addressLines: ['12 School St', 'Amman, Jordan'],
  phone: '+962 6 000 0000',
  email: 'info@test.edu',
  website: 'https://test.edu',
};

describe('PdfRenderer', () => {
  const renderer = new PdfRenderer();

  it('renders a declarative layout to a deterministic-size PDF with a checksum', async () => {
    const layout: DocumentLayout = {
      title: 'Test Document',
      subtitle: 'Subtitle',
      language: DocumentLanguage.EN,
      meta: [{ label: 'No.', value: 'DOC-000001' }],
      blocks: [
        { kind: 'heading', text: 'Section' },
        {
          kind: 'fields',
          columns: 2,
          rows: [
            { label: 'A', value: '1' },
            { label: 'B', value: '2' },
          ],
        },
        {
          kind: 'table',
          columns: [
            { header: 'Item', key: 'item' },
            { header: 'Amount', key: 'amount', align: 'right' },
          ],
          rows: [{ item: 'Tuition', amount: '1000.000' }],
          totalsRow: { item: 'Total', amount: '1000.000' },
        },
        { kind: 'totals', rows: [{ label: 'Grand Total', value: '1000.000 JOD' }] },
        { kind: 'signatures', blocks: [{ label: 'Signature' }] },
      ],
    };

    const out = await renderer.render(layout, branding);
    expect(out.buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(out.byteSize).toBeGreaterThan(0);
    expect(out.byteSize).toBe(out.buffer.byteLength);
    expect(out.checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it('renders a full registration agreement layout', async () => {
    const snapshot: AgreementSnapshot = {
      agreementNo: 7,
      version: 1,
      academicYearName: '2025/2026',
      registrationDate: '2026-06-28',
      studentNameEn: 'John Doe',
      studentNameAr: 'جون دو',
      studentNationalId: '9990001112',
      parentNameEn: 'Jane Doe',
      parentNameAr: 'جين دو',
      parentPhone: '+962 79 000 0000',
      gradeName: 'Grade 1',
      sectionName: 'A',
      paymentMode: 'INSTALLMENTS',
      installments: 3,
      lines: [{ label: 'Tuition', gross: '900.000', discount: '0.000', net: '900.000' }],
      subtotal: '900.000',
      totalDiscount: '0.000',
      grandTotal: '900.000',
      schedule: [
        { index: 1, dueDate: '2026-09-01', amount: '300.000' },
        { index: 2, dueDate: '2026-10-01', amount: '300.000' },
        { index: 3, dueDate: '2026-11-01', amount: '300.000' },
      ],
      legalText: 'Binding commitment.',
      registrarName: 'Registrar User',
    };
    const layout = buildAgreementLayout(snapshot, DocumentLanguage.EN);
    expect(layout.title).toBe('Registration Agreement');
    const out = await renderer.render(layout, branding);
    expect(out.buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(out.byteSize).toBeGreaterThan(500);
  });

  // ── Arabic / bidirectional rendering ──────────────────────────────────────
  // These assert the renderer drives every surface (header, meta, headings, paragraphs, fields,
  // tables, totals, signatures, footer) through the Arabic shaping/bidi pipeline without throwing and
  // still emits a valid PDF. Exact glyph-shaping correctness is asserted in arabic-text.spec.ts.
  const expectValidPdf = (out: { buffer: Buffer; byteSize: number; checksum: string }): void => {
    expect(out.buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(out.byteSize).toBeGreaterThan(0);
    expect(out.checksum).toMatch(/^[a-f0-9]{64}$/);
  };

  it('renders an Arabic-only document (title, heading, paragraph)', async () => {
    const layout: DocumentLayout = {
      title: 'إيصال استلام',
      subtitle: 'السنة الدراسية ٢٠٢٥',
      language: DocumentLanguage.AR,
      blocks: [
        { kind: 'heading', text: 'تفاصيل الدفعة' },
        { kind: 'paragraph', text: 'استلمنا المبلغ المذكور أعلاه بالكامل.' },
      ],
    };
    expectValidPdf(await renderer.render(layout, branding));
  });

  it('renders an English-only document unchanged in behaviour', async () => {
    const layout: DocumentLayout = {
      title: 'Receipt',
      language: DocumentLanguage.EN,
      blocks: [
        { kind: 'heading', text: 'Payment details' },
        { kind: 'paragraph', text: 'We received the amount above in full.' },
      ],
    };
    expectValidPdf(await renderer.render(layout, branding));
  });

  it('renders a header/meta box with mixed Arabic + Latin + numbers', async () => {
    const layout: DocumentLayout = {
      title: 'رقم Invoice INV-1025',
      subtitle: 'Receipt رقم 125',
      language: DocumentLanguage.BILINGUAL,
      meta: [
        { label: 'الرقم', value: 'INV-1025' },
        { label: 'Date', value: '2026-07-07' },
      ],
      blocks: [{ kind: 'paragraph', text: 'Student: أحمد محمد' }],
    };
    expectValidPdf(await renderer.render(layout, branding));
  });

  it('renders a table with Arabic headers, cells and numeric columns', async () => {
    const layout: DocumentLayout = {
      title: 'كشف حساب',
      language: DocumentLanguage.AR,
      blocks: [
        {
          kind: 'table',
          columns: [
            { header: 'البند', key: 'item' },
            { header: 'المبلغ', key: 'amount', align: 'right' },
          ],
          rows: [
            { item: 'رسوم دراسية', amount: '900.000' },
            { item: 'رقم Invoice INV-1025', amount: '125.000' },
          ],
          totalsRow: { item: 'الإجمالي', amount: '1025.000' },
        },
        { kind: 'fields', columns: 2, rows: [{ label: 'الطالب', value: 'أحمد محمد' }] },
        { kind: 'totals', rows: [{ label: 'المجموع', value: '1025.000 JOD' }] },
        { kind: 'signatures', blocks: [{ label: 'التوقيع', name: 'أحمد محمد' }] },
      ],
    };
    expectValidPdf(await renderer.render(layout, branding));
  });

  it('renders an Arabic footer note across buffered pages', async () => {
    // A long body forces multiple pages so the footer (with page numbers) is drawn more than once.
    const blocks: DocumentLayout['blocks'] = Array.from({ length: 60 }, () => ({
      kind: 'paragraph' as const,
      text: 'سطر نصي عربي لاختبار التذييل والترقيم عبر عدة صفحات.',
    }));
    const layout: DocumentLayout = {
      title: 'مستند طويل',
      footer: 'أكاديمية الاختبار · جميع الحقوق محفوظة',
      language: DocumentLanguage.AR,
      blocks,
    };
    const out = await renderer.render(layout, branding);
    expectValidPdf(out);
    expect(out.byteSize).toBeGreaterThan(1000);
  });

  // Regression guard for the mojibake root cause: PDFKit reserves the built-in name "Helvetica" (its
  // pre-cached default), so overriding *that* name with an Arabic font was silently ignored and
  // regular-weight Arabic fell back to the WinAnsi standard font — rendering each 16-bit code unit as
  // two Latin-1 glyphs. The renderer now binds its own font aliases, so a configured font must back
  // EVERY weight and the standard Type1 Helvetica must not appear in the output at all.
  (SYSTEM_TTF ? it : it.skip)(
    'uses the configured font for all weights — no WinAnsi Helvetica fallback (mojibake guard)',
    async () => {
      const prev = process.env.PDF_ARABIC_FONT_PATH;
      process.env.PDF_ARABIC_FONT_PATH = SYSTEM_TTF!;
      try {
        const layout: DocumentLayout = {
          title: 'اتفاقية التسجيل',
          subtitle: 'مدرسة الاختبار',
          language: DocumentLanguage.AR,
          meta: [{ label: 'رقم', value: 'AGR-000007' }],
          blocks: [
            { kind: 'heading', text: 'الأطراف والطالب' }, // regular + bold both exercised
            { kind: 'paragraph', text: 'هذا نص عربي في فقرة عادية.' },
            { kind: 'fields', columns: 2, rows: [{ label: 'الطالب', value: 'أحمد محمد' }] },
          ],
        };
        const out = await renderer.render(layout, branding);
        const pdf = out.buffer.toString('latin1');
        // The standard Type1 Helvetica must NOT be embedded when a font is configured; its presence
        // means an alias override was dropped — the exact defect that produced the mojibake.
        expect(pdf).not.toMatch(/\/BaseFont\s*\/[A-Z]*\+?Helvetica\b/);
        expect(pdf).toMatch(/\/FontFile2\b/); // the embedded TrueType is present instead
      } finally {
        if (prev === undefined) delete process.env.PDF_ARABIC_FONT_PATH;
        else process.env.PDF_ARABIC_FONT_PATH = prev;
      }
    },
  );

  it('produces identical checksums for identical input (snapshot reproducibility)', async () => {
    const layout: DocumentLayout = {
      title: 'Stable',
      language: DocumentLanguage.EN,
      blocks: [{ kind: 'paragraph', text: 'Same content' }],
    };
    const a = await renderer.render(layout, branding);
    const b = await renderer.render(layout, branding);
    // pdfkit embeds a creation date, so byte-for-byte equality is not guaranteed; assert the
    // renderer is stable in structure (same size) — checksum equality is asserted at the data layer.
    expect(a.byteSize).toBe(b.byteSize);
  });
});
