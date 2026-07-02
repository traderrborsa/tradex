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
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PERMISSIONS } from '../../rbac/permissions.constants';
import { PermissionsGuard } from '../../rbac/permissions.guard';
import { RequirePermissions } from '../../rbac/require-permissions.decorator';
import { RbacService } from '../../rbac/rbac.service';
import type { UploadedFilePayload } from '../../uploads/uploads.service';
import { CreateBankDto, UpdateBankDto } from './dto/bank.dto';
import { PanelBanksService } from './banks.service';

@Controller('panel/banks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PanelBanksController {
  constructor(
    private readonly banks: PanelBanksService,
    private readonly rbac: RbacService,
  ) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PANEL_BANKS_READ)
  async list(
    @Req() req: { user: { id: string } },
    @Query('businessId') businessId?: string,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.banks.list(req.user.id, viewerIsAdmin, businessId);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PANEL_BANKS_READ)
  async get(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.banks.getById(id, req.user.id, viewerIsAdmin);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PANEL_BANKS_WRITE)
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async create(
    @Req() req: { user: { id: string } },
    @UploadedFile() logo: UploadedFilePayload | undefined,
    @Body() body: CreateBankDto,
  ) {
    if (!logo) {
      throw new BadRequestException('Banka logosu gerekli');
    }
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.banks.create(body, logo, req.user.id, viewerIsAdmin);
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.PANEL_BANKS_WRITE)
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async update(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @UploadedFile() logo: UploadedFilePayload | undefined,
    @Body() body: UpdateBankDto,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.banks.update(id, body, logo, req.user.id, viewerIsAdmin);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.PANEL_BANKS_WRITE)
  async remove(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.banks.remove(id, req.user.id, viewerIsAdmin);
  }
}
