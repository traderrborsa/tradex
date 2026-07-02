import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ADMIN_ROLE_NAME, MEMBER_ROLE_NAME } from '../../rbac/permissions.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { RbacService } from '../../rbac/rbac.service';
import { resolvePanelBusinessIds } from '../panel-business-scope';
import type {
  CreatePanelRoleDto,
  UpdatePanelRoleDto,
} from './dto/role.dto';

export type { CreatePanelRoleDto, UpdatePanelRoleDto };

@Injectable()
export class PanelRolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
  ) {}

  private normalizeName(name: string) {
    return name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_]/g, '');
  }

  private isAdminRoleName(name: string) {
    return name === ADMIN_ROLE_NAME;
  }

  private serializeRole(role: {
    id: string;
    businessId: string | null;
    name: string;
    displayName: string;
    description: string | null;
    isActive: boolean;
    isHidden: boolean;
    isSystem: boolean;
    createdAt: Date;
    business?: { id: string; displayName: string } | null;
    permissions: {
      permission: { id: string; key: string; displayName: string };
    }[];
    _count?: { users: number };
  }) {
    return {
      id: role.id,
      businessId: role.businessId,
      businessName: role.business?.displayName ?? null,
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      isActive: role.isActive,
      isHidden: role.isHidden,
      isSystem: role.isSystem,
      createdAt: role.createdAt.toISOString(),
      userCount: role._count?.users ?? 0,
      permissions: role.permissions.map((rp) => ({
        id: rp.permission.id,
        key: rp.permission.key,
        displayName: rp.permission.displayName,
      })),
    };
  }

  private roleInclude() {
    return {
      business: { select: { id: true, displayName: true } },
      permissions: {
        select: {
          permission: { select: { id: true, key: true, displayName: true } },
        },
      },
      _count: { select: { users: true } },
    } as const;
  }

  private async assertRoleAccess(
    roleId: string,
    viewerId: string,
    viewerIsAdmin: boolean,
  ) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { businessId: true, isSystem: true },
    });
    if (!role) throw new NotFoundException('Rol bulunamadı');
    if (role.isSystem && role.businessId === null) {
      if (!viewerIsAdmin && role.isSystem) {
        // non-admin can read system roles but not write - handled elsewhere
      }
      return role;
    }
    if (!role.businessId) return role;
    const canAccess = await this.rbac.canAccessBusiness(
      viewerId,
      role.businessId,
      viewerIsAdmin,
    );
    if (!canAccess) {
      throw new ForbiddenException('Bu role erişim yetkiniz yok');
    }
    return role;
  }

  private async assertAssignablePermissions(
    roleName: string,
    permissionKeys: string[],
  ) {
    if (this.isAdminRoleName(roleName)) return;

    const adminOnly = await this.prisma.permission.findMany({
      where: { adminOnly: true, key: { in: permissionKeys } },
      select: { key: true },
    });
    if (adminOnly.length > 0) {
      throw new ForbiddenException(
        'Yönetici izinleri sadece admin rolüne atanabilir',
      );
    }
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
    const roles = await this.prisma.role.findMany({
      where: {
        ...this.rbac.roleScopeFilter(viewerId, viewerIsAdmin, businessIds),
        ...(viewerIsAdmin ? {} : { isHidden: false }),
      },
      orderBy: [{ businessId: 'asc' }, { name: 'asc' }],
      include: this.roleInclude(),
    });
    return roles.map((r) => this.serializeRole(r));
  }

  async listAssignable(
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
    const excludedNames = viewerIsAdmin
      ? [MEMBER_ROLE_NAME]
      : [MEMBER_ROLE_NAME, ADMIN_ROLE_NAME];

    const roles = await this.prisma.role.findMany({
      where: {
        isActive: true,
        name: { notIn: excludedNames },
        ...this.rbac.roleScopeFilter(viewerId, viewerIsAdmin, businessIds),
        ...(viewerIsAdmin ? {} : { isHidden: false, isSystem: false }),
      },
      orderBy: { displayName: 'asc' },
      select: {
        id: true,
        businessId: true,
        name: true,
        displayName: true,
        isHidden: true,
        isSystem: true,
      },
    });
    return roles.map((r) => ({
      id: r.id,
      businessId: r.businessId,
      name: r.name,
      displayName: r.displayName,
      isHidden: r.isHidden,
      isSystem: r.isSystem,
    }));
  }

  async getById(id: string, viewerId: string, viewerIsAdmin: boolean) {
    await this.assertRoleAccess(id, viewerId, viewerIsAdmin);
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: this.roleInclude(),
    });
    if (!role) throw new NotFoundException('Rol bulunamadı');
    if (role.isHidden && !viewerIsAdmin) {
      throw new NotFoundException('Rol bulunamadı');
    }
    return this.serializeRole(role);
  }

  async create(
    dto: CreatePanelRoleDto,
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
      throw new ForbiddenException('Bu işletmeye rol ekleyemezsiniz');
    }

    const name = this.normalizeName(dto.name);
    const displayName = dto.displayName.trim();
    if (!name) throw new ConflictException('Rol kodu gerekli');
    if (!displayName) throw new ConflictException('Rol adı gerekli');
    if (this.isAdminRoleName(name)) {
      throw new ForbiddenException('Admin rolü oluşturulamaz');
    }

    const existing = await this.prisma.role.findFirst({
      where: { businessId: targetBusinessId, name },
    });
    if (existing) throw new ConflictException('Bu rol kodu zaten var');

    const permissionKeys = dto.permissionKeys ?? [];
    await this.assertAssignablePermissions(name, permissionKeys);

    const permissions = await this.prisma.permission.findMany({
      where: { key: { in: permissionKeys } },
    });
    if (permissions.length !== permissionKeys.length) {
      throw new ConflictException('Geçersiz izin seçimi');
    }

    const role = await this.prisma.role.create({
      data: {
        businessId: targetBusinessId,
        name,
        displayName,
        description: dto.description?.trim() || null,
        isActive: dto.isActive ?? true,
        isHidden: dto.isHidden ?? false,
        isSystem: false,
        permissions: {
          create: permissions.map((p) => ({ permissionId: p.id })),
        },
      },
      include: this.roleInclude(),
    });

    return this.serializeRole(role);
  }

  async update(
    id: string,
    dto: UpdatePanelRoleDto,
    viewerId: string,
    viewerIsAdmin: boolean,
  ) {
    const access = await this.assertRoleAccess(id, viewerId, viewerIsAdmin);
    const existing = await this.prisma.role.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Rol bulunamadı');
    if (existing.isSystem && !viewerIsAdmin) {
      throw new ForbiddenException('Sistem rolü düzenlenemez');
    }

    const data: {
      name?: string;
      displayName?: string;
      description?: string | null;
      isActive?: boolean;
      isHidden?: boolean;
    } = {};

    if (existing.isSystem) {
      if (dto.name !== undefined && dto.name !== existing.name) {
        throw new ForbiddenException('Sistem rolünün kodu değiştirilemez');
      }
      if (dto.isActive === false) {
        throw new ForbiddenException('Admin rolü devre dışı bırakılamaz');
      }
      if (dto.isHidden === true) {
        throw new ForbiddenException('Admin rolü gizlenemez');
      }
    }

    const businessId = existing.businessId ?? access.businessId;

    if (dto.name !== undefined) {
      const name = this.normalizeName(dto.name);
      if (!name) throw new ConflictException('Rol kodu gerekli');
      if (this.isAdminRoleName(name) && !existing.isSystem) {
        throw new ForbiddenException('Admin rol adı kullanılamaz');
      }
      if (businessId) {
        const clash = await this.prisma.role.findFirst({
          where: { businessId, name, NOT: { id } },
        });
        if (clash) throw new ConflictException('Bu rol kodu zaten var');
      }
      data.name = name;
    }

    if (dto.displayName !== undefined) {
      const displayName = dto.displayName.trim();
      if (!displayName) throw new ConflictException('Rol adı gerekli');
      data.displayName = displayName;
    }

    if (dto.description !== undefined) {
      data.description = dto.description?.trim() || null;
    }

    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.isHidden !== undefined) data.isHidden = dto.isHidden;

    const targetName = data.name ?? existing.name;

    if (dto.permissionKeys !== undefined) {
      await this.assertAssignablePermissions(targetName, dto.permissionKeys);
      const permissions = await this.prisma.permission.findMany({
        where: { key: { in: dto.permissionKeys } },
      });
      if (permissions.length !== dto.permissionKeys.length) {
        throw new ConflictException('Geçersiz izin seçimi');
      }
      await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
      if (permissions.length) {
        await this.prisma.rolePermission.createMany({
          data: permissions.map((p) => ({
            roleId: id,
            permissionId: p.id,
          })),
        });
      }
    }

    const role = await this.prisma.role.update({
      where: { id },
      data,
      include: this.roleInclude(),
    });

    return this.serializeRole(role);
  }

  async remove(id: string, viewerId: string, viewerIsAdmin: boolean) {
    await this.assertRoleAccess(id, viewerId, viewerIsAdmin);
    const existing = await this.prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!existing) throw new NotFoundException('Rol bulunamadı');
    if (existing.isSystem) {
      throw new ForbiddenException('Sistem rolü silinemez');
    }
    if (existing._count.users > 0) {
      throw new ConflictException(
        'Bu role atanmış kullanıcılar var, önce atamaları kaldırın',
      );
    }
    await this.prisma.role.delete({ where: { id } });
    return { ok: true };
  }

  listPermissions(forRole?: string) {
    const isAdmin = forRole ? this.isAdminRoleName(forRole) : false;
    return this.prisma.permission.findMany({
      where: isAdmin ? undefined : { adminOnly: false },
      orderBy: { key: 'asc' },
      select: {
        id: true,
        key: true,
        displayName: true,
        description: true,
        adminOnly: true,
      },
    });
  }
}
