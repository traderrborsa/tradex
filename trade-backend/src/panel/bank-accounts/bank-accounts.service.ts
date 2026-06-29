import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RbacService } from '../../rbac/rbac.service';
import { toPublicUploadUrl } from '../../uploads/uploads-url';
import { resolvePanelBusinessIds } from '../panel-business-scope';
import type {
  CreateDepositBankAccountDto,
  UpdateDepositBankAccountDto,
} from './dto/bank-account.dto';

function normalizeIban(value: string) {
  return value.replace(/\s+/g, '').toUpperCase();
}

@Injectable()
export class PanelBankAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
  ) {}

  private serialize(row: {
    id: string;
    businessId: string;
    bankId: string;
    accountHolderName: string;
    iban: string;
    description: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    business?: { id: string; displayName: string };
    bank: { id: string; name: string; logoPath: string };
  }) {
    return {
      id: row.id,
      businessId: row.businessId,
      businessName: row.business?.displayName ?? null,
      bankId: row.bankId,
      bankName: row.bank.name,
      bankLogoUrl: toPublicUploadUrl(row.bank.logoPath),
      accountHolderName: row.accountHolderName,
      iban: row.iban,
      description: row.description,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private bankInclude() {
    return {
      business: { select: { id: true, displayName: true } },
      bank: { select: { id: true, name: true, logoPath: true } },
    } as const;
  }

  private async assertAccountAccess(
    accountId: string,
    viewerId: string,
    viewerIsAdmin: boolean,
  ) {
    const row = await this.prisma.depositBankAccount.findUnique({
      where: { id: accountId },
      select: { businessId: true },
    });
    if (!row) throw new NotFoundException('Banka hesabı bulunamadı');
    const canAccess = await this.rbac.canAccessBusiness(
      viewerId,
      row.businessId,
      viewerIsAdmin,
    );
    if (!canAccess) {
      throw new ForbiddenException('Bu banka hesabına erişim yetkiniz yok');
    }
    return row.businessId;
  }

  private async validateBankId(bankId: string, businessId: string) {
    const bank = await this.prisma.bank.findFirst({
      where: { id: bankId.trim(), businessId, isActive: true },
    });
    if (!bank) {
      throw new BadRequestException(
        'Geçerli bir banka seçin (aynı işletmeye ait olmalı)',
      );
    }
    return bank.id;
  }

  private validateAccountHolderName(name: string) {
    const holder = name.trim().replace(/\s+/g, ' ');
    if (holder.length < 3) {
      throw new BadRequestException('Alıcı adı en az 3 karakter olmalı');
    }
    return holder;
  }

  private validateIban(iban: string) {
    const normalized = normalizeIban(iban);
    if (!/^TR\d{24}$/.test(normalized)) {
      throw new BadRequestException('Geçerli bir TR IBAN girin (TR + 24 rakam)');
    }
    return normalized;
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
    const rows = await this.prisma.depositBankAccount.findMany({
      where: { businessId: { in: businessIds } },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      include: this.bankInclude(),
    });
    return rows.map((row) => this.serialize(row));
  }

  async getById(id: string, viewerId: string, viewerIsAdmin: boolean) {
    await this.assertAccountAccess(id, viewerId, viewerIsAdmin);
    const row = await this.prisma.depositBankAccount.findUnique({
      where: { id },
      include: this.bankInclude(),
    });
    if (!row) throw new NotFoundException('Banka hesabı bulunamadı');
    return this.serialize(row);
  }

  async create(
    dto: CreateDepositBankAccountDto,
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
      throw new ForbiddenException('Bu işletmeye hesap ekleyemezsiniz');
    }

    const bankId = await this.validateBankId(dto.bankId, targetBusinessId);
    const row = await this.prisma.depositBankAccount.create({
      data: {
        businessId: targetBusinessId,
        bankId,
        accountHolderName: this.validateAccountHolderName(dto.accountHolderName),
        iban: this.validateIban(dto.iban),
        description: dto.description?.trim() || null,
        isActive: dto.isActive !== false,
      },
      include: this.bankInclude(),
    });
    return this.serialize(row);
  }

  async update(
    id: string,
    dto: UpdateDepositBankAccountDto,
    viewerId: string,
    viewerIsAdmin: boolean,
  ) {
    const businessId = await this.assertAccountAccess(
      id,
      viewerId,
      viewerIsAdmin,
    );
    const existing = await this.prisma.depositBankAccount.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Banka hesabı bulunamadı');

    const data: {
      bankId?: string;
      accountHolderName?: string;
      iban?: string;
      description?: string | null;
      isActive?: boolean;
    } = {};

    if (dto.bankId !== undefined) {
      data.bankId = await this.validateBankId(dto.bankId, businessId);
    }
    if (dto.accountHolderName !== undefined) {
      data.accountHolderName = this.validateAccountHolderName(
        dto.accountHolderName,
      );
    }
    if (dto.iban !== undefined) {
      data.iban = this.validateIban(dto.iban);
    }
    if (dto.description !== undefined) {
      data.description = dto.description?.trim() || null;
    }
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    const row = await this.prisma.depositBankAccount.update({
      where: { id },
      data,
      include: this.bankInclude(),
    });
    return this.serialize(row);
  }

  async remove(id: string, viewerId: string, viewerIsAdmin: boolean) {
    await this.assertAccountAccess(id, viewerId, viewerIsAdmin);
    const existing = await this.prisma.depositBankAccount.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Banka hesabı bulunamadı');
    await this.prisma.depositBankAccount.delete({ where: { id } });
    return { ok: true };
  }
}
