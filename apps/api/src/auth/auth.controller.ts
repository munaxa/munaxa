import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthService } from './services/auth.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './auth.types';
import {
  LoginDto,
  SessionExchangeDto,
  RefreshDto,
  ChangePasswordDto,
  RequestPasswordResetDto,
  ConfirmPasswordResetDto,
} from './dto/auth.dto';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private meta(req: Request) {
    return { ip: req.ip, userAgent: req.headers['user-agent'] };
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  // Brute-force protection: a tighter per-IP limit than the global throttle.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Local login (email + password) → token pair' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const result = await this.auth.login(dto, this.meta(req));
    return { ...result.tokens, mustChangePassword: result.mustChangePassword };
  }

  @Public()
  @Post('session')
  @HttpCode(200)
  @ApiOperation({ summary: 'Exchange a Firebase ID token for a Munaxa token pair' })
  async session(@Body() dto: SessionExchangeDto, @Req() req: Request) {
    const result = await this.auth.exchangeFirebaseSession(dto, this.meta(req));
    return { ...result.tokens, mustChangePassword: result.mustChangePassword };
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate a refresh token (with reuse detection)' })
  refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    return this.auth.refresh(dto.refreshToken, this.meta(req));
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoke a refresh token family' })
  async logout(@Body() dto: RefreshDto) {
    await this.auth.logout(dto.refreshToken);
  }

  @Public()
  @Post('password/reset/request')
  @HttpCode(202)
  @ApiOperation({ summary: 'Request a password reset (always 202 to avoid enumeration)' })
  async requestReset(@Body() dto: RequestPasswordResetDto, @Req() req: Request) {
    await this.auth.requestPasswordReset(dto, this.meta(req));
  }

  @Public()
  @Post('password/reset/confirm')
  @HttpCode(204)
  @ApiOperation({ summary: 'Confirm a password reset with a token' })
  async confirmReset(@Body() dto: ConfirmPasswordResetDto, @Req() req: Request) {
    await this.auth.confirmPasswordReset(dto, this.meta(req));
  }

  @ApiBearerAuth()
  @Post('password/change')
  @HttpCode(204)
  @ApiOperation({ summary: 'Change password (also clears the first-login flag)' })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ) {
    await this.auth.changePassword(user.userId, user.tenantId, dto, this.meta(req));
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Return the current principal (roles + permissions)' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.me(user.userId, user.tenantId);
  }
}
