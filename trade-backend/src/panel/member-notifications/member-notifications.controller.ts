import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PERMISSIONS } from '../../rbac/permissions.constants';
import { PermissionsGuard } from '../../rbac/permissions.guard';
import { RequirePermissions } from '../../rbac/require-permissions.decorator';
import { RbacService } from '../../rbac/rbac.service';
import { PanelMemberNotificationsService } from './member-notifications.service';

@Controller('panel/member-notifications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PanelMemberNotificationsController {
  constructor(
    private readonly notifications: PanelMemberNotificationsService,
    private readonly rbac: RbacService,
  ) {}

  @Post('send')
  @RequirePermissions(PERMISSIONS.PANEL_MEMBER_NOTIFICATIONS_SEND)
  async send(
    @Req() req: { user: { id: string } },
    @Body()
    body: {
      title: string;
      message: string;
      businessId: string;
      userIds?: string[];
      href?: string;
    },
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.notifications.send(req.user.id, viewerIsAdmin, body);
  }
}
