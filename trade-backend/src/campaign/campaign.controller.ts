import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CampaignService } from './campaign.service';

@Controller('campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignController {
  constructor(private readonly campaigns: CampaignService) {}

  @Get()
  list(
    @Req() req: { user: { id: string } },
    @Query('businessId') businessId?: string,
  ) {
    return this.campaigns.listActiveForMember(req.user.id, businessId);
  }

  @Get('applications')
  listApplications(
    @Req() req: { user: { id: string } },
    @Query('businessId') businessId?: string,
  ) {
    return this.campaigns.listMyApplications(req.user.id, businessId);
  }

  @Get(':id')
  get(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Query('businessId') businessId?: string,
  ) {
    return this.campaigns.getForMember(id, req.user.id, businessId);
  }

  @Post(':id/apply')
  apply(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() body: { businessId?: string },
  ) {
    return this.campaigns.apply(req.user.id, id, body.businessId);
  }
}
