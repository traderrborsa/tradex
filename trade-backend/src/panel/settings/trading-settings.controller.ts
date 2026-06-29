import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PERMISSIONS } from '../../rbac/permissions.constants';
import { PermissionsGuard } from '../../rbac/permissions.guard';
import { RequirePermissions } from '../../rbac/require-permissions.decorator';
import { RbacService } from '../../rbac/rbac.service';
import { UpdateTradingSettingsDto } from './dto/trading-settings.dto';
import { PanelTradingSettingsService } from './trading-settings.service';

@Controller('panel')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PanelTradingSettingsController {
  constructor(
    private readonly settings: PanelTradingSettingsService,
    private readonly rbac: RbacService,
  ) {}

  @Get('businesses/:id/trading-settings')
  @RequirePermissions(PERMISSIONS.PANEL_BUSINESS_TRADING_SETTINGS_READ)
  async getBusinessSettings(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.settings.getBusinessSettings(id, req.user.id, viewerIsAdmin);
  }

  @Put('businesses/:id/trading-settings')
  @RequirePermissions(PERMISSIONS.PANEL_BUSINESS_TRADING_SETTINGS_WRITE)
  async updateBusinessSettings(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() body: UpdateTradingSettingsDto,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.settings.updateBusinessSettings(
      id,
      body.settings,
      req.user.id,
      viewerIsAdmin,
    );
  }

  @Get('members/:userId/trading-settings')
  @RequirePermissions(PERMISSIONS.PANEL_MEMBER_TRADING_SETTINGS_READ)
  async getMemberSettings(
    @Req() req: { user: { id: string } },
    @Param('userId') userId: string,
    @Query('businessId') businessId: string,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.settings.getMemberSettings(
      userId,
      businessId,
      req.user.id,
      viewerIsAdmin,
    );
  }

  @Put('members/:userId/trading-settings')
  @RequirePermissions(PERMISSIONS.PANEL_MEMBER_TRADING_SETTINGS_WRITE)
  async updateMemberSettings(
    @Req() req: { user: { id: string } },
    @Param('userId') userId: string,
    @Query('businessId') businessId: string,
    @Body() body: UpdateTradingSettingsDto,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.settings.updateMemberSettings(
      userId,
      businessId,
      body.settings,
      req.user.id,
      viewerIsAdmin,
    );
  }

  @Delete('members/:userId/trading-settings')
  @RequirePermissions(PERMISSIONS.PANEL_MEMBER_TRADING_SETTINGS_WRITE)
  async clearMemberSettings(
    @Req() req: { user: { id: string } },
    @Param('userId') userId: string,
    @Query('businessId') businessId: string,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.settings.clearMemberSettings(
      userId,
      businessId,
      req.user.id,
      viewerIsAdmin,
    );
  }
}
