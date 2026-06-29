import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BistModule } from './bist/bist.module';
import { BiquoteModule } from './biquote/biquote.module';
import { FinanceModule } from './finance/finance.module';
import { CreditModule } from './credit/credit.module';
import { BonusModule } from './bonus/bonus.module';
import { PanelModule } from './panel/panel.module';
import { RealtimeModule } from './panel/realtime/realtime.module';
import { PrismaModule } from './prisma/prisma.module';
import { RbacModule } from './rbac/rbac.module';
import { TradingModule } from './trading/trading.module';
import { ProfileModule } from './profile/profile.module';
import { VerificationModule } from './verification/verification.module';
import { PresenceModule } from './presence/presence.module';
import { PublicModule } from './public/public.module';

@Module({
  imports: [
    PrismaModule,
    RbacModule,
    PresenceModule,
    PublicModule,
    RealtimeModule,
    AuthModule,
    TradingModule,
    FinanceModule,
    CreditModule,
    BonusModule,
    BistModule,
    BiquoteModule,
    PanelModule,
    ProfileModule,
    VerificationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
