import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { PresencePanelService } from '../../presence/presence-panel.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PERMISSIONS } from '../../rbac/permissions.constants';
import { PermissionsGuard } from '../../rbac/permissions.guard';
import { RequirePermissions } from '../../rbac/require-permissions.decorator';
import { RbacService } from '../../rbac/rbac.service';

@Controller('panel/presence')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PanelPresenceController {
  constructor(
    private readonly presence: PresencePanelService,
    private readonly rbac: RbacService,
  ) {}

  @Get('online')
  @RequirePermissions(PERMISSIONS.PANEL_MEMBERS_READ)
  async online(@Req() req: { user: { id: string } }) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    const members = await this.presence.listOnlineMembers(
      req.user.id,
      viewerIsAdmin,
    );
    return { count: members.length, members };
  }
}
