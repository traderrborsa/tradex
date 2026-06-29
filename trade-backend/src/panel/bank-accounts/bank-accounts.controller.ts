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
import {
  CreateDepositBankAccountDto,
  UpdateDepositBankAccountDto,
} from './dto/bank-account.dto';
import { PanelBankAccountsService } from './bank-accounts.service';

@Controller('panel/bank-accounts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PanelBankAccountsController {
  constructor(
    private readonly bankAccounts: PanelBankAccountsService,
    private readonly rbac: RbacService,
  ) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PANEL_BANK_ACCOUNTS_READ)
  async list(
    @Req() req: { user: { id: string } },
    @Query('businessId') businessId?: string,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.bankAccounts.list(req.user.id, viewerIsAdmin, businessId);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PANEL_BANK_ACCOUNTS_READ)
  async get(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.bankAccounts.getById(id, req.user.id, viewerIsAdmin);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PANEL_BANK_ACCOUNTS_WRITE)
  async create(
    @Req() req: { user: { id: string } },
    @Body() body: CreateDepositBankAccountDto,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.bankAccounts.create(body, req.user.id, viewerIsAdmin);
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.PANEL_BANK_ACCOUNTS_WRITE)
  async update(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() body: UpdateDepositBankAccountDto,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.bankAccounts.update(id, body, req.user.id, viewerIsAdmin);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.PANEL_BANK_ACCOUNTS_WRITE)
  async remove(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.bankAccounts.remove(id, req.user.id, viewerIsAdmin);
  }
}
