import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import {
  BonusService,
  type BonusRequestStatus,
} from '../../bonus/bonus.service';
import { PERMISSIONS } from '../../rbac/permissions.constants';
import { PermissionsGuard } from '../../rbac/permissions.guard';
import { RequirePermissions } from '../../rbac/require-permissions.decorator';
import { RbacService } from '../../rbac/rbac.service';
import { resolvePanelBusinessIds } from '../panel-business-scope';

const STATUSES: BonusRequestStatus[] = [
  'pending',
  'approved',
  'rejected',
  'cancelled',
];

@Controller('panel/bonus')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PanelBonusController {
  constructor(
    private readonly bonus: BonusService,
    private readonly rbac: RbacService,
  ) {}

  private async userWhere(viewerId: string): Promise<Prisma.UserWhereInput> {
    const viewerIsAdmin = await this.rbac.hasAdminRole(viewerId);
    return this.rbac.scopedMemberUserWhere(viewerId, viewerIsAdmin);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.PANEL_BONUS_READ)
  async list(
    @Req() req: { user: { id: string } },
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
    const normalizedStatus = STATUSES.includes(status as BonusRequestStatus)
      ? (status as BonusRequestStatus)
      : undefined;
    const userWhere = await this.userWhere(req.user.id);
    return this.bonus.listForPanel(
      { status: normalizedStatus, userId: userId?.trim() || undefined },
      userWhere,
      businessIds,
    );
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PANEL_BONUS_READ)
  async get(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    const userWhere = await this.userWhere(req.user.id);
    return this.bonus.getForPanel(id, userWhere);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PANEL_BONUS_WRITE)
  async create(
    @Req() req: { user: { id: string } },
    @Body()
    body: {
      userId: string;
      businessId: string;
      amount: number;
      description?: string;
    },
  ) {
    const userWhere = await this.userWhere(req.user.id);
    return this.bonus.createForPanel(body, req.user.id, userWhere);
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.PANEL_BONUS_WRITE)
  async update(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body()
    body: {
      status?: BonusRequestStatus;
      amount?: number;
      description?: string | null;
    },
  ) {
    const userWhere = await this.userWhere(req.user.id);
    return this.bonus.updateForPanel(id, body, req.user.id, userWhere);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.PANEL_BONUS_WRITE)
  async remove(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    const userWhere = await this.userWhere(req.user.id);
    return this.bonus.deleteForPanel(id, userWhere);
  }
}
