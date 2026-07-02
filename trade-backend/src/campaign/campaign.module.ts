import { Module } from '@nestjs/common';
import { UploadsModule } from '../uploads/uploads.module';
import { TradingModule } from '../trading/trading.module';
import { VerificationModule } from '../verification/verification.module';
import { CampaignController } from './campaign.controller';
import { CampaignService } from './campaign.service';

@Module({
  imports: [TradingModule, VerificationModule, UploadsModule],
  controllers: [CampaignController],
  providers: [CampaignService],
  exports: [CampaignService],
})
export class CampaignModule {}
