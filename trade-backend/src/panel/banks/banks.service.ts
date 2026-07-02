import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RbacService } from '../../rbac/rbac.service';
import {
  UploadsService,
  type UploadedFilePayload,
} from '../../uploads/uploads.service';
import { toPublicUploadUrl } from '../../uploads/uploads-url';
import { resolvePanelBusinessIds } from '../panel-business-scope';
import type { CreateBankDto, UpdateBankDto } from './dto/bank.dto';

@Injectable()
export class PanelBanksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
    private readonly uploads: UploadsService,
  ) {}

  private serialize(bank: {
    id: string;
    businessId: string;
    name: string;
    logoPath: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    business?: { id: string; displayName: string };
    _count?: { depositAccounts: number };
  }) {
    return {
      id: bank.id,
      businessId: bank.businessId,
      businessName: bank.business?.displayName ?? null,
      name: bank.name,
      logoUrl: toPublicUploadUrl(bank.logoPath),
      isActive: bank.isActive,
      accountCount: bank._count?.depositAccounts ?? 0,
      createdAt: bank.createdAt.toISOString(),
      updatedAt: bank.updatedAt.toISOString(),
    };
  }

  private include() {
    return {
      business: { select: { id: true, displayName: true } },
      _count: { select: { depositAccounts: true } },
    } as const;
  }

  private async assertBankAccess(
    bankId: string,
    viewerId: string,
    viewerIsAdmin: boolean,
  ) {
    const bank = await this.prisma.bank.findUnique({
      where: { id: bankId },
      select: { businessId: true },
    });
    if (!bank) throw new NotFoundException('Banka bulunamadı');
    const canAccess = await this.rbac.canAccessBusiness(
      viewerId,
      bank.businessId,
      viewerIsAdmin,
    );
    if (!canAccess) {
      throw new ForbiddenException('Bu bankaya erişim yetkiniz yok');
    }
    return bank.businessId;
  }

  private validateName(name: string) {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      throw new BadRequestException('Banka adı en az 2 karakter olmalı');
    }
    return trimmed;
  }

  async list(
    viewerId: string,
    viewerIsAdmin: boolean,
    businessId?: string,
  ) {
    const businessIds = await resolvePanelBusinessIds(
      this.rbac,
      viewerId,
      viewerIsAdmin,
      businessId,
    );
    const rows = await this.prisma.bank.findMany({
      where: { businessId: { in: businessIds } },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      include: this.include(),
    });
    return rows.map((row) => this.serialize(row));
  }

  async listActiveForBusiness(businessId: string) {
    const rows = await this.prisma.bank.findMany({
      where: { businessId, isActive: true },
      orderBy: { name: 'asc' },
      include: { business: { select: { id: true, displayName: true } } },
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      logoUrl: toPublicUploadUrl(row.logoPath),
    }));
  }

  async getById(id: string, viewerId: string, viewerIsAdmin: boolean) {
    await this.assertBankAccess(id, viewerId, viewerIsAdmin);
    const row = await this.prisma.bank.findUnique({
      where: { id },
      include: this.include(),
    });
    if (!row) throw new NotFoundException('Banka bulunamadı');
    return this.serialize(row);
  }

  async create(
    dto: CreateBankDto,
    logo: UploadedFilePayload,
    viewerId: string,
    viewerIsAdmin: boolean,
  ) {
    const businessIds = await resolvePanelBusinessIds(
      this.rbac,
      viewerId,
      viewerIsAdmin,
      dto.businessId,
    );
    const targetBusinessId = dto.businessId ?? businessIds[0];
    if (!targetBusinessId || !businessIds.includes(targetBusinessId)) {
      throw new ForbiddenException('Bu işletmeye banka ekleyemezsiniz');
    }

    const name = this.validateName(dto.name);
    const existing = await this.prisma.bank.findUnique({
      where: { businessId_name: { businessId: targetBusinessId, name } },
    });
    if (existing) throw new BadRequestException('Bu banka adı zaten kayıtlı');

    const logoPath = await this.uploads.saveBankLogo(logo);
    const row = await this.prisma.bank.create({
      data: {
        businessId: targetBusinessId,
        name,
        logoPath,
        isActive: dto.isActive !== false && String(dto.isActive) !== 'false',
      },
      include: this.include(),
    });
    return this.serialize(row);
  }

  async update(
    id: string,
    dto: UpdateBankDto,
    logo: UploadedFilePayload | undefined,
    viewerId: string,
    viewerIsAdmin: boolean,
  ) {
    const businessId = await this.assertBankAccess(id, viewerId, viewerIsAdmin);
    const existing = await this.prisma.bank.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Banka bulunamadı');

    const data: { name?: string; logoPath?: string; isActive?: boolean } = {};

    if (dto.name !== undefined) {
      const name = this.validateName(dto.name);
      const clash = await this.prisma.bank.findFirst({
        where: { businessId, name, NOT: { id } },
      });
      if (clash) throw new BadRequestException('Bu banka adı zaten kayıtlı');
      data.name = name;
    }

    if (logo) {
      data.logoPath = await this.uploads.saveBankLogo(logo);
    }

    if (dto.isActive !== undefined) {
      data.isActive = String(dto.isActive) !== 'false';
    }

    const row = await this.prisma.bank.update({
      where: { id },
      data,
      include: this.include(),
    });
    return this.serialize(row);
  }

  async remove(id: string, viewerId: string, viewerIsAdmin: boolean) {
    await this.assertBankAccess(id, viewerId, viewerIsAdmin);
    const existing = await this.prisma.bank.findUnique({
      where: { id },
      include: { _count: { select: { depositAccounts: true } } },
    });
    if (!existing) throw new NotFoundException('Banka bulunamadı');
    if (existing._count.depositAccounts > 0) {
      throw new BadRequestException(
        'Bu bankaya bağlı hesaplar var. Önce hesapları silin veya başka bankaya taşıyın.',
      );
    }
    await this.prisma.bank.delete({ where: { id } });
    return { ok: true };
  }
}
