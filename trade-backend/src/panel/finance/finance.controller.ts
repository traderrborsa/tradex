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
import { FinanceService, type FinanceRequestType, type FinanceRequestStatus } from '../../finance/finance.service';
import { PERMISSIONS } from '../../rbac/permissions.constants';
import { PermissionsGuard } from '../../rbac/permissions.guard';
import { RequirePermissions } from '../../rbac/require-permissions.decorator';
import { RbacService } from '../../rbac/rbac.service';
import { resolvePanelBusinessIds } from '../panel-business-scope';
import { Prisma } from '@prisma/client';

@Controller('panel/finance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PanelFinanceController {
  constructor(
    private readonly finance: FinanceService,
    private readonly rbac: RbacService,
  ) {}

  private async userWhere(viewerId: string): Promise<Prisma.UserWhereInput> {
    const viewerIsAdmin = await this.rbac.hasAdminRole(viewerId);
    return this.rbac.scopedMemberUserWhere(viewerId, viewerIsAdmin);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.PANEL_FINANCE_READ)
  async list(
    @Req() req: { user: { id: string } },
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('businessId') businessId?: string,
    @Query('userId') userId?: string,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    const businessIds = await resolvePanelBusinessIds(
      this.rbac,
      req.user.id,
      viewerIsAdmin,
      businessId,
    );
    const normalizedType =
      type === 'withdrawal' || type === 'deposit'
        ? (type as FinanceRequestType)
        : undefined;
    const normalizedStatus =
      status === 'pending' ||
      status === 'approved' ||
      status === 'rejected' ||
      status === 'cancelled'
        ? (status as FinanceRequestStatus)
        : undefined;
    const userWhere = await this.userWhere(req.user.id);
    return this.finance.listForPanel(
      {
        type: normalizedType,
        status: normalizedStatus,
        userId: userId?.trim() || undefined,
      },
      userWhere,
      businessIds,
    );
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PANEL_FINANCE_READ)
  async get(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    const userWhere = await this.userWhere(req.user.id);
    return this.finance.getForPanel(id, userWhere);
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.PANEL_FINANCE_WRITE)
  async update(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body()
    body: {
      status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
      amount?: number;
      iban?: string;
      bankId?: string;
      accountHolderName?: string;
      description?: string | null;
    },
  ) {
    const userWhere = await this.userWhere(req.user.id);
    return this.finance.updateForPanel(id, body, req.user.id, userWhere);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.PANEL_FINANCE_WRITE)
  async remove(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    const userWhere = await this.userWhere(req.user.id);
    return this.finance.deleteForPanel(id, userWhere);
  }
}
