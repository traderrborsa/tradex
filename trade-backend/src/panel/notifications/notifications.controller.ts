import {
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
import { PanelNotificationsService } from './notifications.service';

@Controller('panel/notifications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PanelNotificationsController {
  constructor(
    private readonly notifications: PanelNotificationsService,
    private readonly rbac: RbacService,
  ) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PANEL_NOTIFICATIONS_READ)
  async list(
    @Req() req: { user: { id: string } },
    @Query('take') take?: string,
    @Query('skip') skip?: string,
    @Query('businessId') businessId?: string,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    const limit = Math.min(Math.max(Number(take) || 50, 1), 100);
    const offset = Math.max(Number(skip) || 0, 0);
    return this.notifications.list(
      req.user.id,
      viewerIsAdmin,
      limit,
      offset,
      businessId,
    );
  }

  @Get('unread-count')
  @RequirePermissions(PERMISSIONS.PANEL_NOTIFICATIONS_READ)
  async unreadCount(
    @Req() req: { user: { id: string } },
    @Query('businessId') businessId?: string,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    const count = await this.notifications.unreadCount(
      req.user.id,
      viewerIsAdmin,
      businessId,
    );
    return { count };
  }

  @Patch('read-all')
  @RequirePermissions(PERMISSIONS.PANEL_NOTIFICATIONS_WRITE)
  async markAllRead(
    @Req() req: { user: { id: string } },
    @Query('businessId') businessId?: string,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.notifications.markAllRead(
      req.user.id,
      viewerIsAdmin,
      businessId,
    );
  }

  @Patch(':id/read')
  @RequirePermissions(PERMISSIONS.PANEL_NOTIFICATIONS_WRITE)
  async markRead(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.notifications.markRead(req.user.id, viewerIsAdmin, id);
  }
}
