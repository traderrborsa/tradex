import {
  Body,
  Controller,
  Delete,
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
import { CreatePanelMemberDto } from './dto/member.dto';
import { PanelMembersService } from './members.service';

@Controller('panel/members')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PanelMembersController {
  constructor(
    private readonly members: PanelMembersService,
    private readonly rbac: RbacService,
  ) {}

  @Post()
  @RequirePermissions(PERMISSIONS.PANEL_MEMBERS_WRITE)
  async create(
    @Req() req: { user: { id: string } },
    @Body() body: CreatePanelMemberDto,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.members.create(body, req.user.id, viewerIsAdmin);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.PANEL_MEMBERS_READ)
  async list(
    @Req() req: { user: { id: string } },
    @Query('businessId') businessId?: string,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.members.list(req.user.id, viewerIsAdmin, businessId);
  }

  @Get(':userId')
  @RequirePermissions(PERMISSIONS.PANEL_MEMBERS_READ)
  async get(
    @Req() req: { user: { id: string } },
    @Param('userId') userId: string,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.members.getByUserId(userId, req.user.id, viewerIsAdmin);
  }

  @Delete(':userId')
  @RequirePermissions(PERMISSIONS.PANEL_MEMBERS_WRITE)
  async remove(
    @Req() req: { user: { id: string } },
    @Param('userId') userId: string,
    @Query('businessId') businessId: string,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.members.remove(
      userId,
      businessId,
      req.user.id,
      viewerIsAdmin,
    );
  }
}
