import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ADMIN_ROLE_NAME } from '../../rbac/permissions.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { RbacService } from '../../rbac/rbac.service';
import { resolvePanelBusinessIds } from '../panel-business-scope';

@Injectable()
export class PanelPermissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
  ) {}

  async listAll(
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

    const roleFilter =
      businessIds.length === 0
        ? { id: { in: [] as string[] } }
        : viewerIsAdmin
          ? {
              OR: [
                { businessId: null },
                { businessId: { in: businessIds } },
              ],
            }
          : { businessId: { in: businessIds } };

    const rows = await this.prisma.permission.findMany({
      orderBy: { key: 'asc' },
      include: {
        roles: {
          where: { role: roleFilter },
          select: { roleId: true },
        },
      },
    });
    return rows.map((p) => ({
      id: p.id,
      key: p.key,
      displayName: p.displayName,
      description: p.description,
      adminOnly: p.adminOnly,
      roleCount: p.roles.length,
    }));
  }

  async setAdminOnly(
    permissionId: string,
    adminOnly: boolean,
    viewerId: string,
    viewerIsAdmin: boolean,
    businessId?: string,
  ) {
    this.assertAdmin(viewerIsAdmin);
    const permission = await this.prisma.permission.findUnique({
      where: { id: permissionId },
    });
    if (!permission) throw new NotFoundException('İzin bulunamadı');

    if (adminOnly) {
      const businessIds = await resolvePanelBusinessIds(
        this.rbac,
        viewerId,
        true,
        businessId,
      );
      const nonAdminRoles = await this.prisma.role.findMany({
        where: {
          name: { not: ADMIN_ROLE_NAME },
          ...(businessId
            ? { businessId }
            : businessIds.length
              ? {
                  OR: [
                    { businessId: null },
                    { businessId: { in: businessIds } },
                  ],
                }
              : {}),
        },
        select: { id: true },
      });
      const roleIds = nonAdminRoles.map((r) => r.id);
      if (roleIds.length) {
        await this.prisma.rolePermission.deleteMany({
          where: {
            permissionId,
            roleId: { in: roleIds },
          },
        });
      }
    }

    const updated = await this.prisma.permission.update({
      where: { id: permissionId },
      data: { adminOnly },
      include: {
        roles: {
          where: {
            role: businessId
              ? { businessId }
              : viewerIsAdmin
                ? undefined
                : {
                    businessId: {
                      in: await this.rbac.getStaffBusinessIds(viewerId),
                    },
                  },
          },
          select: { roleId: true },
        },
      },
    });

    return {
      id: updated.id,
      key: updated.key,
      displayName: updated.displayName,
      description: updated.description,
      adminOnly: updated.adminOnly,
      roleCount: updated.roles.length,
    };
  }

  assertAdmin(viewerIsAdmin: boolean) {
    if (!viewerIsAdmin) {
      throw new ForbiddenException('Bu işlem sadece admin içindir');
    }
  }
}
