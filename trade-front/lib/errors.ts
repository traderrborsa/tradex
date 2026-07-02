export function translateApiError(message: string, status?: number): string {
  const m = message.toLowerCase();

  if (
    status === 404 ||
    m.includes('not found') ||
    m.includes('not available') ||
    m.includes('no tick') ||
    m.includes('resource not found')
  ) {
    return 'Sembol bulunamadı veya bu sembol için veri yok.';
  }

  if (m.includes('network') || m.includes('fetch')) {
    return 'Bağlantı hatası. Lütfen tekrar deneyin.';
  }

  if (status === 502 || m.includes('borsapy') || m.includes('service error')) {
    return 'Veri servisine ulaşılamadı. Borsapy servisini kontrol edin.';
  }

  if (m.includes('api error')) {
    return 'Sunucu hatası. Lütfen tekrar deneyin.';
  }

  return message;
}
