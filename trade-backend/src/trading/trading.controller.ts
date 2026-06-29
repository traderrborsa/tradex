import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TradingConfigService } from './trading-config.service';
import { TradingService } from './trading.service';

interface AuthUser {
  id: string;
  email: string;
}

@Controller('trading')
@UseGuards(JwtAuthGuard)
export class TradingController {
  constructor(
    private readonly tradingService: TradingService,
    private readonly tradingConfig: TradingConfigService,
  ) {}

  @Get('config')
  async getConfig(
    @Req() req: { user: AuthUser },
    @Query('businessId') businessId?: string,
  ) {
    const resolved = await this.tradingService.resolveBusinessId(
      req.user.id,
      businessId,
    );
    return this.tradingConfig.getSettingsBundle(req.user.id, resolved);
  }

  @Get('portfolio')
  getPortfolio(
    @Req() req: { user: AuthUser },
    @Query('businessId') businessId?: string,
  ) {
    return this.tradingService.getPortfolio(req.user.id, businessId);
  }

  @Post('market')
  marketOrder(
    @Req() req: { user: AuthUser },
    @Body()
    body: {
      symbol: string;
      side: 'buy' | 'sell';
      quantity: number;
      bid: number;
      ask: number;
      stopLoss?: number;
      takeProfit?: number;
      businessId?: string;
    },
  ) {
    return this.tradingService.marketOrder(req.user.id, body);
  }

  @Post('limit')
  limitOrder(
    @Req() req: { user: AuthUser },
    @Body()
    body: {
      symbol: string;
      side: 'buy' | 'sell';
      quantity: number;
      limitPrice: number;
      stopLoss?: number;
      takeProfit?: number;
      businessId?: string;
    },
  ) {
    return this.tradingService.limitOrder(req.user.id, body);
  }

  @Post('close')
  close(
    @Req() req: { user: AuthUser },
    @Body()
    body: {
      positionId: string;
      bid: number;
      ask: number;
      businessId?: string;
    },
  ) {
    return this.tradingService.close(req.user.id, body);
  }

  @Patch('positions/:id/stops')
  updatePositionStops(
    @Req() req: { user: AuthUser },
    @Param('id') id: string,
    @Body()
    body: {
      stopLoss?: number | null;
      takeProfit?: number | null;
      businessId?: string;
    },
  ) {
    return this.tradingService.updatePositionStops(req.user.id, id, body);
  }

  @Delete('orders/:id')
  cancelOrder(
    @Req() req: { user: AuthUser },
    @Param('id') id: string,
    @Query('businessId') businessId?: string,
  ) {
    return this.tradingService.cancelOrder(req.user.id, id, businessId);
  }

  @Post('tick')
  processTick(
    @Req() req: { user: AuthUser },
    @Body()
    body: { symbol: string; bid: number; ask: number; businessId?: string },
  ) {
    return this.tradingService.processTick(req.user.id, body);
  }

  @Post('reset')
  reset(
    @Req() req: { user: AuthUser },
    @Query('businessId') businessId?: string,
  ) {
    return this.tradingService.resetAccount(req.user.id, businessId);
  }
}
