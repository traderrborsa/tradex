import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

export function configureStaticUploads(app: NestExpressApplication) {
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });
}
