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
  CampaignService,
  type CampaignApplicationStatus,
} from '../../campaign/campaign.service';
import { PERMISSIONS } from '../../rbac/permissions.constants';
import { PermissionsGuard } from '../../rbac/permissions.guard';
import { RequirePermissions } from '../../rbac/require-permissions.decorator';
import { RbacService } from '../../rbac/rbac.service';
import type { UploadedFilePayload } from '../../uploads/uploads.service';
import { resolvePanelBusinessIds } from '../panel-business-scope';

const STATUSES: CampaignApplicationStatus[] = [
  'pending',
  'approved',
  'rejected',
  'cancelled',
];

@Controller('panel/campaigns')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PanelCampaignController {
  constructor(
    private readonly campaigns: CampaignService,
    private readonly rbac: RbacService,
  ) {}

  private async userWhere(viewerId: string): Promise<Prisma.UserWhereInput> {
    const viewerIsAdmin = await this.rbac.hasAdminRole(viewerId);
    return this.rbac.scopedMemberUserWhere(viewerId, viewerIsAdmin);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.PANEL_BONUS_READ)
  async listCampaigns(
    @Req() req: { user: { id: string } },
    @Query('businessId') businessId?: string,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    const businessIds = await resolvePanelBusinessIds(
      this.rbac,
      req.user.id,
      viewerIsAdmin,
      businessId,
    );
    return this.campaigns.listCampaignsForPanel(businessIds, true);
  }

  @Get('applications')
  @RequirePermissions(PERMISSIONS.PANEL_BONUS_READ)
  async listApplications(
    @Req() req: { user: { id: string } },
    @Query('status') status?: string,
    @Query('businessId') businessId?: string,
    @Query('userId') userId?: string,
    @Query('campaignId') campaignId?: string,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    const businessIds = await resolvePanelBusinessIds(
      this.rbac,
      req.user.id,
      viewerIsAdmin,
      businessId,
    );
    const normalizedStatus = STATUSES.includes(status as CampaignApplicationStatus)
      ? (status as CampaignApplicationStatus)
      : undefined;
    const userWhere = await this.userWhere(req.user.id);
    return this.campaigns.listApplicationsForPanel(
      {
        status: normalizedStatus,
        userId: userId?.trim() || undefined,
        campaignId: campaignId?.trim() || undefined,
      },
      userWhere,
      businessIds,
    );
  }

  @Get('applications/:id')
  @RequirePermissions(PERMISSIONS.PANEL_BONUS_READ)
  async getApplication(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    const userWhere = await this.userWhere(req.user.id);
    return this.campaigns.getApplicationForPanel(id, userWhere);
  }

  @Put('applications/:id')
  @RequirePermissions(PERMISSIONS.PANEL_BONUS_WRITE)
  async updateApplication(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body()
    body: {
      status?: CampaignApplicationStatus;
      amount?: number;
    },
  ) {
    const userWhere = await this.userWhere(req.user.id);
    return this.campaigns.updateApplicationForPanel(
      id,
      body,
      req.user.id,
      userWhere,
    );
  }

  @Delete('applications/:id')
  @RequirePermissions(PERMISSIONS.PANEL_BONUS_WRITE)
  async deleteApplication(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    const userWhere = await this.userWhere(req.user.id);
    return this.campaigns.deleteApplicationForPanel(id, userWhere);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PANEL_BONUS_READ)
  async getCampaign(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Query('businessId') businessId?: string,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    const businessIds = await resolvePanelBusinessIds(
      this.rbac,
      req.user.id,
      viewerIsAdmin,
      businessId,
    );
    return this.campaigns.getCampaignForPanel(id, businessIds);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PANEL_BONUS_WRITE)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 4 * 1024 * 1024 },
    }),
  )
  async createCampaign(
    @Req() req: { user: { id: string } },
    @UploadedFile() image: UploadedFilePayload | undefined,
    @Body()
    body: {
      businessId: string;
      title: string;
      description: string;
      terms: string;
      isActive?: string | boolean;
    },
  ) {
    if (!image) {
      throw new BadRequestException('Kampanya görseli gerekli');
    }
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    const businessIds = await resolvePanelBusinessIds(
      this.rbac,
      req.user.id,
      viewerIsAdmin,
      body.businessId,
    );
    const isActive =
      body.isActive === undefined ||
      body.isActive === true ||
      body.isActive === 'true';
    return this.campaigns.createCampaignForPanel(
      {
        businessId: body.businessId,
        title: body.title,
        description: body.description,
        terms: body.terms,
        isActive,
      },
      image,
      businessIds,
    );
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.PANEL_BONUS_WRITE)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 4 * 1024 * 1024 },
    }),
  )
  async updateCampaign(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @UploadedFile() image: UploadedFilePayload | undefined,
    @Body()
    body: {
      title?: string;
      description?: string;
      terms?: string;
      isActive?: string | boolean;
    },
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    const businessIds = await resolvePanelBusinessIds(
      this.rbac,
      req.user.id,
      viewerIsAdmin,
    );
    const isActive =
      body.isActive === undefined
        ? undefined
        : body.isActive === true || body.isActive === 'true';
    return this.campaigns.updateCampaignForPanel(
      id,
      {
        title: body.title,
        description: body.description,
        terms: body.terms,
        isActive,
      },
      image,
      businessIds,
    );
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.PANEL_BONUS_WRITE)
  async deleteCampaign(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    const businessIds = await resolvePanelBusinessIds(
      this.rbac,
      req.user.id,
      viewerIsAdmin,
    );
    return this.campaigns.deleteCampaignForPanel(id, businessIds);
  }
}
