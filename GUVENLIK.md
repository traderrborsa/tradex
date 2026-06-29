# Güvenlik Denetim Raporu — TradeX Monorepo

**Tarih:** 22 Haziran 2026  
**Kapsam:** `trade-backend`, `trade-panel`, `trade-front`, `trade-front-alt`, `trade-front-alt-1`  
**Durum:** Açık bulgular mevcut — P0 maddeleri production öncesi zorunlu

---

## İçindekiler

1. [Özet](#özet)
2. [Kritik Bulgular (P0)](#kritik-bulgular-p0)
3. [Yüksek Öncelik (P1)](#yüksek-öncelik-p1)
4. [Orta Öncelik (P2)](#orta-öncelik-p2)
5. [Düşük / Bilgi](#düşük--bilgi)
6. [Olumlu Bulgular](#olumlu-bulgular)
7. [Öncelik Matrisi](#öncelik-matrisi)
8. [Düzeltme Kontrol Listesi](#düzeltme-kontrol-listesi)
9. [Güvenlik Politikası Önerileri](#güvenlik-politikası-önerileri)

---

## Özet

| Seviye   | Backend | Panel | Front (genel) |
|----------|---------|-------|---------------|
| Kritik   | 5       | 1     | —             |
| Yüksek   | 8       | 6     | benzer riskler |
| Orta     | 10      | 7     | —             |
| Düşük    | 7       | 9     | —             |

**En acil üç risk:**

1. **Finansal manipülasyon** — Trading API client'tan gelen fiyatlara güveniyor.
2. **PII sızıntısı** — Kimlik belgeleri ve banka dekontları auth olmadan `/uploads/` altında servis ediliyor.
3. **Panel veri sızıntısı** — Panel WebSocket'leri kimlik doğrulamasız; gerçek zamanlı finans/üye verisi yayınlanıyor.

---

## Kritik Bulgular (P0)

### 1. Client kontrollü trade fiyatları (para manipülasyonu)

| Alan | Değer |
|------|-------|
| **Proje** | `trade-backend` |
| **Dosyalar** | `src/trading/trading.controller.ts`, `src/trading/trading.service.ts` |
| **Risk** | Herhangi bir giriş yapmış kullanıcı sahte `bid`/`ask` göndererek işlem fiyatını manipüle edebilir |

Market emirleri, kapanışlar ve tick işleme client'tan gelen `bid` ve `ask` değerlerini doğrudan kullanıyor. Sunucu tarafında BiQuote/BIST veya başka bir güvenilir kaynakla fiyat doğrulaması yok.

**Saldırı senaryosu:** Kullanıcı `bid: 0.01, ask: 0.01` ile ucuzdan alım yapar veya şişirilmiş fiyatla satarak bakiye ve PnL'yi manipüle eder.

**Düzeltme:**
- Execution fiyatlarını yalnızca sunucu tarafında çöz.
- Client'tan gelen fiyat alanlarını kaldır veya yalnızca UI önizlemesi için kullan (fill'de asla kullanma).

---

### 2. `POST /trading/tick` — sahte fiyatla emir tetikleme

| Alan | Değer |
|------|-------|
| **Proje** | `trade-backend` |
| **Dosyalar** | `src/trading/trading.controller.ts` (102–108), `src/trading/trading.service.ts` (560–587) |
| **Risk** | Limit emirleri ve stop-loss/take-profit client fiyatıyla tetiklenebilir |

Endpoint herhangi bir JWT sahibine açık; `assertCanTrade` kontrolü yok.

**Saldırı senaryosu:** Saldırgan sahte fiyat göndererek kârlı limit/stop işlemlerini zorla tetikler.

**Düzeltme:**
- Public endpoint'i kaldır veya yalnızca internal servislere kısıtla.
- Doğrulama kapılarını uygula; fiyatları sunucu market verisinden al.

---

### 3. `POST /trading/reset` — ücretsiz bakiye sıfırlama

| Alan | Değer |
|------|-------|
| **Proje** | `trade-backend` |
| **Dosyalar** | `src/trading/trading.controller.ts` (111–117), `src/trading/trading.service.ts` (590–605) |
| **Risk** | Kayıplı kullanıcı pozisyonları silip başlangıç bakiyesine dönebilir |

**Düzeltme:** Production'da kaldır; gerekirse yalnızca admin/panel + audit log ile sınırla.

---

### 4. Kimlik belgeleri ve finans dekontları auth olmadan erişilebilir

| Alan | Değer |
|------|-------|
| **Proje** | `trade-backend` |
| **Dosyalar** | `src/uploads/static-uploads.ts`, `src/main.ts` |
| **Risk** | KVKK/GDPR ihlali — kimlik kartı, selfie, banka dekontu |

```ts
// src/uploads/static-uploads.ts
app.useStaticAssets(join(process.cwd(), 'uploads'), {
  prefix: '/uploads/',
});
```

URL örneği: `/uploads/identity/{businessId}/{uuid}.jpg` — herhangi biri URL'yi bilirse erişir.

**Saldırı senaryosu:** Panel logları, referrer, tarayıcı geçmişi veya tahmin edilen UUID ile PII sızıntısı.

**Düzeltme:**
- Hassas dosyalar için statik middleware kullanma.
- JWT korumalı controller veya imzalı kısa ömürlü URL (presigned) ile sun.
- `Content-Disposition: attachment` kullan.

---

### 5. Panel WebSocket'leri kimlik doğrulamasız

| Alan | Değer |
|------|-------|
| **Proje** | `trade-backend` |
| **Dosyalar** | `src/panel/notifications/notifications.gateway.ts`, `src/panel/finance/finance.gateway.ts`, `src/panel/transactions/transactions.gateway.ts`, `src/presence/panel-presence.gateway.ts` |
| **Risk** | Gerçek zamanlı müşteri adı, tutar, userId, businessId sızıntısı |

Bağlantıda JWT veya izin kontrolü yok. Notifications gateway tüm bağlı istemcilere `PanelNotificationRow` yayınlıyor.

**Saldırı senaryosu:** `ws://host/ws/panel/notifications` adresine bağlanarak tüm işletmelerin finans/trading uyarılarını dinleme.

**Düzeltme:**
- `presence.gateway.ts` modelindeki JWT + RBAC doğrulamasını tüm panel gateway'lerine uygula.
- Olayları kullanıcı/işletme kapsamına göre filtrele.

---

### 6. Panel JWT token'ı `localStorage`'da

| Alan | Değer |
|------|-------|
| **Proje** | `trade-panel` |
| **Dosyalar** | `lib/auth-storage.ts`, `lib/api.ts`, `contexts/AuthContext.tsx` |
| **Risk** | XSS veya kötü eklenti ile tam admin oturumu çalınabilir |

```ts
// lib/auth-storage.ts
localStorage.setItem('tradex-panel-token', token);
```

**Düzeltme:**
- httpOnly + Secure + SameSite=Strict session cookie (backend login'de set edilsin).
- Kısa ömürlü access token + refresh token rotasyonu.
- Sunucu tarafı logout / token iptal listesi.

---

## Yüksek Öncelik (P1)

### Backend (`trade-backend`)

| # | Bulgu | Konum | Risk |
|---|-------|-------|------|
| 7 | Varsayılan JWT secret kaynak kodda | `src/auth/auth.module.ts:21`, `src/auth/jwt.strategy.ts` → `'tradex-dev-secret-change-me'` | Sahte JWT üretimi |
| 8 | Varsayılan admin şifresi seed'de | `prisma/seed.ts` → `admin@tradex.local` / `admin123` | Panel ele geçirme |
| 9 | `.env` gitignore'da değil | `.gitignore` | Secret'ların repoya girmesi |
| 10 | Panel verification IDOR | `src/panel/verification/verification.controller.ts` — `userId` için iş erişimi kontrolü yok | Başka tenant OTP ve kimlik belgeleri |
| 11 | Profil upload membership kontrolü yok | `src/profile/profile.service.ts` (95–122) | Başka işletmeye belge yükleme |
| 12 | SMS OTP loglarda düz metin | `src/verification/verification.service.ts:542` | Log erişimiyle hesap ele geçirme |
| 13 | Email OTP API yanıtında dönüyor | `src/verification/verification.service.ts:514` | Brute-force / MITM |
| 14 | Auth rate limiting yok | `src/auth/auth.controller.ts`, `src/panel/auth/auth.controller.ts` | Credential stuffing, 2FA brute-force |

**Düzeltmeler:**
- `JWT_SECRET` yoksa veya zayıfsa uygulama başlamasın.
- Seed'de varsayılan şifre kullanma; production'da `PANEL_ADMIN_PASSWORD` zorunlu olsun.
- `.env` ve `.env.*` dosyalarını `.gitignore`'a ekle.
- Verification endpoint'lerine `assertMemberAccess` ekle (`panel/wallet/wallet.service.ts` modeli).
- OTP'yi loglardan ve API yanıtından kaldır; gerçek SMS/e-posta sağlayıcısı kullan.
- `@nestjs/throttler` veya benzeri ile login/OTP endpoint'lerine rate limit.

---

### Panel (`trade-panel`)

| # | Bulgu | Konum | Risk |
|---|-------|-------|------|
| 15 | Route koruması yalnızca client-side | `app/panel/layout.tsx` — `middleware.ts` yok | Panel JS ve API yolları indirilebilir |
| 16 | Yetkilendirme yalnızca UI'da | `app/panel/components/PermissionGate.tsx`, `lib/auth.ts` | Backend zayıfsa API'ye doğrudan saldırı |
| 17 | WebSocket bağlantısında token yok | `lib/panel-*-ws.ts` dosyaları | Backend WS auth yoksa veri sızıntısı |
| 18 | Bildirim `href` open redirect | `app/panel/notifications/page.tsx`, `NotificationDropdown.tsx` | Phishing |
| 19 | 2FA QR üçüncü tarafa gidiyor | `app/login/PanelTwoFactorChallenge.tsx` → `api.qrserver.com` | TOTP secret sızıntısı |
| 20 | `.env` git'e commit edilmiş | `.env` (business ID dahil) | Repo sızıntısında iç yapı ifşası |

**Düzeltmeler:**
- `middleware.ts` ile sunucu tarafı oturum doğrulaması.
- WS için kısa ömürlü ticket veya cookie tabanlı auth.
- Bildirim `href` için allowlist: yalnızca `/panel/...` iç yollar.
- QR kodu client-side (`qrcode` kütüphanesi) veya kendi backend'inizden üretin.
- `.env`'i git'ten çıkar; `.env.example` kullan.


---

## Orta Öncelik (P2)

### Backend

| Bulgu | Konum | Öneri |
|-------|-------|-------|
| JWT 7 gün, iptal listesi yok | `src/auth/auth.module.ts:22` | Kısa access token + refresh; şifre/rol değişiminde iptal |
| Zayıf şifre politikası (min 6) | `src/auth/auth.service.ts`, `src/panel/members/members.service.ts` | Min 12 karakter, karmaşıklık, breach list kontrolü |
| Upload yalnızca `mimetype` kontrolü | `src/uploads/uploads.service.ts` | Magic-byte doğrulama; SVG kısıtla veya sanitize et |
| `PermissionsGuard` default allow | `src/rbac/permissions.guard.ts:23` | `@RequirePermissions` yoksa reddet (default-deny) |
| `PANEL_ACCESS` yalnızca login'de | `src/panel/auth/auth.controller.ts` | `/api/panel/**` için global middleware |
| JWT WebSocket query string'de | `src/presence/presence.gateway.ts:86–90` | `Sec-WebSocket-Protocol` veya post-connect auth |
| `registerExistingUser` cross-tenant | `src/auth/auth.service.ts:132–194` | Yeni işletmeye kayıtta e-posta onayı zorunlu |
| Global `ValidationPipe` yok | `src/main.ts` | `whitelist: true, forbidNonWhitelisted: true` |
| `helmet` yok | `src/main.ts` | Güvenlik header'ları ekle |
| Public business enumeration | `src/public/public-businesses.controller.ts` | Rate limit (kasıtlıysa kabul edilebilir) |

### Panel

| Bulgu | Konum | Öneri |
|-------|-------|-------|
| `businessId` localStorage'da | `lib/panel-business-storage.ts` | Backend her scoped endpoint'te üyelik doğrulasın |
| Doğrulama kodları panelde gösteriliyor | `MemberVerificationCard.tsx` | Maskele + audit log veya kaldır |
| API URL'leri `<img src>` ile render | `MemberVerificationCard.tsx`, `FinanceEditSheet.tsx` | Auth proxy URL; domain allowlist |
| Zayıf dosya upload validasyonu | `components/FileUpload.tsx`, `BankEditSheet.tsx` | Boyut, MIME, magic-byte kontrolü |
| Logout client-only | `contexts/AuthContext.tsx` | Backend `/panel/auth/logout` çağrısı |
| Admin kontrolleri client-only | `lib/auth.ts`, `permissions/page.tsx` | Backend admin endpoint'lerini zorunlu doğrula |
| Role form admin izinleri | `RoleForm.tsx` | Non-admin için `adminOnly` izinleri UI'dan gizle |
| Güvenlik header'ları yok | `next.config.ts` | CSP, `X-Frame-Options`, `Referrer-Policy` |

### Front uygulamaları (`trade-front`, `trade-front-alt`, `trade-front-alt-1`)

Front projeleri panel ile benzer risklere sahip olabilir:

- JWT / token `localStorage` kullanımı
- Client-only route koruması
- `.env` dosyalarının git durumu

Her front projesi için ayrı denetim önerilir; backend açıkları tüm front'ları etkiler.

---

## Düşük / Bilgi

| Konu | Proje | Not |
|------|-------|-----|
| CORS varsayılanı localhost | backend | Production'da `CORS_ORIGIN` açıkça set edilmeli |
| Market-data WebSocket herkese açık | backend | Muhtemelen kasıtlı; subscription rate limit düşünülebilir |
| Prisma raw SQL yalnızca migration script'lerde | backend | Runtime injection riski yok |
| bcrypt cost 10 | backend | Production için 12 düşünülebilir |
| XSS sink bulunamadı | panel | `dangerouslySetInnerHTML` vb. yok |
| CSRF düşük risk | panel | Bearer token pattern; risk XSS'e kayıyor |
| Source map production'da kapalı | panel | Next.js varsayılanı güvenli |
| `npm audit` bulguları | panel | 3 moderate, 1 low (çoğu build-time) |
| `GET /api/` hello endpoint | backend | Bilgi ifşası minimal |
| Tema cookie `Secure`/`HttpOnly` yok | panel | Düşük etki (tercih verisi) |

---

## Olumlu Bulgular

- Panel controller'larında genelde `JwtAuthGuard` + `PermissionsGuard` + `@RequirePermissions` kullanılıyor.
- `PermissionsGuard` izinleri JWT'den değil **veritabanından** okuyor (JWT permission tampering riski azaltılmış).
- Non-admin kullanıcılar `admin` rolü atayamıyor (`users.service.ts`).
- `assertAssignablePermissions` admin-only izinleri custom rollere engelliyor (`roles.service.ts`).
- Finance panel sorguları `userScopeFilter` + `businessIds` ile kapsamlanıyor.
- Prisma ORM kullanımı runtime SQL injection riskini düşürüyor.
- Panel'de React text node render — otomatik XSS kaçışı.

---

## Öncelik Matrisi

```
P0 — Production öncesi ZORUNLU
├── Trading fiyatları sunucuda çözülsün
├── /trading/tick ve /trading/reset kapatılsın veya internal yapılsın
├── Upload'lar auth'lu sunulsun (kimlik/dekont)
├── Panel WebSocket'lerine JWT + RBAC
└── Panel token localStorage'dan çıkarılsın

P1 — İlk sprint
├── Verification IDOR düzelt
├── Upload membership kontrolü
├── JWT_SECRET zorunlu ve güçlü
├── .env gitignore (tüm projeler)
├── Auth/OTP rate limiting
├── OTP log ve response'tan kaldır
├── middleware.ts (panel)
├── WS auth (panel + backend)
├── Bildirim href allowlist
└── 2FA QR client-side

P2 — İkinci sprint
├── ValidationPipe + helmet
├── Kısa JWT TTL + refresh
├── Güçlü şifre politikası
├── PermissionsGuard default-deny
├── PANEL_ACCESS global middleware
├── Güvenlik header'ları (panel)
└── Front projeleri güvenlik taraması
```

---

## Düzeltme Kontrol Listesi

Production'a çıkmadan önce aşağıdaki maddelerin tamamı işaretlenmeli:

### Backend

- [ ] Trading execution fiyatları sunucu kaynağından alınıyor
- [ ] `POST /trading/tick` public erişime kapalı
- [ ] `POST /trading/reset` production'da devre dışı
- [ ] `/uploads/` hassas dosyalar için auth'lu veya presigned URL
- [ ] Tüm panel WebSocket'leri JWT + RBAC ile korunuyor
- [ ] `JWT_SECRET` zorunlu, güçlü ve ortama özel
- [ ] `.env` gitignore'da
- [ ] Seed varsayılan şifre kullanmıyor
- [ ] Verification IDOR düzeltildi
- [ ] Profil upload membership kontrolü var
- [ ] OTP loglarda ve API yanıtında yok
- [ ] Auth endpoint'lerinde rate limiting
- [ ] Global `ValidationPipe` aktif
- [ ] `helmet` middleware aktif

### Panel

- [ ] Token httpOnly cookie'de (localStorage değil)
- [ ] `middleware.ts` ile sunucu tarafı route koruması
- [ ] WebSocket auth token/ticket ile
- [ ] Bildirim `href` allowlist
- [ ] 2FA QR harici servise gitmiyor
- [ ] `.env` git'ten çıkarıldı ve gitignore'da
- [ ] Logout backend'i iptal ediyor
- [ ] `next.config.ts` güvenlik header'ları

### Genel

- [ ] Tüm projelerde `npm audit` temiz veya kabul edilen riskler dokümante
- [ ] Production `CORS_ORIGIN` doğru set edildi
- [ ] Front projeleri (`trade-front*`) aynı kontrol listesinden geçti

---

## Güvenlik Politikası Önerileri

### Gizli bilgi yönetimi

- `.env` dosyalarını asla commit etme; `.env.example` ile şablon paylaş.
- Production secret'ları secret manager (AWS Secrets Manager, Vault vb.) ile yönet.
- JWT secret'ı ortam başına benzersiz ve en az 256-bit rastgele olsun.

### Kimlik doğrulama

- Panel ve kullanıcı oturumları için httpOnly cookie tercih et.
- Access token ömrü kısa (15–60 dk); refresh token rotasyonu uygula.
- 2FA'yı panel admin hesapları için zorunlu kıl.

### API güvenliği

- Tüm panel endpoint'lerinde RBAC zorunlu; UI kontrollerine güvenme.
- Rate limiting: login, OTP, şifre sıfırlama endpoint'leri.
- Input validation: global `ValidationPipe` + DTO class-validator.

### Dosya ve veri

- Hassas upload'lar statik olarak servis etme.
- PII erişimlerini audit log'a yaz.
- OTP ve şifreleri loglama.

### WebSocket

- Her bağlantıda kimlik doğrulama.
- İşletme/kullanıcı kapsamına göre event filtreleme.
- JWT'yi query string yerine güvenli kanaldan ilet.

### CI/CD

- `npm audit` pipeline'da çalışsın.
- Secret scanning (gitleaks, trufflehog) aktif olsun.
- `.env` commit'i otomatik reddedilsin.

---

## İletişim

Güvenlik açığı bildirimi için proje sorumlusuna doğrudan ulaşın. Public issue açmayın; hassas detayları özel kanaldan paylaşın.

---

*Bu belge otomatik güvenlik taraması sonucu oluşturulmuştur. Düzeltmeler uygulandıkça ilgili maddeleri güncelleyin.*
