import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { dirname, extname, join } from 'path';

export type IdentityDocumentKind =
  | 'id-front'
  | 'id-back'
  | 'license-front'
  | 'license-back'
  | 'passport-front'
  | 'selfie';

export type UploadedFilePayload = Express.Multer.File;

type CreditContractKind = 'contract' | 'signed';

const IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const BANK_LOGO_MIMES = new Set([...IMAGE_MIMES, 'image/svg+xml']);

const DOCUMENT_MIMES = new Set([...IMAGE_MIMES, 'application/pdf']);

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
  'application/pdf': '.pdf',
};

function uploadsRoot(): string {
  return join(process.cwd(), 'uploads');
}

function buildRelativePath(...segments: string[]): string {
  return segments.join('/');
}

function assertMime(
  file: UploadedFilePayload,
  allowed: Set<string>,
  label: string,
) {
  if (!file.buffer?.length) {
    throw new BadRequestException('Dosya boş');
  }
  if (!allowed.has(file.mimetype)) {
    throw new BadRequestException(`${label} için desteklenmeyen dosya türü`);
  }
}

function extensionFor(file: UploadedFilePayload): string {
  const fromMime = MIME_TO_EXT[file.mimetype];
  if (fromMime) return fromMime;

  const fromName = extname(file.originalname || '').toLowerCase();
  if (fromName && fromName.length <= 8) return fromName;

  return '';
}

async function saveBuffer(relativeFilePath: string, buffer: Buffer) {
  const absolute = join(uploadsRoot(), relativeFilePath);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, buffer);
  return relativeFilePath;
}

@Injectable()
export class UploadsService {
  async saveIdentityDocument(
    file: UploadedFilePayload,
    _kind: IdentityDocumentKind,
    businessId: string,
  ): Promise<string> {
    assertMime(file, IMAGE_MIMES, 'Kimlik belgesi');
    const ext = extensionFor(file);
    const relativeFilePath = buildRelativePath(
      'identity',
      businessId,
      `${randomUUID()}${ext}`,
    );
    return saveBuffer(relativeFilePath, file.buffer);
  }

  async saveBankLogo(file: UploadedFilePayload): Promise<string> {
    assertMime(file, BANK_LOGO_MIMES, 'Banka logosu');
    const ext = extensionFor(file);
    const relativeFilePath = buildRelativePath('banks', `${randomUUID()}${ext}`);
    return saveBuffer(relativeFilePath, file.buffer);
  }

  async saveFinanceReceipt(file: UploadedFilePayload): Promise<string> {
    assertMime(file, DOCUMENT_MIMES, 'Dekont');
    const ext = extensionFor(file);
    const relativeFilePath = buildRelativePath(
      'receipts',
      `${randomUUID()}${ext}`,
    );
    return saveBuffer(relativeFilePath, file.buffer);
  }

  async saveCreditContract(
    file: UploadedFilePayload,
    kind: CreditContractKind,
  ): Promise<string> {
    assertMime(file, DOCUMENT_MIMES, 'Sözleşme');
    const ext = extensionFor(file);
    const relativeFilePath = buildRelativePath(
      'credit',
      kind,
      `${randomUUID()}${ext}`,
    );
    return saveBuffer(relativeFilePath, file.buffer);
  }

  async deleteRelativePath(relativeFilePath: string | null | undefined) {
    if (!relativeFilePath?.trim()) return;

    const normalized = relativeFilePath.replace(/^\/+/, '');
    if (normalized.includes('..')) return;

    const absolute = join(uploadsRoot(), normalized);
    try {
      await unlink(absolute);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') {
        throw err;
      }
    }
  }
}
