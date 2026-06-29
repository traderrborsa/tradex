import { Module } from '@nestjs/common';
import { UploadsModule } from '../uploads/uploads.module';
import { TradingModule } from '../trading/trading.module';
import { VerificationModule } from '../verification/verification.module';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';

@Module({
  imports: [UploadsModule, VerificationModule, TradingModule],
  controllers: [FinanceController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
