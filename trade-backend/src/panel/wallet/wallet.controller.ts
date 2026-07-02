import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PERMISSIONS } from '../../rbac/permissions.constants';
import { PermissionsGuard } from '../../rbac/permissions.guard';
import { RequirePermissions } from '../../rbac/require-permissions.decorator';
import { RbacService } from '../../rbac/rbac.service';
import { PanelWalletService } from './wallet.service';

@Controller('panel')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PanelWalletController {
  constructor(
    private readonly wallet: PanelWalletService,
    private readonly rbac: RbacService,
  ) {}

  @Get('members/:userId/wallet')
  @RequirePermissions(PERMISSIONS.PANEL_WALLET_READ)
  async getMemberWallet(
    @Req() req: { user: { id: string } },
    @Param('userId') userId: string,
    @Query('businessId') businessId?: string,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.wallet.getMemberWallet(
      userId,
      req.user.id,
      viewerIsAdmin,
      businessId,
    );
  }

  @Post('members/:userId/wallet/adjust')
  @RequirePermissions(PERMISSIONS.PANEL_WALLET_WRITE)
  async adjustMemberBalance(
    @Req() req: { user: { id: string } },
    @Param('userId') userId: string,
    @Body()
    body: { type: 'deposit' | 'withdraw'; amount: number; note?: string },
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.wallet.adjustMemberBalance(
      userId,
      body,
      req.user.id,
      viewerIsAdmin,
    );
  }

  @Get('businesses/:id/wallet')
  @RequirePermissions(PERMISSIONS.PANEL_WALLET_READ)
  async getBusinessWallet(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.wallet.getBusinessWalletSummary(
      id,
      req.user.id,
      viewerIsAdmin,
    );
  }
}
