import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RbacModule } from '../rbac/rbac.module';
import { MemberNotificationsConnectionService } from './member-notifications-connection.service';
import { MemberNotificationsController } from './member-notifications.controller';
import { MemberNotificationsEventsService } from './member-notifications-events.service';
import { MemberNotificationsGateway } from './member-notifications.gateway';
import { MemberNotificationsService } from './member-notifications.service';

@Module({
  imports: [
    RbacModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'tradex-dev-secret-change-me',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [MemberNotificationsController],
  providers: [
    MemberNotificationsService,
    MemberNotificationsEventsService,
    MemberNotificationsConnectionService,
    MemberNotificationsGateway,
  ],
  exports: [MemberNotificationsService],
})
export class MemberNotificationsModule {}
