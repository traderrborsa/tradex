export const BUSINESS_ID =
  process.env.NEXT_PUBLIC_BUSINESS_ID?.trim() ?? '';

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME?.trim() ?? '';

export interface BusinessConfig {
  id: string;
  slug: string | null;
  name: string;
  displayName: string;
  isActive: boolean;
}

const CONFIG_CACHE_KEY = 'tradex-business-config';

let memoryConfig: BusinessConfig | null = null;

export function requireBusinessId(): string {
  if (!BUSINESS_ID) {
    throw new Error(
      'İşletme yapılandırması eksik. .env dosyasına panelden kopyalanan işletme UUID veya slug (NEXT_PUBLIC_BUSINESS_ID) ekleyin.',
    );
  }
  return BUSINESS_ID;
}

export function getCachedBusinessConfig(): BusinessConfig | null {
  if (memoryConfig) return memoryConfig;
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(CONFIG_CACHE_KEY);
  if (!raw) return null;
  try {
    memoryConfig = JSON.parse(raw) as BusinessConfig;
    return memoryConfig;
  } catch {
    return null;
  }
}

export function setCachedBusinessConfig(config: BusinessConfig) {
  memoryConfig = config;
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(config));
  }
}

export function resolveActiveBusinessId(): string {
  const config = getCachedBusinessConfig();
  if (config?.id) return config.id;
  return requireBusinessId();
}

export function registeredViaApp(): string | undefined {
  const app = APP_NAME || getCachedBusinessConfig()?.slug || undefined;
  return app || undefined;
}

export async function fetchBusinessConfig(): Promise<BusinessConfig> {
  const cached = getCachedBusinessConfig();
  if (cached) return cached;

  const businessKey = requireBusinessId();
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

  let res: Response;
  try {
    res = await fetch(
      `${apiBase}/public/businesses/${encodeURIComponent(businessKey)}`,
      { cache: 'no-store' },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'fetch failed';
    throw new Error(`İşletme yapılandırması alınamadı: ${msg}`);
  }

  if (!res.ok) {
    throw new Error('Geçersiz veya pasif işletme yapılandırması');
  }

  const config = (await res.json()) as BusinessConfig;
  setCachedBusinessConfig(config);
  return config;
}
