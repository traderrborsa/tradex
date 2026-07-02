import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RbacModule } from '../rbac/rbac.module';
import { UploadsModule } from '../uploads/uploads.module';
import { VerificationConnectionService } from './verification-connection.service';
import { VerificationEventsService } from './verification-events.service';
import { VerificationGateway } from './verification.gateway';
import { VerificationService } from './verification.service';

@Global()
@Module({
  imports: [
    UploadsModule,
    RbacModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'tradex-dev-secret-change-me',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  providers: [
    VerificationService,
    VerificationEventsService,
    VerificationConnectionService,
    VerificationGateway,
  ],
  exports: [VerificationService, VerificationEventsService],
})
export class VerificationModule {}
