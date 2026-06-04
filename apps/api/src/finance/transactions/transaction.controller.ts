import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Permission } from '@munaxa/domain';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto, PresignReceiptDto, RejectTransactionDto } from './transaction.dto';

@ApiTags('finance')
@ApiBearerAuth()
@Controller({ path: 'finance/transactions', version: '1' })
export class TransactionController {
  constructor(private readonly service: TransactionService) {}

  @Post('receipt/presign')
  @HttpCode(200)
  @RequirePermissions(Permission.RECEIPT_UPLOAD)
  @ApiOperation({ summary: 'Pre-signed S3 URL to upload a CliQ/e-wallet receipt' })
  presign(@Body() dto: PresignReceiptDto) {
    return this.service.presignReceipt(dto);
  }

  @Post()
  @RequirePermissions(Permission.RECEIPT_UPLOAD)
  @ApiOperation({ summary: 'Record a payment (PENDING until verified)' })
  create(@Body() dto: CreateTransactionDto) {
    return this.service.create(dto);
  }

  @Post(':id/verify')
  @HttpCode(200)
  @RequirePermissions(Permission.FINANCE_MANAGE)
  @ApiOperation({ summary: 'Verify a pending payment (audited)' })
  verify(@Param('id') id: string) {
    return this.service.verify(id);
  }

  @Post(':id/reject')
  @HttpCode(200)
  @RequirePermissions(Permission.FINANCE_MANAGE)
  @ApiOperation({ summary: 'Reject a pending payment (audited)' })
  reject(@Param('id') id: string, @Body() dto: RejectTransactionDto) {
    return this.service.reject(id, dto);
  }

  @Get()
  @RequirePermissions(Permission.FINANCE_READ)
  @ApiQuery({ name: 'studentId', required: true })
  list(@Query('studentId') studentId: string) {
    return this.service.listForStudent(studentId);
  }
}
