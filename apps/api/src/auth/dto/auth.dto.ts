import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password (or the temporary password on first login).' })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({ minLength: 10 })
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  newPassword!: string;
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

  @ApiProperty({ minLength: 10 })
  @IsString()
  @MinLength(10)
  @MaxLength(200)
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
