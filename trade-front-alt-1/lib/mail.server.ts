import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface VerificationEmailInput {
  to: string;
  code: string;
  fullName?: string | null;
}

let transporter: Transporter | null = null;

function getConfig() {
  const host = process.env.NODEMAILER_HOST?.trim();
  const port = Number(process.env.NODEMAILER_PORT ?? '587');
  const user = process.env.NODEMAILER_USER?.trim();
  const pass = process.env.NODEMAILER_PASS?.trim();
  const from = process.env.NODEMAILER_FROM?.trim() || user;

  if (!host || !user || !pass || !from) return null;

  return { host, port, user, pass, from };
}

function getTransporter(): Transporter | null {
  if (transporter) return transporter;

  const config = getConfig();
  if (!config) return null;

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  return transporter;
}

export function isMailConfigured(): boolean {
  return getConfig() !== null;
}

export async function sendVerificationEmail(
  input: VerificationEmailInput,
): Promise<void> {
  const config = getConfig();
  const transport = getTransporter();

  if (!config || !transport) {
    throw new Error(
      'SMTP yapılandırması eksik. .env dosyasına NODEMAILER_* değişkenlerini ekleyin.',
    );
  }

  const greeting = input.fullName?.trim()
    ? `Merhaba ${input.fullName.trim()},`
    : 'Merhaba,';

  const subject = 'E-posta doğrulama kodunuz';
  const text = `${greeting}

Hesabınızı doğrulamak için kodunuz: ${input.code}

Bu kod 15 dakika geçerlidir. Kodu siz istemediyseniz bu e-postayı yok sayabilirsiniz.`;

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.5;color:#111;max-width:480px">
      <p>${greeting}</p>
      <p>Hesabınızı doğrulamak için aşağıdaki kodu kullanın:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:24px 0">${input.code}</p>
      <p style="color:#555;font-size:14px">Bu kod 15 dakika geçerlidir.</p>
      <p style="color:#555;font-size:14px">Kodu siz istemediyseniz bu e-postayı yok sayabilirsiniz.</p>
    </div>
  `;

  await transport.sendMail({
    from: config.from,
    to: input.to,
    subject,
    text,
    html,
  });
}
