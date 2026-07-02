import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PERMISSIONS } from '../../rbac/permissions.constants';
import { PermissionsGuard } from '../../rbac/permissions.guard';
import { RequirePermissions } from '../../rbac/require-permissions.decorator';
import { RbacService } from '../../rbac/rbac.service';
import {
  CreatePanelBusinessDto,
  UpdatePanelBusinessDto,
} from './dto/business.dto';
import { PanelBusinessesService } from './businesses.service';

@Controller('panel/businesses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PanelBusinessesController {
  constructor(
    private readonly businesses: PanelBusinessesService,
    private readonly rbac: RbacService,
  ) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PANEL_BUSINESSES_READ)
  async list(@Req() req: { user: { id: string } }) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.businesses.list(req.user.id, viewerIsAdmin);
  }

  @Get(':id/members')
  @RequirePermissions(PERMISSIONS.PANEL_MEMBERS_READ)
  async members(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.businesses.listMembers(id, req.user.id, viewerIsAdmin);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PANEL_BUSINESSES_READ)
  async get(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.businesses.getById(id, req.user.id, viewerIsAdmin);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PANEL_BUSINESSES_WRITE)
  create(@Body() body: CreatePanelBusinessDto) {
    return this.businesses.create(body);
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.PANEL_BUSINESSES_WRITE)
  async update(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() body: UpdatePanelBusinessDto,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.businesses.update(id, body, req.user.id, viewerIsAdmin);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.PANEL_BUSINESSES_WRITE)
  remove(@Param('id') id: string) {
    return this.businesses.remove(id);
  }
}
