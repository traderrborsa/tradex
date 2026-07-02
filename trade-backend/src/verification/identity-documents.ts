import type { IdentityDocumentKind } from '../uploads/uploads.service';

export type IdentityDocType = 'id-card' | 'license' | 'passport';

export type IdentityDocumentPathField =
  | 'idCardFrontPath'
  | 'idCardBackPath'
  | 'licenseFrontPath'
  | 'licenseBackPath'
  | 'passportFrontPath'
  | 'selfiePath';

export const IDENTITY_DOC_TYPES: IdentityDocType[] = [
  'id-card',
  'license',
  'passport',
];

export const IDENTITY_DOC_TYPE_LABELS: Record<IdentityDocType, string> = {
  'id-card': 'T.C. Kimlik',
  license: 'Ehliyet',
  passport: 'Pasaport',
};

export function identityDocumentField(
  kind: IdentityDocumentKind,
): IdentityDocumentPathField {
  if (kind === 'id-front') return 'idCardFrontPath';
  if (kind === 'id-back') return 'idCardBackPath';
  if (kind === 'license-front') return 'licenseFrontPath';
  if (kind === 'license-back') return 'licenseBackPath';
  if (kind === 'passport-front') return 'passportFrontPath';
  return 'selfiePath';
}

export function docKindsForType(type: IdentityDocType): IdentityDocumentKind[] {
  if (type === 'id-card') return ['id-front', 'id-back', 'selfie'];
  if (type === 'license') return ['license-front', 'license-back', 'selfie'];
  return ['passport-front', 'selfie'];
}

export type MemberDocumentPaths = Record<IdentityDocumentPathField, string | null>;

export function memberDocumentPaths(row: {
  idCardFrontPath: string | null;
  idCardBackPath: string | null;
  licenseFrontPath?: string | null;
  licenseBackPath?: string | null;
  passportFrontPath?: string | null;
  selfiePath: string | null;
}): MemberDocumentPaths {
  return {
    idCardFrontPath: row.idCardFrontPath,
    idCardBackPath: row.idCardBackPath,
    licenseFrontPath: row.licenseFrontPath ?? null,
    licenseBackPath: row.licenseBackPath ?? null,
    passportFrontPath: row.passportFrontPath ?? null,
    selfiePath: row.selfiePath,
  };
}

export function isDocTypeComplete(
  paths: MemberDocumentPaths,
  type: IdentityDocType,
): boolean {
  return docKindsForType(type).every((kind) =>
    Boolean(paths[identityDocumentField(kind)]),
  );
}

export function firstCompleteDocType(
  paths: MemberDocumentPaths,
): IdentityDocType | null {
  for (const type of IDENTITY_DOC_TYPES) {
    if (isDocTypeComplete(paths, type)) return type;
  }
  return null;
}

export function resolveApprovalDocType(
  selectedType: IdentityDocType | null | undefined,
  paths: MemberDocumentPaths,
): IdentityDocType | null {
  if (selectedType && isDocTypeComplete(paths, selectedType)) {
    return selectedType;
  }
  return firstCompleteDocType(paths);
}

export const IDENTITY_DOCUMENT_FIELDS: IdentityDocumentPathField[] = [
  'idCardFrontPath',
  'idCardBackPath',
  'licenseFrontPath',
  'licenseBackPath',
  'passportFrontPath',
  'selfiePath',
];
