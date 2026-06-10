import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@munaxa/domain';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { FeatureFlagGuard } from '../feature-flags/feature-flag.guard';
import { FeatureFlagKey, RequireFeature } from '../feature-flags/require-feature.decorator';
import { EInvoicingService } from './einvoicing.service';
import { SubmissionWorker } from './submission.worker';
import {
  CreateCreditNoteDto,
  CreateInvoiceDto,
  ListDocumentsQueryDto,
  SaveCredentialsDto,
  UpdateSettingsDto,
} from './einvoicing.dto';

/**
 * E-invoicing (Phase 16): wizard configuration, document issuance, queue control and the
 * dashboard. Gated by the `e_invoicing` feature flag (kill-switch) + finance RBAC.
 */
@ApiTags('einvoicing')
@ApiBearerAuth()
@Controller({ path: 'einvoicing', version: '1' })
@UseGuards(FeatureFlagGuard)
@RequireFeature(FeatureFlagKey.E_INVOICING)
export class EInvoicingController {
  constructor(
    private readonly service: EInvoicingService,
    private readonly worker: SubmissionWorker,
  ) {}

  // ------------------------------------------------------------------ wizard

  @Get('settings')
  @RequirePermissions(Permission.FINANCE_READ)
  @ApiOperation({ summary: 'Wizard state + settings (secret masked)' })
  getSettings() {
    return this.service.getSettings();
  }

  @Patch('settings')
  @RequirePermissions(Permission.FINANCE_MANAGE)
  @ApiOperation({ summary: 'Update settings / save a wizard step draft' })
  updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.service.updateSettings(dto);
  }

  @Post('credentials')
  @RequirePermissions(Permission.FINANCE_MANAGE)
  @ApiOperation({ summary: 'Save device credentials (secret write-only, encrypted at rest)' })
  saveCredentials(@Body() dto: SaveCredentialsDto) {
    return this.service.saveCredentials(dto);
  }

  @Post('test-connection')
  @HttpCode(200)
  @RequirePermissions(Permission.FINANCE_MANAGE)
  @ApiOperation({ summary: 'Wizard step 3 — test provider connectivity/credentials' })
  testConnection() {
    return this.service.testConnection();
  }

  // --------------------------------------------------------------- documents

  @Post('invoices')
  @RequirePermissions(Permission.FINANCE_MANAGE)
  @ApiOperation({ summary: 'Create a DRAFT invoice' })
  createInvoice(@Body() dto: CreateInvoiceDto) {
    return this.service.createInvoice(dto);
  }

  @Post('credit-notes')
  @RequirePermissions(Permission.FINANCE_MANAGE)
  @ApiOperation({ summary: 'Create a DRAFT credit note (381) referencing an accepted invoice' })
  createCreditNote(@Body() dto: CreateCreditNoteDto) {
    return this.service.createCreditNote(dto);
  }

  @Get('documents')
  @RequirePermissions(Permission.FINANCE_READ)
  list(@Query() query: ListDocumentsQueryDto) {
    return this.service.list(query);
  }

  @Get('documents/:id')
  @RequirePermissions(Permission.FINANCE_READ)
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(id);
  }

  @Post('documents/:id/queue')
  @RequirePermissions(Permission.FINANCE_MANAGE)
  @ApiOperation({ summary: 'Queue a draft for submission (allocates the gapless ICV)' })
  queue(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.queue(id);
  }

  @Post('documents/:id/requeue')
  @RequirePermissions(Permission.FINANCE_MANAGE)
  @ApiOperation({ summary: 'Manual resubmission from REJECTED / DEAD_LETTER' })
  requeue(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.requeue(id);
  }

  @Post('documents/:id/cancel')
  @RequirePermissions(Permission.FINANCE_MANAGE)
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.cancel(id);
  }

  // ------------------------------------------------------- dashboard / queue

  @Get('dashboard')
  @RequirePermissions(Permission.FINANCE_READ)
  @ApiOperation({ summary: 'Connection status + counts for the dashboard widget' })
  dashboard() {
    return this.service.dashboard();
  }

  @Post('queue/run')
  @HttpCode(200)
  @RequirePermissions(Permission.FINANCE_MANAGE)
  @ApiOperation({ summary: 'Run one queue pass now (instead of waiting for the worker tick)' })
  async runQueue() {
    const processed = await this.worker.tick();
    return { processed };
  }
}
