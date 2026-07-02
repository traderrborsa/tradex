import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import {
  CreditService,
  type CreditRequestStatus,
} from '../../credit/credit.service';
import { PERMISSIONS } from '../../rbac/permissions.constants';
import { PermissionsGuard } from '../../rbac/permissions.guard';
import { RequirePermissions } from '../../rbac/require-permissions.decorator';
import { RbacService } from '../../rbac/rbac.service';
import type { UploadedFilePayload } from '../../uploads/uploads.service';
import { resolvePanelBusinessIds } from '../panel-business-scope';

const STATUSES: CreditRequestStatus[] = [
  'pending',
  'contract_uploaded',
  'signed',
  'approved',
  'rejected',
  'cancelled',
];

@Controller('panel/credit')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PanelCreditController {
  constructor(
    private readonly credit: CreditService,
    private readonly rbac: RbacService,
  ) {}

  private async userWhere(viewerId: string): Promise<Prisma.UserWhereInput> {
    const viewerIsAdmin = await this.rbac.hasAdminRole(viewerId);
    return this.rbac.scopedMemberUserWhere(viewerId, viewerIsAdmin);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.PANEL_CREDIT_READ)
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
    const normalizedStatus = STATUSES.includes(status as CreditRequestStatus)
      ? (status as CreditRequestStatus)
      : undefined;
    const userWhere = await this.userWhere(req.user.id);
    return this.credit.listForPanel(
      { status: normalizedStatus, userId: userId?.trim() || undefined },
      userWhere,
      businessIds,
    );
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PANEL_CREDIT_READ)
  async get(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    const userWhere = await this.userWhere(req.user.id);
    return this.credit.getForPanel(id, userWhere);
  }

  @Post(':id/contract')
  @RequirePermissions(PERMISSIONS.PANEL_CREDIT_WRITE)
  @UseInterceptors(
    FileInterceptor('contract', {
      storage: memoryStorage(),
      limits: { fileSize: 16 * 1024 * 1024 },
    }),
  )
  async uploadContract(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @UploadedFile() file: UploadedFilePayload | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('Sözleşme dosyası gerekli');
    }
    const userWhere = await this.userWhere(req.user.id);
    return this.credit.uploadContract(id, file, userWhere);
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.PANEL_CREDIT_WRITE)
  async update(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body()
    body: {
      status?: CreditRequestStatus;
      description?: string | null;
      amount?: number;
    },
  ) {
    const userWhere = await this.userWhere(req.user.id);
    return this.credit.updateForPanel(id, body, req.user.id, userWhere);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.PANEL_CREDIT_WRITE)
  async remove(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    const userWhere = await this.userWhere(req.user.id);
    return this.credit.deleteForPanel(id, userWhere);
  }
}
