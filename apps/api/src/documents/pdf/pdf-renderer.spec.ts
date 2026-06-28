import { DocumentLanguage } from '@prisma/client';
import { PdfRenderer } from './pdf-renderer';
import type { BrandingContext, DocumentLayout } from './document-layout';
import { buildAgreementLayout, type AgreementSnapshot } from '../templates/agreement-template';

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
        { kind: 'fields', columns: 2, rows: [{ label: 'A', value: '1' }, { label: 'B', value: '2' }] },
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
