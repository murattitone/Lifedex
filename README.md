# Lifedex — kişisel dizin

**Web:** https://lifedex.dev-murattemel.workers.dev · **APK:** [Actions → Android APK](https://github.com/murattitone/Lifedex/actions/workflows/android-apk.yml) → son başarılı çalıştırma → Artifacts → `hayat-apk`

Spor, mutfak, ibadet, gelişim, fikirler, görevler, günlük takip ve hedefler için tek uygulama.
Tek kod tabanı: **Android + iOS + Web** (Expo SDK 58 / React Native 0.88 / Expo Router).

## Mimari

| Katman | Seçim | Neden |
| --- | --- | --- |
| Uygulama | Expo + Expo Router (TypeScript) | Tek kod ile Android, iOS ve web |
| Arayüz | Kendi tasarım sistemi (`src/components/ui`, `src/lib/theme.ts`) — "takvim yaprağı" dili | Bağımlılıksız, 3 platformda birebir aynı |
| Veritabanı | Supabase (Postgres, ücretsiz katman) | Auth + RLS + Storage + Edge Functions tek yerde |
| Web yayını | Cloudflare Workers Static Assets (`wrangler.jsonc`) | Ücretsiz, hızlı |
| Bildirim | `expo-notifications` (yerel, zamanlanmış) | Sunucu gerekmez, çevrimdışı çalışır |
| MCP | Supabase Edge Function `mcp` (Streamable HTTP) | Claude, Cursor vb. bağlanabilir |
| "Önemli" akışı | Edge Function `alerts-sync` + günlük `pg_cron` | Tatil, dini gün, indirim, haber (+ isteğe bağlı Gemini özeti) |

### Veri modeli (genişletilebilir)
Tüm bölümler iki genel tabloyu kullanır, **yeni bölüm eklemek için migration gerekmez**:
- `items` — her kayıt (görev, tarif, ayet, kitap, fikir, hedef, spor programı…). `module` + `kind` + esnek `data jsonb`.
- `logs` — sayısal zaman serisi (su, protein, sayfa, antrenman seti, birikim).
- `alerts` (önemli günler/haberler), `api_tokens` (MCP), `profiles` (ayarlar).

**Yeni bölüm eklemek:** `src/modules/registry.ts` dosyasına modülü, `src/modules/kinds.ts` dosyasına kayıt türünü (alanlarıyla) ekle → genel düzenleyici (`/item/[id]`) otomatik çalışır. İstersen `src/app/(app)/<modül>/index.tsx` ile özel liste ekranı yaz.

## Tasarım dili
Saatli Maarif takviminin günlük yaprağından yola çıkan, modern ve sade bir editoryal dil:
- **Kâğıt + mürekkep**, tek sinyal rengi: takvim kırmızısı (tatil, özel gün, önemli). Yeşil = dini gün / tamamlandı, hardal = indirim. Renk süs değil, anlamdır.
- **Yazı:** Schibsted Grotesk (gazete kökenli grotesk) + rakamlar için dar Big Shoulders Display. Tutarlar "TL" son ekiyle yazılır.
- **Kart yığını yok:** ince çizgiler, numaralı bölümler (01 Defter, 02 Antrenman…), sola hizalı büyük başlıklar, metin etiketli alt menü.
- **Ana sayfa = bugünün yaprağı:** dev tarih, hicri tarih (Ümmü'l-Kurâ), günün notu, günlük defter (çizgi göstergeli su/protein/okuma), canlı durumlu dizin.

## Güvenlik
- Supabase Auth (e-posta + şifre, min. 8 karakter), tüm tablolarda **Row Level Security**: her kullanıcı yalnızca kendi satırlarını görür.
- Oturum mobilde **Keychain / Keystore** (expo-secure-store) içinde, parçalı olarak saklanır.
- **Uygulama kilidi**: parmak izi / yüz / cihaz şifresi; 30 sn arka plandan sonra yeniden kilitlenir.
- Görseller **özel** bucket'ta, kullanıcı klasörüne kilitli; yalnızca 1 saatlik imzalı bağlantılarla gösterilir.
- MCP anahtarları yalnızca **SHA-256 özeti** olarak saklanır, bir kez gösterilir, okuma/yazma kapsamlı, iptal edilebilir.
- Android yedekleme kapalı (`allowBackup: false`), gereksiz izinler engelli.
- Web: sıkı CSP, HSTS, `X-Frame-Options: DENY` vb. (`public/_headers`).
- "Tüm cihazlardan çıkış" desteği.

## Kurulum
```bash
npm install
npm run web        # tarayıcıda geliştirme
npm start          # Expo dev server
```

## Android APK (telefonda test)
**Seçenek A — GitHub Actions (hesap gerekmez):** Projeyi GitHub'a gönder. `.github/workflows/android-apk.yml` her `main` push'unda APK üretir → Actions → son çalıştırma → *Artifacts* → `hayat-apk`. Zip'i aç, APK'yı telefona at ve kur (Bilinmeyen kaynaklara izin ver).

**Seçenek B — EAS Build (Expo hesabı, ücretsiz kota):**
```bash
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview
```
Bitince verilen bağlantıdan / QR koddan APK'yı indir.

iOS için: `npx eas-cli@latest build -p ios --profile preview` (Apple Developer hesabı gerekir).

## Web → Cloudflare
```bash
npx wrangler login
npm run deploy:web
```
veya GitHub'da `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` secret'larını ekle; `.github/workflows/web-deploy.yml` otomatik yayınlar.

Yayından sonra Supabase → Authentication → URL Configuration → **Site URL** alanına Cloudflare adresini yaz (e-posta onayı / şifre sıfırlama bağlantıları oraya döner).

## MCP bağlantısı
Uygulamada **Profil → MCP bağlantıları → Yeni anahtar oluştur**. Çıkan yapılandırmayı MCP istemcine ekle:
```json
{ "mcpServers": { "hayat": { "type": "http", "url": "https://pcddakllvoebaaswsspu.supabase.co/functions/v1/mcp",
  "headers": { "Authorization": "Bearer hyt_..." } } } }
```
Araçlar: `get_today_summary`, `list_items`, `search_items`, `get_item`, `create_item`, `update_item`, `complete_task`, `add_log`, `list_logs`, `list_alerts`.

## Haberlerin yapay zekâ ile özetlenmesi (isteğe bağlı, ücretsiz)
[Google AI Studio](https://aistudio.google.com/apikey)'dan ücretsiz Gemini anahtarı al, sonra Supabase → Edge Functions → Secrets → `GEMINI_API_KEY`. Anahtar yoksa günün manşetleri özetsiz listelenir. Kaynak RSS'leri `NEWS_RSS` (virgülle ayrılmış) ile değiştirebilirsin.

## Klasör yapısı
```
src/app/            ekranlar (Expo Router)
  (app)/(tabs)/     Ana sayfa · Planlayıcı · Önemli · Profil
  (app)/fitness     program, antrenman kaydı, gelişim
  (app)/kitchen     alışveriş, tarifler, yemek planı (alarm)
  (app)/faith       ayetler + kıble pusulası
  (app)/growth      kitap / film / dizi
  (app)/ideas       fikirler (puanlama)
  (app)/trackers    su / protein / sayfa
  (app)/goals       birikim hedefleri, tasarruf kalemleri
  (app)/item/[id]   tüm türler için genel düzenleyici
src/components/ui   tasarım sistemi
src/lib             veri katmanı, bildirimler, kilit, takvim hesapları
src/modules         modül + tür tanımları (genişletme noktası)
supabase/           migration'lar ve edge function'lar
```
