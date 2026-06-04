import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { DeviceRepository } from '../devices/device.repository';
import { RegisterDeviceDto } from '../devices/device.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/auth.types';

/** The notification center + device registration, always scoped to the current user. */
@ApiTags('notifications')
@ApiBearerAuth()
@Controller({ path: 'notifications', version: '1' })
export class NotificationController {
  constructor(
    private readonly service: NotificationService,
    private readonly devices: DeviceRepository,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'List my notifications' })
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listMine(user.userId);
  }

  @Get('me/unread-count')
  unread(@CurrentUser() user: AuthenticatedUser) {
    return this.service.unread(user.userId);
  }

  @Post(':id/read')
  @HttpCode(200)
  markRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.markRead(id, user.userId);
  }

  @Post('read-all')
  @HttpCode(200)
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.service.markAllRead(user.userId);
  }

  // ----- Device tokens (FCM) ----------------------------------------------
  @Post('devices')
  @ApiOperation({ summary: 'Register this device for push notifications' })
  registerDevice(@CurrentUser() user: AuthenticatedUser, @Body() dto: RegisterDeviceDto) {
    return this.devices.register(user.userId, dto.token, dto.platform);
  }

  @Delete('devices/:token')
  @HttpCode(204)
  async removeDevice(@CurrentUser() user: AuthenticatedUser, @Param('token') token: string) {
    await this.devices.remove(user.userId, token);
  }
}
