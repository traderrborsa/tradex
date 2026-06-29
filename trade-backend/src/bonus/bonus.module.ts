import { Module } from '@nestjs/common';
import { TradingModule } from '../trading/trading.module';
import { BonusController } from './bonus.controller';
import { BonusService } from './bonus.service';

@Module({
  imports: [TradingModule],
  controllers: [BonusController],
  providers: [BonusService],
  exports: [BonusService],
})
export class BonusModule {}
