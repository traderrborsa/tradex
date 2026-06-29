import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { UploadedFilePayload } from '../uploads/uploads.service';
import { VerificationService } from '../verification/verification.service';
import { ProfileService } from './profile.service';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(
    private readonly profile: ProfileService,
    private readonly verification: VerificationService,
  ) {}

  @Get()
  getProfile(
    @Req() req: { user: { id: string } },
    @Query('businessId') businessId?: string,
  ) {
    return this.profile.getProfile(req.user.id, businessId);
  }

  @Post('verify/email/issue')
  issueEmailCode(
    @Req() req: { user: { id: string } },
    @Query('businessId') businessId?: string,
  ) {
    return this.verification.issueEmailCode(req.user.id, businessId);
  }

  @Post('verify/email/confirm')
  confirmEmailCode(
    @Req() req: { user: { id: string } },
    @Body() body: { code: string },
    @Query('businessId') businessId?: string,
  ) {
    return this.verification.confirmEmailCode(
      req.user.id,
      body.code,
      businessId,
    );
  }

  @Post('verify/sms/send')
  sendSmsCode(
    @Req() req: { user: { id: string } },
    @Query('businessId') businessId?: string,
  ) {
    return this.verification.sendSmsCode(req.user.id, businessId);
  }

  @Post('verify/sms/confirm')
  confirmSmsCode(
    @Req() req: { user: { id: string } },
    @Body() body: { code: string },
    @Query('businessId') businessId?: string,
  ) {
    return this.verification.confirmSmsCode(
      req.user.id,
      body.code,
      businessId,
    );
  }

  @Post('documents/id-front')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  uploadIdFront(
    @Req() req: { user: { id: string } },
    @UploadedFile() file: UploadedFilePayload | undefined,
    @Query('businessId') businessId?: string,
  ) {
    if (!file) throw new BadRequestException('Dosya gerekli');
    return this.profile.uploadDocument(
      req.user.id,
      'id-front',
      file,
      businessId,
    );
  }

  @Post('documents/id-back')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  uploadIdBack(
    @Req() req: { user: { id: string } },
    @UploadedFile() file: UploadedFilePayload | undefined,
    @Query('businessId') businessId?: string,
  ) {
    if (!file) throw new BadRequestException('Dosya gerekli');
    return this.profile.uploadDocument(
      req.user.id,
      'id-back',
      file,
      businessId,
    );
  }

  @Post('documents/selfie')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  uploadSelfie(
    @Req() req: { user: { id: string } },
    @UploadedFile() file: UploadedFilePayload | undefined,
    @Query('businessId') businessId?: string,
  ) {
    if (!file) throw new BadRequestException('Dosya gerekli');
    return this.profile.uploadDocument(
      req.user.id,
      'selfie',
      file,
      businessId,
    );
  }

  @Post('documents/license-front')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  uploadLicenseFront(
    @Req() req: { user: { id: string } },
    @UploadedFile() file: UploadedFilePayload | undefined,
    @Query('businessId') businessId?: string,
  ) {
    if (!file) throw new BadRequestException('Dosya gerekli');
    return this.profile.uploadDocument(
      req.user.id,
      'license-front',
      file,
      businessId,
    );
  }

  @Post('documents/license-back')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  uploadLicenseBack(
    @Req() req: { user: { id: string } },
    @UploadedFile() file: UploadedFilePayload | undefined,
    @Query('businessId') businessId?: string,
  ) {
    if (!file) throw new BadRequestException('Dosya gerekli');
    return this.profile.uploadDocument(
      req.user.id,
      'license-back',
      file,
      businessId,
    );
  }

  @Post('documents/passport-front')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  uploadPassportFront(
    @Req() req: { user: { id: string } },
    @UploadedFile() file: UploadedFilePayload | undefined,
    @Query('businessId') businessId?: string,
  ) {
    if (!file) throw new BadRequestException('Dosya gerekli');
    return this.profile.uploadDocument(
      req.user.id,
      'passport-front',
      file,
      businessId,
    );
  }

  @Post('documents/doc-type')
  async setDocType(
    @Req() req: { user: { id: string } },
    @Body() body: { type: 'id-card' | 'license' | 'passport' },
    @Query('businessId') businessId?: string,
  ) {
    await this.verification.setIdentityDocType(
      req.user.id,
      body.type,
      businessId,
    );
    return this.profile.getProfile(req.user.id, businessId);
  }

  @Delete('documents/id-front')
  deleteIdFront(
    @Req() req: { user: { id: string } },
    @Query('businessId') businessId?: string,
  ) {
    return this.profile.deleteDocument(req.user.id, 'id-front', businessId);
  }

  @Delete('documents/id-back')
  deleteIdBack(
    @Req() req: { user: { id: string } },
    @Query('businessId') businessId?: string,
  ) {
    return this.profile.deleteDocument(req.user.id, 'id-back', businessId);
  }

  @Delete('documents/selfie')
  deleteSelfie(
    @Req() req: { user: { id: string } },
    @Query('businessId') businessId?: string,
  ) {
    return this.profile.deleteDocument(req.user.id, 'selfie', businessId);
  }

  @Delete('documents/license-front')
  deleteLicenseFront(
    @Req() req: { user: { id: string } },
    @Query('businessId') businessId?: string,
  ) {
    return this.profile.deleteDocument(
      req.user.id,
      'license-front',
      businessId,
    );
  }

  @Delete('documents/license-back')
  deleteLicenseBack(
    @Req() req: { user: { id: string } },
    @Query('businessId') businessId?: string,
  ) {
    return this.profile.deleteDocument(req.user.id, 'license-back', businessId);
  }

  @Delete('documents/passport-front')
  deletePassportFront(
    @Req() req: { user: { id: string } },
    @Query('businessId') businessId?: string,
  ) {
    return this.profile.deleteDocument(
      req.user.id,
      'passport-front',
      businessId,
    );
  }

  @Post('2fa/setup/begin')
  begin2fa(
    @Req() req: { user: { id: string } },
    @Query('businessId') businessId?: string,
  ) {
    return this.profile.begin2faSetup(req.user.id, businessId);
  }

  @Post('2fa/enable')
  enable2fa(
    @Req() req: { user: { id: string } },
    @Body() body: { code: string },
    @Query('businessId') businessId?: string,
  ) {
    return this.profile.enable2fa(req.user.id, body.code, businessId);
  }

  @Post('2fa/disable')
  disable2fa(
    @Req() req: { user: { id: string } },
    @Body() body: { code: string },
    @Query('businessId') businessId?: string,
  ) {
    return this.profile.disable2fa(req.user.id, body.code, businessId);
  }

  @Post('2fa/offer/dismiss')
  dismiss2faOffer(
    @Req() req: { user: { id: string } },
    @Query('businessId') businessId?: string,
  ) {
    return this.profile.dismiss2faOffer(req.user.id, businessId);
  }
}
