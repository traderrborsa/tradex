import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  UploadsService,
  type IdentityDocumentKind,
  type UploadedFilePayload,
} from '../uploads/uploads.service';
import {
  identityDocumentField,
  type IdentityDocType,
} from '../verification/identity-documents';
import { VerificationService } from '../verification/verification.service';
import { PanelVerificationEventsService } from '../panel/verification/panel-verification-events.service';
import { TwoFactorService } from '../two-factor/two-factor.service';

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly verification: VerificationService,
    private readonly uploads: UploadsService,
    private readonly twoFactor: TwoFactorService,
    private readonly panelVerificationEvents: PanelVerificationEventsService,
  ) {}

  async getProfile(userId: string, businessId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        tcKimlikNo: true,
        birthDate: true,
        referenceNumber: true,
        createdAt: true,
        memberships: {
          where: businessId ? { businessId } : undefined,
          select: {
            joinedAt: true,
            registeredViaApp: true,
            business: {
              select: { id: true, displayName: true, name: true, slug: true },
            },
            registeredViaBusiness: {
              select: { id: true, displayName: true },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');

    if (businessId && user.memberships.length === 0) {
      throw new ForbiddenException('Bu işletmeye kayıtlı değilsiniz');
    }

    const membership = businessId ? user.memberships[0] : null;
    const business = membership
      ? {
          id: membership.business.id,
          displayName: membership.business.displayName,
          name: membership.business.name,
          slug: membership.business.slug,
          joinedAt: membership.joinedAt.toISOString(),
          registeredViaApp: membership.registeredViaApp,
          registeredViaBusiness: membership.registeredViaBusiness,
        }
      : null;

    const verification = await this.verification.getUserVerificationState(
      userId,
      businessId,
    );
    const twoFactor = await this.twoFactor.getUserTwoFactorState(
      userId,
      businessId,
    );

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      tcKimlikNo: user.tcKimlikNo,
      birthDate: user.birthDate
        ? user.birthDate.toISOString().slice(0, 10)
        : null,
      referenceNumber: user.referenceNumber,
      createdAt: user.createdAt.toISOString(),
      business,
      verification,
      twoFactor,
    };
  }

  async uploadDocument(
    userId: string,
    kind: IdentityDocumentKind,
    file: UploadedFilePayload,
    businessId?: string,
  ) {
    if (!businessId?.trim()) {
      throw new BadRequestException('İşletme bağlamı gerekli');
    }
    const resolved = businessId.trim();
    const status = await this.verification.ensureMemberVerificationStatus(
      userId,
      resolved,
    );
    if (status.identityVerified) {
      throw new ForbiddenException(
        'Evrak onaylandıktan sonra belge değiştirilemez',
      );
    }

    const field = identityDocumentField(kind);
    const previousPath = status[field];
    const docType = this.docTypeForKind(kind);

    const path = await this.uploads.saveIdentityDocument(
      file,
      kind,
      resolved,
    );

    await this.prisma.memberVerificationStatus.update({
      where: { userId_businessId: { userId, businessId: resolved } },
      data: {
        [field]: path,
        identityVerified: false,
        identityVerifiedAt: null,
        ...(docType ? { identityDocType: docType } : {}),
      },
    });

    if (previousPath && previousPath !== path) {
      await this.uploads.deleteRelativePath(previousPath);
    }

    this.panelVerificationEvents.notify(userId, resolved, 'documents');

    return this.getProfile(userId, resolved);
  }

  async deleteDocument(
    userId: string,
    kind: IdentityDocumentKind,
    businessId?: string,
  ) {
    if (!businessId?.trim()) {
      throw new BadRequestException('İşletme bağlamı gerekli');
    }
    const resolved = businessId.trim();
    const status = await this.verification.ensureMemberVerificationStatus(
      userId,
      resolved,
    );
    if (status.identityVerified) {
      throw new ForbiddenException(
        'Evrak onaylandıktan sonra belge silinemez',
      );
    }

    const field = identityDocumentField(kind);
    const currentPath = status[field];
    if (!currentPath) {
      throw new BadRequestException('Silinecek belge bulunamadı');
    }

    await this.uploads.deleteRelativePath(currentPath);
    await this.prisma.memberVerificationStatus.update({
      where: { userId_businessId: { userId, businessId: resolved } },
      data: {
        [field]: null,
        identityVerified: false,
        identityVerifiedAt: null,
      },
    });

    this.panelVerificationEvents.notify(userId, resolved, 'documents');

    return this.getProfile(userId, resolved);
  }

  private docTypeForKind(
    kind: IdentityDocumentKind,
  ): IdentityDocType | undefined {
    if (kind === 'id-front' || kind === 'id-back') return 'id-card';
    if (kind === 'license-front' || kind === 'license-back') return 'license';
    if (kind === 'passport-front') return 'passport';
    return undefined;
  }

  async begin2faSetup(userId: string, businessId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    return this.twoFactor.beginSetup(userId, user.email, { businessId });
  }

  async enable2fa(userId: string, code: string, businessId?: string) {
    await this.twoFactor.enableTotp(userId, code, businessId);
    return this.getProfile(userId, businessId);
  }

  async disable2fa(userId: string, code: string, businessId?: string) {
    await this.twoFactor.disableTotp(userId, code, businessId);
    return this.getProfile(userId, businessId);
  }

  async dismiss2faOffer(userId: string, businessId?: string) {
    await this.twoFactor.dismissOffer(userId, businessId);
    return this.getProfile(userId, businessId);
  }
}
