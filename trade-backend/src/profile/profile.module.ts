import { Module } from '@nestjs/common';
import { TwoFactorModule } from '../two-factor/two-factor.module';
import { UploadsModule } from '../uploads/uploads.module';
import { VerificationModule } from '../verification/verification.module';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

@Module({
  imports: [VerificationModule, UploadsModule, TwoFactorModule],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
