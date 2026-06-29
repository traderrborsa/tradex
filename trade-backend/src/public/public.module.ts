import { Module } from '@nestjs/common';
import { BusinessMembershipService } from '../auth/business-membership.service';
import { PublicBusinessesController } from './public-businesses.controller';

@Module({
  providers: [BusinessMembershipService],
  controllers: [PublicBusinessesController],
})
export class PublicModule {}
