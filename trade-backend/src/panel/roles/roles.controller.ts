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
import { CreatePanelRoleDto, UpdatePanelRoleDto } from './dto/role.dto';
import { PanelRolesService } from './roles.service';

@Controller('panel/roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PanelRolesController {
  constructor(
    private readonly roles: PanelRolesService,
    private readonly rbac: RbacService,
  ) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PANEL_ROLES_READ)
  async list(
    @Req() req: { user: { id: string } },
    @Query('businessId') businessId?: string,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.roles.list(req.user.id, viewerIsAdmin, businessId);
  }

  @Get('assignable')
  @RequirePermissions(
    PERMISSIONS.PANEL_ROLES_READ,
    PERMISSIONS.PANEL_USERS_READ,
    PERMISSIONS.PANEL_USERS_WRITE,
  )
  async listAssignable(
    @Req() req: { user: { id: string } },
    @Query('businessId') businessId?: string,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.roles.listAssignable(req.user.id, viewerIsAdmin, businessId);
  }

  @Get('permissions')
  @RequirePermissions(PERMISSIONS.PANEL_ROLES_READ)
  listPermissions(@Query('forRole') forRole?: string) {
    return this.roles.listPermissions(forRole);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PANEL_ROLES_READ)
  async get(@Param('id') id: string, @Req() req: { user: { id: string } }) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.roles.getById(id, req.user.id, viewerIsAdmin);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PANEL_ROLES_WRITE)
  async create(
    @Req() req: { user: { id: string } },
    @Body() body: CreatePanelRoleDto,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.roles.create(body, req.user.id, viewerIsAdmin);
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.PANEL_ROLES_WRITE)
  async update(
    @Param('id') id: string,
    @Req() req: { user: { id: string } },
    @Body() body: UpdatePanelRoleDto,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.roles.update(id, body, req.user.id, viewerIsAdmin);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.PANEL_ROLES_WRITE)
  async remove(
    @Param('id') id: string,
    @Req() req: { user: { id: string } },
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.roles.remove(id, req.user.id, viewerIsAdmin);
  }
}
