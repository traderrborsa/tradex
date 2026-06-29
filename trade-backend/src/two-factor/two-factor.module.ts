import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TwoFactorService } from './two-factor.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'tradex-dev-secret-change-me',
    }),
  ],
  providers: [TwoFactorService],
  exports: [TwoFactorService],
})
export class TwoFactorModule {}
