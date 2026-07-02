import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PERMISSIONS } from '../../rbac/permissions.constants';
import { PermissionsGuard } from '../../rbac/permissions.guard';
import { RequirePermissions } from '../../rbac/require-permissions.decorator';
import { RbacService } from '../../rbac/rbac.service';
import { PanelDashboardService } from './dashboard.service';

@Controller('panel/dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PanelDashboardController {
  constructor(
    private readonly dashboard: PanelDashboardService,
    private readonly rbac: RbacService,
  ) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PANEL_DASHBOARD_READ)
  async overview(@Req() req: { user: { id: string } }) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.dashboard.getOverview(req.user.id, viewerIsAdmin);
  }
}
