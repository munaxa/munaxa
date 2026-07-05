import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { BrandingContext, DocumentLayout, LayoutBlock, TableColumn } from './document-layout';

export interface RenderedPdf {
  buffer: Buffer;
  checksum: string; // sha256 hex
  byteSize: number;
}

const A4 = { margin: 48 } as const;
const INK = '#0f172a';
const MUTED = '#64748b';
const LINE = '#cbd5e1';
const ACCENT = '#1d4ed8';

/**
 * Renders a declarative {@link DocumentLayout} into a branded A4 PDF (Part 3). pdfkit is lazily
 * imported so it only loads when a document is actually produced (mirrors ExportService). The
 * renderer is deliberately layout-agnostic: it knows how to draw a header, fields, tables, totals
 * and a signature block, and every official document is expressed as data for it to render.
 *
 * Arabic note: pdfkit's built-in fonts cover Latin only. When AR/BILINGUAL output is requested and
 * an Arabic-capable TTF is configured via PDF_ARABIC_FONT_PATH, it is embedded so Arabic strings in
 * the data render correctly; otherwise the standard font is used (Arabic glyphs may not display).
 */
@Injectable()
export class PdfRenderer {
  async render(layout: DocumentLayout, branding: BrandingContext): Promise<RenderedPdf> {
    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument({ size: 'A4', margin: A4.margin, bufferPages: true });
    const chunks: Buffer[] = [];
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    this.maybeEmbedArabicFont(doc);
    this.drawHeader(doc, layout, branding);
    for (const block of layout.blocks) this.drawBlock(doc, block);
    this.drawFooters(doc, layout, branding);

    doc.end();
    const buffer = await done;
    return {
      buffer,
      checksum: createHash('sha256').update(buffer).digest('hex'),
      byteSize: buffer.byteLength,
    };
  }

  // ── header ────────────────────────────────────────────────────────────────
  private drawHeader(doc: PDFKit.PDFDocument, layout: DocumentLayout, b: BrandingContext): void {
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const top = doc.page.margins.top;
    let textX = left;

    if (b.logo) {
      try {
        doc.image(b.logo, left, top, { fit: [64, 64] });
        textX = left + 76;
      } catch {
        /* ignore unreadable image — fall back to text header */
      }
    }

    doc
      .fillColor(INK)
      .font('Helvetica-Bold')
      .fontSize(15)
      .text(b.nameEn, textX, top, {
        width: right - textX,
      });
    if (b.nameAr) {
      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor(INK)
        .text(b.nameAr, textX, doc.y, {
          width: right - textX,
        });
    }
    const contact = [b.addressLines.join(', '), b.phone, b.email, b.website]
      .filter((s): s is string => Boolean(s && s.trim()))
      .join('  ·  ');
    if (contact) {
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(MUTED)
        .text(contact, textX, doc.y + 1, {
          width: right - textX,
        });
    }

    const headerBottom = Math.max(doc.y, top + (b.logo ? 64 : 0)) + 8;
    doc
      .moveTo(left, headerBottom)
      .lineTo(right, headerBottom)
      .lineWidth(1)
      .strokeColor(ACCENT)
      .stroke();

    // Title + meta box.
    doc.y = headerBottom + 14;
    const titleWidth = layout.meta && layout.meta.length > 0 ? (right - left) * 0.6 : right - left;
    const titleTop = doc.y;
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(16).text(layout.title, left, titleTop, {
      width: titleWidth,
    });
    if (layout.subtitle) {
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(MUTED)
        .text(layout.subtitle, left, doc.y + 1, {
          width: titleWidth,
        });
    }
    const afterTitle = doc.y;

    if (layout.meta && layout.meta.length > 0) {
      const boxW = (right - left) * 0.36;
      const boxX = right - boxW;
      let metaY = titleTop;
      for (const m of layout.meta) {
        doc
          .font('Helvetica-Bold')
          .fontSize(8)
          .fillColor(MUTED)
          .text(m.label.toUpperCase(), boxX, metaY, {
            width: boxW,
            align: 'right',
          });
        doc.font('Helvetica').fontSize(10).fillColor(INK).text(m.value, boxX, doc.y, {
          width: boxW,
          align: 'right',
        });
        metaY = doc.y + 4;
      }
    }
    doc.y = Math.max(afterTitle, doc.y) + 12;
    doc.x = left;
  }

  // ── blocks ──────────────────────────────────────────────────────────────
  private drawBlock(doc: PDFKit.PDFDocument, block: LayoutBlock): void {
    this.ensureSpace(doc, 40);
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;
    doc.x = left;

    switch (block.kind) {
      case 'spacer':
        doc.y += block.size ?? 10;
        return;
      case 'heading':
        doc.moveDown(0.3);
        doc.font('Helvetica-Bold').fontSize(11).fillColor(ACCENT).text(block.text, left, doc.y, {
          width,
        });
        doc.moveDown(0.2);
        return;
      case 'paragraph':
        doc
          .font('Helvetica')
          .fontSize(9.5)
          .fillColor(block.muted ? MUTED : INK)
          .text(block.text, left, doc.y, { width, align: 'left', lineGap: 2 });
        doc.moveDown(0.4);
        return;
      case 'fields':
        this.drawFields(doc, block.rows, block.columns ?? 2);
        return;
      case 'totals':
        this.drawTotals(doc, block.rows);
        return;
      case 'table':
        this.drawTable(doc, block.columns, block.rows, block.totalsRow);
        return;
      case 'signatures':
        this.drawSignatures(doc, block.blocks);
        return;
    }
  }

  private drawFields(
    doc: PDFKit.PDFDocument,
    rows: Array<{ label: string; value: string }>,
    columns: number,
  ): void {
    const left = doc.page.margins.left;
    const width = doc.page.width - doc.page.margins.right - left;
    const colW = width / columns;
    const rowH = 30;
    let i = 0;
    for (const row of rows) {
      const col = i % columns;
      if (col === 0) this.ensureSpace(doc, rowH);
      const x = left + col * colW;
      const y = doc.y;
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(MUTED)
        .text(row.label.toUpperCase(), x, y, {
          width: colW - 8,
        });
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(INK)
        .text(row.value || '—', x, y + 11, {
          width: colW - 8,
        });
      i += 1;
      if (col === columns - 1) doc.y = y + rowH;
      else doc.y = y; // keep same row baseline for remaining columns
    }
    // If the last row was not full, advance past it.
    if (rows.length % columns !== 0) doc.y += rowH;
    doc.moveDown(0.2);
  }

  private drawTotals(doc: PDFKit.PDFDocument, rows: Array<{ label: string; value: string }>): void {
    const right = doc.page.width - doc.page.margins.right;
    const boxW = 240;
    const x = right - boxW;
    for (const [idx, row] of rows.entries()) {
      this.ensureSpace(doc, 18);
      const y = doc.y;
      const last = idx === rows.length - 1;
      doc
        .font(last ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(last ? 11 : 9.5)
        .fillColor(last ? INK : MUTED)
        .text(row.label, x, y, { width: boxW * 0.55 });
      doc
        .font('Helvetica-Bold')
        .fontSize(last ? 11 : 9.5)
        .fillColor(last ? ACCENT : INK)
        .text(row.value, x + boxW * 0.55, y, { width: boxW * 0.45, align: 'right' });
      doc.y = y + (last ? 18 : 15);
    }
    doc.moveDown(0.3);
  }

  private drawTable(
    doc: PDFKit.PDFDocument,
    columns: TableColumn[],
    rows: Array<Record<string, string | number>>,
    totalsRow?: Record<string, string | number>,
  ): void {
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;
    const weights = columns.map((c) => c.width ?? 1);
    const weightSum = weights.reduce((a, w) => a + w, 0);
    const widths = weights.map((w) => (w / weightSum) * width);
    const colX = (i: number) => left + widths.slice(0, i).reduce((a, w) => a + w, 0);

    const drawRow = (record: Record<string, string | number>, bold: boolean) => {
      // Measure tallest cell for wrapping.
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
      const heights = columns.map((c, i) =>
        doc.heightOfString(String(record[c.key] ?? ''), { width: widths[i]! - 8 }),
      );
      const rowH = Math.max(14, ...heights) + 6;
      this.ensureSpace(doc, rowH);
      const y = doc.y;
      columns.forEach((c, i) => {
        doc
          .fillColor(bold ? INK : '#1e293b')
          .text(String(record[c.key] ?? ''), colX(i) + 4, y + 3, {
            width: widths[i]! - 8,
            align: c.align ?? 'left',
          });
      });
      doc.y = y + rowH;
      doc.moveTo(left, doc.y).lineTo(right, doc.y).lineWidth(0.5).strokeColor(LINE).stroke();
    };

    // Header band.
    this.ensureSpace(doc, 20);
    const hy = doc.y;
    doc.rect(left, hy, width, 18).fill('#eef2ff');
    doc.fillColor(ACCENT).font('Helvetica-Bold').fontSize(8.5);
    columns.forEach((c, i) => {
      doc.text(c.header.toUpperCase(), colX(i) + 4, hy + 5, {
        width: widths[i]! - 8,
        align: c.align ?? 'left',
      });
    });
    doc.y = hy + 18;
    doc.moveTo(left, doc.y).lineTo(right, doc.y).lineWidth(0.5).strokeColor(LINE).stroke();

    for (const row of rows) drawRow(row, false);
    if (totalsRow) drawRow(totalsRow, true);
    doc.moveDown(0.4);
  }

  private drawSignatures(
    doc: PDFKit.PDFDocument,
    blocks: Array<{ label: string; name?: string }>,
  ): void {
    this.ensureSpace(doc, 80);
    const left = doc.page.margins.left;
    const width = doc.page.width - doc.page.margins.right - left;
    const colW = width / blocks.length;
    const y = doc.y + 30;
    blocks.forEach((blk, i) => {
      const x = left + i * colW;
      doc
        .moveTo(x, y)
        .lineTo(x + colW - 24, y)
        .lineWidth(0.7)
        .strokeColor(INK)
        .stroke();
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(INK)
        .text(blk.label, x, y + 5, {
          width: colW - 24,
        });
      if (blk.name) {
        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(MUTED)
          .text(blk.name, x, doc.y, {
            width: colW - 24,
          });
      }
    });
    doc.y = y + 50;
  }

  // ── footer (buffered pages: page numbers + footer note) ───────────────────
  private drawFooters(doc: PDFKit.PDFDocument, layout: DocumentLayout, b: BrandingContext): void {
    const note = layout.footer ?? b.footerNote ?? b.legalName ?? b.nameEn;
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i);
      const left = doc.page.margins.left;
      const right = doc.page.width - doc.page.margins.right;
      const y = doc.page.height - doc.page.margins.bottom + 8;
      doc.moveTo(left, y).lineTo(right, y).lineWidth(0.5).strokeColor(LINE).stroke();
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor(MUTED)
        .text(note, left, y + 4, {
          width: (right - left) * 0.75,
        });
      doc.text(`Page ${i - range.start + 1} of ${range.count}`, left, y + 4, {
        width: right - left,
        align: 'right',
      });
    }
  }

  // ── helpers ───────────────────────────────────────────────────────────────
  private ensureSpace(doc: PDFKit.PDFDocument, needed: number): void {
    const bottom = doc.page.height - doc.page.margins.bottom;
    if (doc.y + needed > bottom) doc.addPage();
  }

  private maybeEmbedArabicFont(doc: PDFKit.PDFDocument): void {
    const path = process.env.PDF_ARABIC_FONT_PATH;
    if (!path) return;
    try {
      doc.registerFont('Helvetica', path);
      doc.registerFont('Helvetica-Bold', path);
    } catch {
      /* keep built-in fonts if the configured font cannot be loaded */
    }
  }
}
