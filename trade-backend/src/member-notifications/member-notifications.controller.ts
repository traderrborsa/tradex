import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MemberNotificationsService } from './member-notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class MemberNotificationsController {
  constructor(
    private readonly notifications: MemberNotificationsService,
  ) {}

  @Get()
  async list(
    @Req() req: { user: { id: string } },
    @Query('take') take?: string,
    @Query('skip') skip?: string,
    @Query('businessId') businessId?: string,
  ) {
    const limit = Math.min(Math.max(Number(take) || 50, 1), 100);
    const offset = Math.max(Number(skip) || 0, 0);
    return this.notifications.list(
      req.user.id,
      limit,
      offset,
      businessId?.trim() || undefined,
    );
  }

  @Get('unread-count')
  async unreadCount(
    @Req() req: { user: { id: string } },
    @Query('businessId') businessId?: string,
  ) {
    const count = await this.notifications.unreadCount(
      req.user.id,
      businessId?.trim() || undefined,
    );
    return { count };
  }

  @Patch('read-all')
  async markAllRead(
    @Req() req: { user: { id: string } },
    @Query('businessId') businessId?: string,
  ) {
    return this.notifications.markAllRead(
      req.user.id,
      businessId?.trim() || undefined,
    );
  }

  @Patch(':id/read')
  async markRead(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.notifications.markRead(req.user.id, id);
  }
}
