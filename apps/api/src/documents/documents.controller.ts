import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DocumentType } from '@prisma/client';
import { Permission } from '@munaxa/domain';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { DocumentsService } from './documents.service';
import { EmailDocumentDto, GenerateAgreementDto, GenerateDocumentDto } from './documents.dto';
import type { DocumentMeta } from './document.repository';
import type { AccessContext } from './document.types';

/**
 * Enterprise Document Engine API (Parts 3–6, 8). Generates official documents from a permanent
 * snapshot, lists the per-tenant archive, and serves stored PDFs for download/print/email. Every
 * action is RBAC-gated, tenant-isolated (RLS) and audited.
 */
@ApiTags('documents')
@ApiBearerAuth()
@Controller({ path: 'documents', version: '1' })
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get()
  @RequirePermissions(Permission.DOCUMENT_READ)
  @ApiOperation({ summary: 'List archived documents (optionally by student/type/enrollment)' })
  list(
    @Query('studentId') studentId?: string,
    @Query('type') type?: DocumentType,
    @Query('enrollmentId') enrollmentId?: string,
  ) {
    return this.service.list({
      ...(studentId ? { studentId } : {}),
      ...(type ? { type } : {}),
      ...(enrollmentId ? { enrollmentId } : {}),
    });
  }

  @Get('academic-years')
  @RequirePermissions(Permission.DOCUMENT_READ)
  @ApiOperation({ summary: 'Academic years (for the tuition-certificate picker)' })
  academicYears() {
    return this.service.academicYears();
  }

  @Post('generate')
  @RequirePermissions(Permission.DOCUMENT_GENERATE)
  @ApiOperation({ summary: 'Generate & archive an official finance document from the ledger' })
  generate(@Body() dto: GenerateDocumentDto): Promise<DocumentMeta> {
    return this.service.generate(dto);
  }

  @Get('agreements')
  @RequirePermissions(Permission.DOCUMENT_READ)
  @ApiOperation({ summary: 'List registration agreements (all versions)' })
  listAgreements(
    @Query('studentId') studentId?: string,
    @Query('enrollmentId') enrollmentId?: string,
  ) {
    return this.service.listAgreements({
      ...(studentId ? { studentId } : {}),
      ...(enrollmentId ? { enrollmentId } : {}),
    });
  }

  @Post('agreements')
  @RequirePermissions(Permission.DOCUMENT_GENERATE)
  @ApiOperation({ summary: '(Re)generate a registration agreement (creates a new version)' })
  generateAgreement(@Body() dto: GenerateAgreementDto) {
    return this.service.generateAgreement(dto);
  }

  @Get(':id')
  @RequirePermissions(Permission.DOCUMENT_READ)
  @ApiOperation({ summary: 'Document metadata (no PDF body)' })
  getMeta(@Param('id') id: string) {
    return this.service.getMeta(id);
  }

  @Get(':id/history')
  @RequirePermissions(Permission.DOCUMENT_READ)
  @ApiOperation({ summary: 'Per-action access history (generate/print/download/email/view)' })
  history(@Param('id') id: string) {
    return this.service.accessHistory(id);
  }

  @Get(':id/download')
  @RequirePermissions(Permission.DOCUMENT_READ)
  @ApiOperation({ summary: 'Download the PDF — stored (SNAPSHOT) or re-rendered live (DYNAMIC)' })
  async download(
    @Param('id') id: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { meta, pdf } = await this.service.download(id, this.ctx(req));
    return this.streamPdf(res, meta, pdf, 'inline');
  }

  @Post(':id/print')
  @RequirePermissions(Permission.DOCUMENT_READ)
  @ApiOperation({
    summary: 'Reprint the PDF (records a PRINT action); re-rendered live if DYNAMIC',
  })
  async print(
    @Param('id') id: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { meta, pdf } = await this.service.print(id, this.ctx(req));
    return this.streamPdf(res, meta, pdf, 'inline');
  }

  @Post(':id/email')
  @RequirePermissions(Permission.DOCUMENT_GENERATE)
  @ApiOperation({
    summary: 'Email the document as a PDF attachment (audited; recipients resolved)',
  })
  email(@Param('id') id: string, @Body() dto: EmailDocumentDto, @Req() req: Request) {
    return this.service.email(id, dto, this.ctx(req));
  }

  /** Best-effort request context (client IP + user agent) for the access history. */
  private ctx(req: Request): AccessContext {
    const fwd = req.headers['x-forwarded-for'];
    const ip = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim() || req.ip;
    return { ip: ip ?? undefined, userAgent: req.headers['user-agent'] ?? undefined };
  }

  private streamPdf(
    res: Response,
    meta: DocumentMeta,
    pdf: Buffer,
    disposition: 'inline' | 'attachment',
  ): StreamableFile {
    const filename = `${meta.type.toLowerCase()}-${String(meta.documentNo).padStart(6, '0')}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${disposition}; filename="${filename}"`,
    });
    return new StreamableFile(pdf);
  }
}
