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
  OpenPanelTransactionDto,
  ClosePanelPositionDto,
  UpdatePanelPendingOrderDto,
  UpdatePanelPositionDto,
  UpdatePanelTradeDto,
} from './dto/transaction.dto';
import {
  PanelTransactionsService,
  type TransactionStatus,
} from './transactions.service';

@Controller('panel/transactions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PanelTransactionsController {
  constructor(
    private readonly transactions: PanelTransactionsService,
    private readonly rbac: RbacService,
  ) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PANEL_TRANSACTIONS_READ)
  async list(
    @Req() req: { user: { id: string } },
    @Query('status') status?: string,
    @Query('panelOnly') panelOnly?: string,
    @Query('businessId') businessId?: string,
    @Query('userId') userId?: string,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    const normalized = (status ?? 'open') as TransactionStatus;
    const onlyPanel = panelOnly === 'true' || panelOnly === '1';
    return this.transactions.list(
      normalized,
      req.user.id,
      viewerIsAdmin,
      onlyPanel,
      businessId,
      userId,
    );
  }

  @Post('open')
  @RequirePermissions(PERMISSIONS.PANEL_TRANSACTIONS_WRITE)
  async openForUser(
    @Req() req: { user: { id: string } },
    @Body() body: OpenPanelTransactionDto,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.transactions.openForUser(req.user.id, body, viewerIsAdmin);
  }

  @Get('positions/:id')
  @RequirePermissions(PERMISSIONS.PANEL_TRANSACTIONS_READ)
  async getPosition(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.transactions.getPosition(id, req.user.id, viewerIsAdmin);
  }

  @Get('orders/:id')
  @RequirePermissions(PERMISSIONS.PANEL_TRANSACTIONS_READ)
  async getPendingOrder(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.transactions.getPendingOrder(id, req.user.id, viewerIsAdmin);
  }

  @Get('trades/:id')
  @RequirePermissions(PERMISSIONS.PANEL_TRANSACTIONS_READ)
  async getTrade(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.transactions.getTrade(id, req.user.id, viewerIsAdmin);
  }

  @Put('positions/:id')
  @RequirePermissions(PERMISSIONS.PANEL_TRANSACTIONS_WRITE)
  async updatePosition(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() body: UpdatePanelPositionDto,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.transactions.updatePosition(
      id,
      body,
      req.user.id,
      viewerIsAdmin,
    );
  }

  @Post('positions/:id/close')
  @RequirePermissions(PERMISSIONS.PANEL_TRANSACTIONS_WRITE)
  async closePosition(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() body: ClosePanelPositionDto,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.transactions.closePosition(
      id,
      body,
      req.user.id,
      viewerIsAdmin,
    );
  }

  @Put('orders/:id')
  @RequirePermissions(PERMISSIONS.PANEL_TRANSACTIONS_WRITE)
  async updatePendingOrder(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() body: UpdatePanelPendingOrderDto,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.transactions.updatePendingOrder(
      id,
      body,
      req.user.id,
      viewerIsAdmin,
    );
  }

  @Put('trades/:id')
  @RequirePermissions(PERMISSIONS.PANEL_TRANSACTIONS_WRITE)
  async updateTrade(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() body: UpdatePanelTradeDto,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.transactions.updateTrade(id, body, req.user.id, viewerIsAdmin);
  }

  @Delete('positions/:id')
  @RequirePermissions(PERMISSIONS.PANEL_TRANSACTIONS_WRITE)
  async deletePosition(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.transactions.deletePosition(id, req.user.id, viewerIsAdmin);
  }

  @Delete('orders/:id')
  @RequirePermissions(PERMISSIONS.PANEL_TRANSACTIONS_WRITE)
  async deletePendingOrder(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    return this.transactions.deletePendingOrder(id, req.user.id, viewerIsAdmin);
  }
}
