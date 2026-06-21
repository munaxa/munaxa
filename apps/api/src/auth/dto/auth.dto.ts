import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Minimum password strength: at least one lower-case letter, one upper-case letter, one digit and
 * one special character (length is enforced separately via @MinLength). Applied to every
 * new/changed password. Kept in lock-step with PasswordService.assertStrong (the runtime source
 * of truth) and the frontend policy helper.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;
export const PASSWORD_PATTERN_MESSAGE =
  'Password must contain a lower-case letter, an upper-case letter, a number and a special character';

export class LoginDto {
  @ApiPropertyOptional({
    description: 'Email or username. Preferred field; falls back to `email` for legacy clients.',
    example: 'admin@school.example',
  })
  @IsOptional()
  @IsString()
  @MaxLength(320)
  identifier?: string;

  @ApiPropertyOptional({
    description: 'Legacy: email address. Use `identifier` for email-or-username login.',
    example: 'admin@school.example',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'Sup3rSecret!' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  password!: string;

  @ApiPropertyOptional({
    description: 'School (tenant) identifier. Required when the handle exists across tenants.',
    example: 'green-valley',
  })
  @IsOptional()
  @IsString()
  tenantSlug?: string;
}

export class SessionExchangeDto {
  @ApiProperty({ description: 'Firebase ID token obtained on the client.' })
  @IsString()
  @IsNotEmpty()
  firebaseIdToken!: string;

  @ApiPropertyOptional({ example: 'green-valley' })
  @IsOptional()
  @IsString()
  tenantSlug?: string;
}

export class RefreshDto {
  // Optional: web clients carry the refresh token in an httpOnly cookie (empty body); mobile/API
  // clients send it here. The controller resolves it from the body or the cookie.
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  refreshToken?: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password (or the temporary password on first login).' })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({ minLength: PASSWORD_MIN_LENGTH })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(200)
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_PATTERN_MESSAGE })
  newPassword!: string;

  @ApiPropertyOptional({
    description: 'Optional confirmation of newPassword. When supplied it must match.',
  })
  @IsOptional()
  @IsString()
  confirmPassword?: string;
}

export class RequestPasswordResetDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: 'green-valley' })
  @IsOptional()
  @IsString()
  tenantSlug?: string;
}

export class ConfirmPasswordResetDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ minLength: PASSWORD_MIN_LENGTH })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(200)
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_PATTERN_MESSAGE })
  newPassword!: string;
}

export class TokenPairResponse {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ description: 'Access token lifetime in seconds.' })
  expiresIn!: number;
}
