import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { BrandingContext, DocumentLayout, LayoutBlock, TableColumn } from './document-layout';
import { containsArabic, shapeForPdf } from './arabic-text';

/**
 * Bundled Arabic font (Noto Naskh Arabic, OFL; see fonts/LICENSE.txt), copied next to the compiled
 * output by nest-cli's asset step so it resolves from `__dirname` in both ts-jest (src) and production
 * (dist). Noto Naskh is a production-quality naskh face whose Arabic *presentation-form* glyphs are
 * self-connecting — the shape we hand PDFKit — so our pre-shaped output renders cleanly (GPOS-only faces
 * such as Amiri leave gaps on pre-shaped forms). Defaulting to it guarantees Arabic never silently falls
 * back to a Latin-only font (unreadable in Acrobat).
 */
const FONTS_DIR = join(__dirname, 'fonts');
const BUNDLED_ARABIC = join(FONTS_DIR, 'NotoNaskhArabic-Regular.ttf');
const BUNDLED_ARABIC_BOLD = join(FONTS_DIR, 'NotoNaskhArabic-Bold.ttf');

/**
 * Logical→visual text transform applied to every string before it reaches PDFKit. It shapes Arabic
 * glyphs and applies bidirectional reordering (see {@link shapeForPdf}); Latin/numeric strings pass
 * through untouched, so callers stay backward compatible. Used for width/height measurement; text is
 * actually drawn via {@link PdfRenderer.drawText}, which also preserves the logical text layer.
 */
const t = (value: string): string => shapeForPdf(value);

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
 * Separate Latin and Arabic font families, each in two weights. {@link drawText} picks the Arabic
 * family for any run that contains Arabic (so it renders in the bundled naskh face) and the Latin family
 * for pure Latin/numeric text (crisp Helvetica), which keeps mixed runs correct too.
 *
 * The names are deliberately NOT the built-in `Helvetica` / `Helvetica-Bold`: PDFKit pre-caches its
 * default font under the name `Helvetica` at construction, so `registerFont('Helvetica', …)` is
 * silently ignored (the cache wins) and Arabic would fall back to the WinAnsi standard font — emitting
 * each 16-bit code unit as two Latin-1 bytes (the `þ®…` mojibake). Our own names sidestep that cache.
 */
const FONT_LATIN = 'MunaxaLatin';
const FONT_LATIN_BOLD = 'MunaxaLatinBold';
const FONT_ARABIC = 'MunaxaArabic';
const FONT_ARABIC_BOLD = 'MunaxaArabicBold';

/**
 * Renders a declarative {@link DocumentLayout} into a branded A4 PDF (Part 3). pdfkit is lazily
 * imported so it only loads when a document is actually produced (mirrors ExportService). The
 * renderer is deliberately layout-agnostic: it knows how to draw a header, fields, tables, totals
 * and a signature block, and every official document is expressed as data for it to render.
 *
 * Arabic note: pdfkit's built-in fonts cover Latin only, and even with an embedded Arabic TTF pdfkit
 * does no complex-script processing — it draws code points in logical order with no glyph shaping or
 * bidirectional reordering, which makes raw Arabic unreadable. Two things therefore cooperate here:
 *   1. An Arabic-capable TTF is embedded when PDF_ARABIC_FONT_PATH is configured (see
 *      {@link registerFonts}) so the glyphs exist in the font.
 *   2. Text is drawn via {@link PdfRenderer.drawText}: Arabic is shaped and reordered to visual order
 *      by {@link shapeForPdf} so the glyphs display correctly, and the *original logical* Unicode is
 *      attached as an `/ActualText` marked-content span so copy/search/screen readers still get correct,
 *      un-reversed text. Latin/numeric text is untouched, so this is fully backward compatible.
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

    this.registerFonts(doc);
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

    doc.fillColor(INK).fontSize(15);
    this.drawText(doc, b.nameEn, textX, top, { width: right - textX }, true);
    if (b.nameAr) {
      doc.fontSize(11).fillColor(INK);
      this.drawText(doc, b.nameAr, textX, doc.y, { width: right - textX });
    }
    const contact = [b.addressLines.join(', '), b.phone, b.email, b.website]
      .filter((s): s is string => Boolean(s && s.trim()))
      .join('  ·  ');
    if (contact) {
      doc.fontSize(8).fillColor(MUTED);
      this.drawText(doc, contact, textX, doc.y + 1, { width: right - textX });
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
    doc.fillColor(INK).fontSize(16);
    this.drawText(doc, layout.title, left, titleTop, { width: titleWidth }, true);
    if (layout.subtitle) {
      doc.fontSize(9).fillColor(MUTED);
      this.drawText(doc, layout.subtitle, left, doc.y + 1, { width: titleWidth });
    }
    const afterTitle = doc.y;

    if (layout.meta && layout.meta.length > 0) {
      const boxW = (right - left) * 0.36;
      const boxX = right - boxW;
      let metaY = titleTop;
      for (const m of layout.meta) {
        doc.fontSize(8).fillColor(MUTED);
        this.drawText(
          doc,
          m.label.toUpperCase(),
          boxX,
          metaY,
          { width: boxW, align: 'right' },
          true,
        );
        doc.fontSize(10).fillColor(INK);
        this.drawText(doc, m.value, boxX, doc.y, { width: boxW, align: 'right' });
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
        doc.fontSize(11).fillColor(ACCENT);
        this.drawText(doc, block.text, left, doc.y, { width }, true);
        doc.moveDown(0.2);
        return;
      case 'paragraph':
        doc.fontSize(9.5).fillColor(block.muted ? MUTED : INK);
        this.drawText(doc, block.text, left, doc.y, { width, align: 'left', lineGap: 2 });
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
      doc.fontSize(7.5).fillColor(MUTED);
      this.drawText(doc, row.label.toUpperCase(), x, y, { width: colW - 8 });
      doc.fontSize(10).fillColor(INK);
      this.drawText(doc, row.value || '—', x, y + 11, { width: colW - 8 }, true);
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
      doc.fontSize(last ? 11 : 9.5).fillColor(last ? INK : MUTED);
      this.drawText(doc, row.label, x, y, { width: boxW * 0.55 }, last);
      doc.fontSize(last ? 11 : 9.5).fillColor(last ? ACCENT : INK);
      this.drawText(
        doc,
        row.value,
        x + boxW * 0.55,
        y,
        { width: boxW * 0.45, align: 'right' },
        true,
      );
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
      doc.fontSize(9);
      const heights = columns.map((c, i) => {
        const cell = String(record[c.key] ?? '');
        doc.font(this.fontFor(cell, bold));
        return doc.heightOfString(t(cell), { width: widths[i]! - 8 });
      });
      const rowH = Math.max(14, ...heights) + 6;
      this.ensureSpace(doc, rowH);
      const y = doc.y;
      columns.forEach((c, i) => {
        doc.fillColor(bold ? INK : '#1e293b');
        this.drawText(
          doc,
          String(record[c.key] ?? ''),
          colX(i) + 4,
          y + 3,
          { width: widths[i]! - 8, align: c.align ?? 'left' },
          bold,
        );
      });
      doc.y = y + rowH;
      doc.moveTo(left, doc.y).lineTo(right, doc.y).lineWidth(0.5).strokeColor(LINE).stroke();
    };

    // Header band.
    this.ensureSpace(doc, 20);
    const hy = doc.y;
    doc.rect(left, hy, width, 18).fill('#eef2ff');
    doc.fillColor(ACCENT).fontSize(8.5);
    columns.forEach((c, i) => {
      this.drawText(
        doc,
        c.header.toUpperCase(),
        colX(i) + 4,
        hy + 5,
        { width: widths[i]! - 8, align: c.align ?? 'left' },
        true,
      );
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
      doc.fontSize(9).fillColor(INK);
      this.drawText(doc, blk.label, x, y + 5, { width: colW - 24 }, true);
      if (blk.name) {
        doc.fontSize(8).fillColor(MUTED);
        this.drawText(doc, blk.name, x, doc.y, { width: colW - 24 });
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
      doc.fontSize(7).fillColor(MUTED);
      this.drawText(doc, note, left, y + 4, { width: (right - left) * 0.75 });
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

  /**
   * Draws a text run while keeping the PDF's logical text layer correct. Arabic must be handed to
   * pdfkit shaped and in visual (bidi-reordered) order to *display* correctly (pdfkit draws code points
   * left-to-right in the given order and does no bidi), but that same string is what pdfkit stores as
   * the text layer — so copy, search and screen readers would otherwise get reversed, presentation-form
   * text. For Arabic-bearing runs we therefore wrap the drawn glyphs in an `/ActualText` marked-content
   * span carrying the original *logical* Unicode, which conforming consumers (Acrobat, Chrome/Edge,
   * poppler, PDF/UA readers) return instead of the visual glyphs. Latin-only runs are drawn plainly.
   *
   * `logical` is the pre-shaping string; the visually-ordered glyphs come from {@link shapeForPdf}. The
   * cursor/layout behaviour is identical to a bare `doc.text` — the marked-content operators paint
   * nothing and pdfkit balances them automatically across page breaks.
   */
  private drawText(
    doc: PDFKit.PDFDocument,
    logical: string,
    x: number,
    y: number,
    options?: PDFKit.Mixins.TextOptions,
    bold = false,
  ): void {
    doc.font(this.fontFor(logical, bold));
    const visual = shapeForPdf(logical);
    if (!containsArabic(logical)) {
      doc.text(visual, x, y, options);
      return;
    }
    doc.markContent('Span', { actual: logical });
    doc.text(visual, x, y, options);
    doc.endMarkedContent();
  }

  /**
   * Binds all four font aliases. The Latin family is the built-in Helvetica (registered under our own
   * names to avoid PDFKit's reserved `Helvetica` cache entry). The Arabic family resolves in priority
   * order so Arabic always has real glyphs:
   *   1. PDF_ARABIC_FONT_PATH — a deployment-chosen Arabic TTF (same file backs both weights).
   *   2. The bundled {@link BUNDLED_ARABIC} Noto Naskh pair shipped with the app (the default), so no
   *      environment can silently fall back to a Latin-only font.
   *   3. Helvetica — last resort only if the bundled files are missing (Arabic then needs option 1/2).
   */
  private registerFonts(doc: PDFKit.PDFDocument): void {
    doc.registerFont(FONT_LATIN, 'Helvetica');
    doc.registerFont(FONT_LATIN_BOLD, 'Helvetica-Bold');

    const envPath = process.env.PDF_ARABIC_FONT_PATH;
    if (envPath && this.tryRegisterArabic(doc, envPath, envPath)) return;
    if (
      existsSync(BUNDLED_ARABIC) &&
      existsSync(BUNDLED_ARABIC_BOLD) &&
      this.tryRegisterArabic(doc, BUNDLED_ARABIC, BUNDLED_ARABIC_BOLD)
    ) {
      return;
    }
    doc.registerFont(FONT_ARABIC, 'Helvetica');
    doc.registerFont(FONT_ARABIC_BOLD, 'Helvetica-Bold');
  }

  /** Register both Arabic weight aliases from the given font files; false if the font cannot load. */
  private tryRegisterArabic(doc: PDFKit.PDFDocument, regular: string, bold: string): boolean {
    try {
      doc.registerFont(FONT_ARABIC, regular);
      doc.registerFont(FONT_ARABIC_BOLD, bold);
      return true;
    } catch {
      return false;
    }
  }

  /** The font alias for a run: the Arabic family when the run contains Arabic, else the Latin family. */
  private fontFor(logical: string, bold: boolean): string {
    if (containsArabic(logical)) return bold ? FONT_ARABIC_BOLD : FONT_ARABIC;
    return bold ? FONT_LATIN_BOLD : FONT_LATIN;
  }
}
