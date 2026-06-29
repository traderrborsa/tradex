import { Module } from '@nestjs/common';
import { BistController } from './bist.controller';
import { BistService } from './bist.service';
import { BistUpstreamService } from './bist-upstream.service';

@Module({
  controllers: [BistController],
  providers: [BistService, BistUpstreamService],
  exports: [BistService, BistUpstreamService],
})
export class BistModule {}
