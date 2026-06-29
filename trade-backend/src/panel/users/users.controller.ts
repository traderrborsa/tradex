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
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PERMISSIONS } from '../../rbac/permissions.constants';
import { PermissionsGuard } from '../../rbac/permissions.guard';
import { RequirePermissions } from '../../rbac/require-permissions.decorator';
import { RbacService } from '../../rbac/rbac.service';
import { CreatePanelUserDto, UpdatePanelUserDto } from './dto/user.dto';
import { PanelUsersService } from './users.service';

@Controller('panel/users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PanelUsersController {
  constructor(
    private readonly users: PanelUsersService,
    private readonly rbac: RbacService,
  ) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PANEL_USERS_READ)
  async list(
    @Req() req: { user: { id: string } },
    @Query('businessId') businessId?: string,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.users.list(req.user.id, viewerIsAdmin, businessId);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PANEL_USERS_READ)
  async get(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.users.getById(id, req.user.id, viewerIsAdmin);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PANEL_USERS_WRITE)
  async create(
    @Req() req: { user: { id: string } },
    @Body() body: CreatePanelUserDto,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.users.create(body, req.user.id, viewerIsAdmin);
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.PANEL_USERS_WRITE)
  async update(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() body: UpdatePanelUserDto,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.users.update(id, body, req.user.id, viewerIsAdmin);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.PANEL_USERS_WRITE)
  async remove(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.users.remove(id, req.user.id, viewerIsAdmin);
  }
}
