import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@munaxa/domain';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { UsersRepository } from './users.repository';
import { CreateUserDto, SetUserRolesDto, UpdateUserDto } from './users.dto';

/**
 * Tenant staff/user administration: create accounts, set status, assign roles, reset passwords.
 * Gated by `user:manage` (held by SchoolAdmin). Roles are assigned by id from the tenant's own
 * role catalog (see /roles), so custom roles work here too.
 */
@ApiTags('users')
@ApiBearerAuth()
@Controller({ path: 'users', version: '1' })
@RequirePermissions(Permission.USER_MANAGE)
export class UsersController {
  constructor(private readonly repo: UsersRepository) {}

  @Get()
  @ApiOperation({ summary: 'List tenant users with their roles and status' })
  list() {
    return this.repo.list();
  }

  @Post()
  @ApiOperation({ summary: 'Create a user; returns a one-time temporary password' })
  create(@Body() dto: CreateUserDto) {
    return this.repo.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user’s profile or status (suspend/disable/activate)' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.repo.update(id, dto);
  }

  @Put(':id/roles')
  @ApiOperation({ summary: 'Replace a user’s assigned roles' })
  setRoles(@Param('id') id: string, @Body() dto: SetUserRolesDto) {
    return this.repo.setRoles(id, dto);
  }

  @Post(':id/reset-password')
  @ApiOperation({ summary: 'Reset to a new temporary password (returned once)' })
  resetPassword(@Param('id') id: string) {
    return this.repo.resetPassword(id);
  }
}
