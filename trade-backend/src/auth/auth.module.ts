import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { RbacModule } from '../rbac/rbac.module';
import { TradingModule } from '../trading/trading.module';
import { VerificationModule } from '../verification/verification.module';
import { TwoFactorModule } from '../two-factor/two-factor.module';
import { BusinessMembershipService } from './business-membership.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    RbacModule,
    TradingModule,
    VerificationModule,
    TwoFactorModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'tradex-dev-secret-change-me',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, BusinessMembershipService, JwtStrategy],
  exports: [AuthService, BusinessMembershipService, JwtModule],
})
export class AuthModule {}
