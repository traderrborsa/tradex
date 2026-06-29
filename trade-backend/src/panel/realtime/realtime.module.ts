import { Global, Module } from '@nestjs/common';
import { RbacModule } from '../../rbac/rbac.module';
import { FinanceEventsService } from '../finance/finance-events.service';
import { PanelFinanceGateway } from '../finance/finance.gateway';
import { NotificationsEventsService } from '../notifications/notifications-events.service';
import { PanelNotificationsController } from '../notifications/notifications.controller';
import { PanelNotificationsGateway } from '../notifications/notifications.gateway';
import { PanelNotificationsService } from '../notifications/notifications.service';
import { TransactionsEventsService } from '../transactions/transactions-events.service';
import { PanelTransactionsGateway } from '../transactions/transactions.gateway';
import { PanelVerificationEventsService } from '../verification/panel-verification-events.service';
import { PanelVerificationGateway } from '../verification/panel-verification.gateway';

@Global()
@Module({
  imports: [RbacModule],
  controllers: [PanelNotificationsController],
  providers: [
    TransactionsEventsService,
    PanelTransactionsGateway,
    FinanceEventsService,
    PanelFinanceGateway,
    PanelVerificationEventsService,
    PanelVerificationGateway,
    NotificationsEventsService,
    PanelNotificationsGateway,
    PanelNotificationsService,
  ],
  exports: [
    TransactionsEventsService,
    FinanceEventsService,
    PanelVerificationEventsService,
    PanelNotificationsService,
  ],
})
export class RealtimeModule {}
