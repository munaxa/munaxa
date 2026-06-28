import { Injectable } from '@nestjs/common';
import type { DocumentLanguage, DocumentType, Prisma } from '@prisma/client';
import { BrandingService } from './branding.service';
import { PdfRenderer, type RenderedPdf } from './pdf/pdf-renderer';
import { DocumentRepository, type DocumentMeta } from './document.repository';
import type { BrandingContext, DocumentLayout } from './pdf/document-layout';

export interface GenerateInput {
  layout: DocumentLayout;
  language: DocumentLanguage;
  archive: {
    type: DocumentType;
    studentId?: string | null;
    parentId?: string | null;
    academicYearId?: string | null;
    enrollmentId?: string | null;
    transactionId?: string | null;
    dataSnapshot: Prisma.InputJsonValue;
  };
}

/**
 * The reusable Document Engine core (Part 3): collect-data → merge-branding → render-PDF →
 * store-snapshot → archive. Templates produce a {@link DocumentLayout}; this turns it into a
 * branded, immutable, archived PDF and returns the archive metadata. Shared by every finance
 * document and by the registration-agreement flow (which adds versioning on top).
 */
@Injectable()
export class DocumentEngineService {
  constructor(
    private readonly branding: BrandingService,
    private readonly renderer: PdfRenderer,
    private readonly repo: DocumentRepository,
  ) {}

  /** Resolve branding once (callers that render + persist separately, e.g. agreements). */
  resolveBranding(): Promise<BrandingContext> {
    return this.branding.forTenant();
  }

  render(layout: DocumentLayout, branding: BrandingContext): Promise<RenderedPdf> {
    return this.renderer.render(layout, branding);
  }

  /** Full path: render a layout with the tenant's branding and archive it immutably. */
  async generate(input: GenerateInput): Promise<DocumentMeta> {
    const branding = await this.branding.forTenant();
    const rendered = await this.renderer.render(input.layout, branding);
    return this.repo.archiveDocument({
      type: input.archive.type,
      title: input.layout.title,
      language: input.language,
      studentId: input.archive.studentId ?? null,
      parentId: input.archive.parentId ?? null,
      academicYearId: input.archive.academicYearId ?? null,
      enrollmentId: input.archive.enrollmentId ?? null,
      transactionId: input.archive.transactionId ?? null,
      dataSnapshot: input.archive.dataSnapshot,
      pdf: rendered.buffer,
      checksum: rendered.checksum,
      byteSize: rendered.byteSize,
    });
  }
}
