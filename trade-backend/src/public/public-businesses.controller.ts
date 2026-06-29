import { Controller, Get, Param } from '@nestjs/common';
import { BusinessMembershipService } from '../auth/business-membership.service';

@Controller('public/businesses')
export class PublicBusinessesController {
  constructor(private readonly businesses: BusinessMembershipService) {}

  @Get(':idOrSlug')
  getConfig(@Param('idOrSlug') idOrSlug: string) {
    return this.businesses.getPublicConfig(idOrSlug);
  }
}
