import { ForbiddenException } from '@nestjs/common';
import { RbacService } from '../rbac/rbac.service';

export async function resolvePanelBusinessIds(
  rbac: RbacService,
  viewerId: string,
  viewerIsAdmin: boolean,
  businessId?: string,
): Promise<string[]> {
  const ids = await rbac.resolveAccessibleBusinessIds(
    viewerId,
    viewerIsAdmin,
    businessId,
  );
  if (businessId && ids.length === 0) {
    throw new ForbiddenException('Bu işletmeye erişim yok');
  }
  return ids;
}
