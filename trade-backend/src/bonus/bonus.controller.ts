import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BonusService } from './bonus.service';

@Controller('bonus')
@UseGuards(JwtAuthGuard)
export class BonusController {
  constructor(private readonly bonus: BonusService) {}

  @Get()
  list(
    @Req() req: { user: { id: string } },
    @Query('businessId') businessId?: string,
  ) {
    return this.bonus.listMine(req.user.id, businessId);
  }

  @Post()
  create(
    @Req() req: { user: { id: string } },
    @Body() body: { description?: string; businessId?: string },
  ) {
    return this.bonus.createRequest(req.user.id, body);
  }
}
