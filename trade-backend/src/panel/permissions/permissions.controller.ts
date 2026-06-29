import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PERMISSIONS } from '../../rbac/permissions.constants';
import { PermissionsGuard } from '../../rbac/permissions.guard';
import { RequirePermissions } from '../../rbac/require-permissions.decorator';
import { RbacService } from '../../rbac/rbac.service';
import { PanelPermissionsService } from './permissions.service';

@Controller('panel/permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PanelPermissionsController {
  constructor(
    private readonly permissions: PanelPermissionsService,
    private readonly rbac: RbacService,
  ) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PANEL_ROLES_READ)
  async list(
    @Req() req: { user: { id: string } },
    @Query('businessId') businessId?: string,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    this.permissions.assertAdmin(viewerIsAdmin);
    return this.permissions.listAll(req.user.id, viewerIsAdmin, businessId);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.PANEL_ROLES_WRITE)
  async updateAdminOnly(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() body: { adminOnly: boolean },
    @Query('businessId') businessId?: string,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    this.permissions.assertAdmin(viewerIsAdmin);
    return this.permissions.setAdminOnly(
      id,
      body.adminOnly,
      req.user.id,
      viewerIsAdmin,
      businessId,
    );
  }
}
