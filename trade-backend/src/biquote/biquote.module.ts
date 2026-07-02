import { Module } from '@nestjs/common';
import { BistModule } from '../bist/bist.module';
import { BiquoteController } from './biquote.controller';
import { BiquoteService } from './biquote.service';
import { BiquoteUpstreamService } from './biquote-upstream.service';
import { TicksGateway } from './ticks.gateway';

@Module({
  imports: [BistModule],
  controllers: [BiquoteController],
  providers: [BiquoteService, BiquoteUpstreamService, TicksGateway],
})
export class BiquoteModule {}
