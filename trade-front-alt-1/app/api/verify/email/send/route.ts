import { NextRequest, NextResponse } from 'next/server';
import { sendVerificationEmail } from '@/lib/mail.server';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth) {
    return NextResponse.json({ message: 'Oturum gerekli' }, { status: 401 });
  }

  const businessId = req.nextUrl.searchParams.get('businessId');
  const query = businessId
    ? `?businessId=${encodeURIComponent(businessId)}`
    : '';

  let issueRes: Response;
  try {
    issueRes = await fetch(`${API_BASE}/profile/verify/email/issue${query}`, {
      method: 'POST',
      headers: { Authorization: auth },
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      { message: 'Doğrulama kodu alınamadı' },
      { status: 502 },
    );
  }

  if (!issueRes.ok) {
    const err = (await issueRes.json().catch(() => ({}))) as {
      message?: string;
    };
    return NextResponse.json(
      { message: err.message ?? 'Doğrulama kodu oluşturulamadı' },
      { status: issueRes.status },
    );
  }

  const payload = (await issueRes.json()) as {
    to: string;
    fullName: string | null;
    code: string;
  };

  try {
    await sendVerificationEmail(payload);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Doğrulama e-postası gönderilemedi';
    return NextResponse.json({ message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: 'Doğrulama kodu e-posta adresinize gönderildi',
  });
}
