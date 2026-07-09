import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { BrandingContext, DocumentLayout, LayoutBlock, TableColumn } from './document-layout';
import { containsArabic, layoutRuns } from './arabic-text';

/**
 * Bundled Arabic font (Noto Naskh Arabic, OFL; see fonts/LICENSE.txt), copied next to the compiled
 * output by nest-cli's asset step so it resolves from `__dirname` in both ts-jest (src) and production
 * (dist). Defaulting to it guarantees Arabic never silently falls back to a Latin-only font (unreadable
 * in Acrobat). Shaping is the font's own OpenType job now, so any Arabic OpenType face works — point
 * PDF_ARABIC_FONT_PATH at Amiri, Noto Sans Arabic, etc. to override.
 */
const FONTS_DIR = join(__dirname, 'fonts');
const BUNDLED_ARABIC = join(FONTS_DIR, 'NotoNaskhArabic-Regular.ttf');
const BUNDLED_ARABIC_BOLD = join(FONTS_DIR, 'NotoNaskhArabic-Bold.ttf');

export interface RenderedPdf {
  buffer: Buffer;
  checksum: string; // sha256 hex
  byteSize: number;
}

/**
 * Visual tokens mirrored from the Munaxa Design System (`packages/design-tokens` — colors.ts /
 * spacing.ts / typography.ts), the single source of truth. No colours, sizes or spacing are invented
 * here; each maps to a DS token so the PDF reads as a natural extension of the web app.
 */
const A4 = { margin: 52 } as const; // ≈ DS space-16 outer margin
const INK = '#090B0C'; // neutral.ink — primary text
const INK_SOFT = '#394447'; // dataViz[3] — secondary body text
const MUTED = '#67787C'; // neutral.mutedText — labels / captions
const LINE = '#E3E7E8'; // neutral.border — hairlines / separators
const SURFACE = '#F1F3F3'; // neutral.surface — panels / table-header fill
const BRAND = '#007595'; // brand.DEFAULT — accent / section headings
const BRAND_DARK = '#005066'; // brand.dark — emphasis (totals)

/** Type ramp (pt) derived from the DS typography scale — keeps a consistent hierarchy. */
const TYPE = {
  brand: 15, // school name (header)
  brandAr: 11,
  title: 17, // document title
  subtitle: 9.5,
  heading: 11.5, // section heading
  body: 10, // DS base
  value: 10,
  small: 9,
  label: 7.5, // uppercase field/column labels (DS xs)
  meta: 9.5,
  footer: 7,
} as const;

/** Radius (pt) — DS radius.sm, for panels and the table header band. */
const RADIUS = 6;

/** First Arabic-script character — used to split a bilingual "English / العربية" label into its halves. */
const ARABIC_CHAR = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

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
 * Arabic note: pdfkit (via fontkit) DOES run the embedded font's OpenType shaper, so Arabic handed to
 * it in *logical* order comes out correctly joined — but pdfkit does no bidirectional reordering. So:
 *   1. An Arabic-capable TTF is embedded (bundled Noto Naskh, or PDF_ARABIC_FONT_PATH; see
 *      {@link registerFonts}), and the Latin family stays Helvetica.
 *   2. Text is drawn via {@link PdfRenderer.drawText}, which uses {@link layoutRuns} to split each
 *      string into directional runs in visual order and draws them left-to-right — each in its script's
 *      font, with the font shaping Arabic natively (no presentation-form table). The *original logical*
 *      Unicode is attached as an `/ActualText` marked-content span so copy/search/screen readers get
 *      correct text. Pure Latin/numeric text is drawn unchanged, so it is fully backward compatible.
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

    doc.fillColor(INK).fontSize(TYPE.brand);
    this.drawText(doc, b.nameEn, textX, top, { width: right - textX }, true);
    if (b.nameAr) {
      doc.fontSize(TYPE.brandAr).fillColor(INK_SOFT);
      this.drawText(doc, b.nameAr, textX, doc.y + 1, { width: right - textX });
    }
    const contact = [b.addressLines.join(', '), b.phone, b.email, b.website]
      .filter((s): s is string => Boolean(s && s.trim()))
      .join('   ·   ');
    if (contact) {
      doc.fontSize(TYPE.footer + 0.5).fillColor(MUTED);
      this.drawText(doc, contact, textX, doc.y + 3, { width: right - textX });
    }

    // Brand rule under the letterhead.
    const headerBottom = Math.max(doc.y, top + (b.logo ? 64 : 0)) + 10;
    doc
      .moveTo(left, headerBottom)
      .lineTo(right, headerBottom)
      .lineWidth(1.5)
      .strokeColor(BRAND)
      .stroke();

    // Title block (left) + meta panel (right).
    doc.y = headerBottom + 18;
    const titleTop = doc.y;
    const hasMeta = Boolean(layout.meta && layout.meta.length > 0);
    const titleWidth = hasMeta ? (right - left) * 0.58 : right - left;

    doc.fillColor(INK).fontSize(TYPE.title);
    this.drawText(doc, layout.title, left, titleTop, { width: titleWidth }, true);
    if (layout.subtitle) {
      doc.fontSize(TYPE.subtitle).fillColor(MUTED);
      this.drawText(doc, layout.subtitle, left, doc.y + 3, { width: titleWidth, lineGap: 1 });
    }
    const afterTitle = doc.y;

    let metaBottom = titleTop;
    if (hasMeta) {
      const boxW = (right - left) * 0.38;
      const boxX = right - boxW;
      const pad = 12;
      const rowH = 24;
      const panelH = layout.meta!.length * rowH + pad;
      doc.roundedRect(boxX, titleTop - 2, boxW, panelH, RADIUS).fill(SURFACE);
      let metaY = titleTop - 2 + pad / 2;
      const innerW = boxW - pad * 2;
      for (const m of layout.meta!) {
        doc.fontSize(TYPE.label).fillColor(MUTED);
        this.drawBilingual(doc, m.label.toUpperCase(), boxX + pad, metaY, innerW, true, 'right');
        doc.fontSize(TYPE.meta).fillColor(INK);
        this.drawText(doc, m.value, boxX + pad, metaY + 9, { width: innerW, align: 'right' }, true);
        metaY += rowH;
      }
      metaBottom = titleTop - 2 + panelH;
    }

    doc.y = Math.max(afterTitle, metaBottom) + 20;
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
      case 'heading': {
        doc.moveDown(0.5);
        doc.fontSize(TYPE.heading).fillColor(BRAND);
        this.drawBilingual(doc, block.text, left, doc.y, width, true);
        // Hairline under the heading to group the section that follows.
        const ruleY = doc.y + 3;
        doc.moveTo(left, ruleY).lineTo(right, ruleY).lineWidth(0.75).strokeColor(LINE).stroke();
        doc.y = ruleY + 6;
        return;
      }
      case 'paragraph':
        doc.fontSize(TYPE.body).fillColor(block.muted ? MUTED : INK_SOFT);
        this.drawText(doc, block.text, left, doc.y, { width, align: 'left', lineGap: 3 });
        doc.moveDown(0.5);
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
    const rowH = 34;
    let i = 0;
    for (const row of rows) {
      const col = i % columns;
      if (col === 0) this.ensureSpace(doc, rowH);
      const x = left + col * colW;
      const y = doc.y;
      doc.fontSize(TYPE.label).fillColor(MUTED);
      this.drawBilingual(doc, row.label.toUpperCase(), x, y, colW - 10, false);
      doc.fontSize(TYPE.value).fillColor(INK);
      this.drawBilingual(doc, row.value || '—', x, y + 12, colW - 10, true);
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
    const boxW = 260;
    const x = right - boxW;
    const pad = 12;
    const rowGap = 17;
    this.ensureSpace(doc, rows.length * rowGap + pad + 6);
    const top = doc.y;
    // Subtle panel behind the totals to set them apart (DS surface + radius).
    doc.roundedRect(x, top, boxW, rows.length * rowGap + pad, RADIUS).fill(SURFACE);
    let y = top + pad / 2;
    for (const [idx, row] of rows.entries()) {
      const last = idx === rows.length - 1;
      if (last) {
        // Divider above the grand total.
        doc
          .moveTo(x + pad, y - 2)
          .lineTo(x + boxW - pad, y - 2)
          .lineWidth(0.75)
          .strokeColor(LINE)
          .stroke();
        y += 3;
      }
      doc.fontSize(last ? TYPE.body : TYPE.small).fillColor(last ? INK : MUTED);
      this.drawBilingual(doc, row.label, x + pad, y, boxW * 0.5, last);
      doc.fontSize(last ? TYPE.body + 1 : TYPE.small).fillColor(last ? BRAND_DARK : INK);
      this.drawText(doc, row.value, x + pad, y, { width: boxW - pad * 2, align: 'right' }, true);
      y += rowGap;
    }
    doc.y = top + rows.length * rowGap + pad + 6;
    doc.x = doc.page.margins.left;
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

    const cellPad = 8;
    const drawRow = (record: Record<string, string | number>, bold: boolean, zebra: boolean) => {
      // Measure tallest cell for wrapping.
      doc.fontSize(TYPE.small);
      const heights = columns.map((c, i) => {
        const cell = String(record[c.key] ?? '');
        doc.font(this.fontFor(cell, bold));
        return doc.heightOfString(cell, { width: widths[i]! - cellPad * 2 });
      });
      const rowH = Math.max(16, ...heights) + 8;
      this.ensureSpace(doc, rowH);
      const y = doc.y;
      if (zebra) doc.rect(left, y, width, rowH).fill(SURFACE);
      if (bold) doc.rect(left, y, width, rowH).fill(SURFACE);
      columns.forEach((c, i) => {
        doc.fillColor(bold ? INK : INK_SOFT);
        this.drawText(
          doc,
          String(record[c.key] ?? ''),
          colX(i) + cellPad,
          y + 5,
          { width: widths[i]! - cellPad * 2, align: c.align ?? 'left' },
          bold,
        );
      });
      doc.y = y + rowH;
      doc.moveTo(left, doc.y).lineTo(right, doc.y).lineWidth(0.5).strokeColor(LINE).stroke();
    };

    // Header band (brand-surface, rounded top).
    const headH = 22;
    this.ensureSpace(doc, headH + 4);
    const hy = doc.y;
    doc.roundedRect(left, hy, width, headH, RADIUS).fill(SURFACE);
    doc.rect(left, hy + headH - RADIUS, width, RADIUS).fill(SURFACE); // square off the bottom corners
    doc.fillColor(BRAND).fontSize(TYPE.label);
    columns.forEach((c, i) => {
      this.drawBilingual(
        doc,
        c.header.toUpperCase(),
        colX(i) + cellPad,
        hy + 7,
        widths[i]! - cellPad * 2,
        true,
        c.align ?? 'left',
      );
    });
    doc.y = hy + headH;
    doc.moveTo(left, doc.y).lineTo(right, doc.y).lineWidth(0.75).strokeColor(LINE).stroke();

    rows.forEach((row, i) => drawRow(row, false, i % 2 === 1));
    if (totalsRow) drawRow(totalsRow, true, false);
    doc.moveDown(0.6);
  }

  private drawSignatures(
    doc: PDFKit.PDFDocument,
    blocks: Array<{ label: string; name?: string }>,
  ): void {
    this.ensureSpace(doc, 80);
    const left = doc.page.margins.left;
    const width = doc.page.width - doc.page.margins.right - left;
    const colW = width / blocks.length;
    const y = doc.y + 34;
    blocks.forEach((blk, i) => {
      const x = left + i * colW;
      doc
        .moveTo(x, y)
        .lineTo(x + colW - 28, y)
        .lineWidth(0.75)
        .strokeColor(INK_SOFT)
        .stroke();
      doc.fontSize(TYPE.small).fillColor(INK);
      this.drawBilingual(doc, blk.label, x, y + 7, colW - 28, true);
      if (blk.name) {
        doc.fontSize(TYPE.footer + 1).fillColor(MUTED);
        this.drawText(doc, blk.name, x, doc.y + 1, { width: colW - 28 });
      }
    });
    doc.y = y + 52;
  }

  // ── footer (buffered pages: page numbers + footer note) ───────────────────
  private drawFooters(doc: PDFKit.PDFDocument, layout: DocumentLayout, b: BrandingContext): void {
    const note = layout.footer ?? b.footerNote ?? b.legalName ?? b.nameEn;
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i);
      const left = doc.page.margins.left;
      const right = doc.page.width - doc.page.margins.right;
      const y = doc.page.height - doc.page.margins.bottom + 10;
      doc.moveTo(left, y).lineTo(right, y).lineWidth(0.5).strokeColor(LINE).stroke();
      doc.fontSize(TYPE.footer).fillColor(MUTED);
      this.drawText(doc, note, left, y + 6, { width: (right - left) * 0.72 });
      doc.font(FONT_LATIN).fontSize(TYPE.footer).fillColor(MUTED);
      doc.text(`Page ${i - range.start + 1} of ${range.count}`, left, y + 6, {
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
   * Draws a text run with correct bidirectional layout and a correct logical text layer.
   * {@link layoutRuns} splits the logical string into directional runs in visual (left-to-right) order;
   * we draw them as one continued sequence, each run in its script's font (Arabic runs enable the
   * `rtla` OpenType feature and let the font shape natively), so mixed Arabic/Latin/number text reads
   * correctly. The whole span is wrapped in an `/ActualText` marked-content entry carrying the original
   * *logical* Unicode, so copy/search/screen readers (Acrobat, Chrome/Edge, poppler, PDF/UA) get correct
   * text. Pure Latin/numeric text draws as a single unchanged run. The marked-content operators paint
   * nothing and pdfkit balances them across page breaks; cursor/layout behaviour matches `doc.text`.
   */
  private drawText(
    doc: PDFKit.PDFDocument,
    logical: string,
    x: number,
    y: number,
    options?: PDFKit.Mixins.TextOptions,
    bold = false,
  ): void {
    const runs = layoutRuns(logical);
    const tagged = containsArabic(logical);
    if (tagged) doc.markContent('Span', { actual: logical });

    const align = options?.align;
    if ((align === 'right' || align === 'center') && runs.length > 1) {
      // PDFKit's `align` is unreliable across `continued` runs (fragments overlap), so we position the
      // line ourselves: measure the runs and start them at the correct x, then draw left-to-right.
      const width = options?.width ?? doc.page.width - doc.page.margins.right - x;
      let total = 0;
      for (const run of runs) {
        doc.font(this.fontFor(run.text, bold));
        total += doc.widthOfString(
          run.text,
          containsArabic(run.text) ? { features: ['rtla'] } : {},
        );
      }
      const startX = align === 'right' ? x + width - total : x + (width - total) / 2;
      this.drawRunsInline(doc, runs, startX, y, bold, {
        ...options,
        align: undefined,
        width: undefined,
      });
    } else {
      this.drawRunsInline(doc, runs, x, y, bold, options);
    }

    if (tagged) doc.endMarkedContent();
  }

  /** Draw already-ordered runs as one continued sequence starting at (x, y), each in its script font. */
  private drawRunsInline(
    doc: PDFKit.PDFDocument,
    runs: ReturnType<typeof layoutRuns>,
    x: number,
    y: number,
    bold: boolean,
    options?: PDFKit.Mixins.TextOptions,
  ): void {
    runs.forEach((run, i) => {
      const runArabic = containsArabic(run.text);
      doc.font(this.fontFor(run.text, bold));
      const runOptions: PDFKit.Mixins.TextOptions = { ...options, continued: i < runs.length - 1 };
      if (runArabic) runOptions.features = ['rtla'];
      if (i === 0) doc.text(run.text, x, y, runOptions);
      else doc.text(run.text, runOptions);
    });
  }

  /**
   * Draws a label that may be bilingual ("English / العربية"). When both scripts are present the two
   * halves are aligned to opposite edges of `width` on the same baseline — English flush-left, Arabic
   * flush-right — the standard bilingual-form look. Mono labels (one script) draw normally, honouring
   * `monoAlign` (so e.g. a numeric column header stays right-aligned when the document is English-only).
   */
  private drawBilingual(
    doc: PDFKit.PDFDocument,
    text: string,
    x: number,
    y: number,
    width: number,
    bold: boolean,
    monoAlign: 'left' | 'right' | 'center' = 'left',
  ): void {
    const idx = text.search(ARABIC_CHAR);
    const prefix = idx > 0 ? text.slice(0, idx) : '';
    if (idx <= 0 || !/[A-Za-z]/.test(prefix)) {
      this.drawText(doc, text, x, y, { width, align: monoAlign }, bold);
      return;
    }
    const en = prefix.replace(/[\s/·|,-]+$/u, ''); // drop the trailing " / " separator
    const ar = text.slice(idx);
    const yBefore = doc.y;
    this.drawText(doc, en, x, y, { width }, bold); // English → left
    const yEn = doc.y;
    doc.y = yBefore;
    this.drawText(doc, ar, x, y, { width, align: 'right' }, bold); // Arabic → right
    doc.y = Math.max(yEn, doc.y); // keep the taller of the two halves
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
