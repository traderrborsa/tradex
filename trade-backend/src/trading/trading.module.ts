import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { BistModule } from '../bist/bist.module';
import { RbacModule } from '../rbac/rbac.module';
import { VerificationModule } from '../verification/verification.module';
import { MemberNotificationsModule } from '../member-notifications/member-notifications.module';
import { TradingAccountService } from './trading-account.service';
import { TradingConfigService } from './trading-config.service';
import { TradingController } from './trading.controller';
import { TradingService } from './trading.service';
import { PortfolioConnectionService } from './portfolio-connection.service';
import { PortfolioEventsService } from './portfolio-events.service';
import { PortfolioGateway } from './portfolio.gateway';

@Module({
  imports: [
    BistModule,
    VerificationModule,
    RbacModule,
    MemberNotificationsModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'tradex-dev-secret-change-me',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [TradingController],
  providers: [
    TradingService,
    TradingAccountService,
    TradingConfigService,
    PortfolioEventsService,
    PortfolioConnectionService,
    PortfolioGateway,
  ],
  exports: [TradingService, TradingAccountService, TradingConfigService, PortfolioEventsService],
})
export class TradingModule {}
