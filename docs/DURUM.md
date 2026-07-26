# DURUM — Nerede Kaldık?

> Bu dosya oyunun/geliştirmenin **canlı hafızası**. Her oturum başında okunur,
> her oturum sonunda güncellenir. "Neredeydik, ne yaptık, sırada ne var?"

## 📍 Şu an
- **Aşama:** **Faz 0 — M2 tamamlandı** (Köy Kurma çalışıyor). Sırada M3:
  olay/felaket sistemi + krallıklar/diplomasi + sis + kayıt portu.
- **Sürüm:** v0.6-M2 (modüler) · referans: `prototype/kralliklar-cagi-v0.5.html`.
- **Son güncelleme:** 2026-07-26 (2. oturum).

## ✅ Tamamlanan
### Faz 0 · M2 — Köy Kurma (2. oturum, devam)
- **Komut deseni kuruldu:** UI sim'i asla doğrudan değiştirmez —
  `core/commands.ts` → `Sim.applyCommand` (place/assign/upgradeCenter/demolish).
  Kayıt/replay/çok oyunculu temeli.
- **Sim çekirdeği (`core/sim.ts`):** ekonomi tick (üretim×işçi×seviye×mutluluk
  ×mevsim), tüketim, açlık ölümü, nüfus artışı, mutluluk hedefi, mevsim/yıl +
  hasat bonusu, köylü hareketi (iş çevresi/merkez dolaşımı) — hepsi prototipten
  birebir, hepsi tohumlu RNG ile deterministik. Olaylar `drainEvents` kuyruğuyla
  UI'ya akar (sim DOM bilmez).
- **Veri modülleri:** buildings (11 bina + maliyet/üretim/kurallar), seasons,
  names — saf veri.
- **İnşa akışı:** panel → hayalet (geçerli yeşil / geçersiz kırmızı) → Kur/İptal;
  kurulabilirlik kuralları (su/dolu karo/near_wood/near_stone/fertile/near_gold).
- **Render:** yer tutucu prosedürel bina sprite'ları (11 tip, ayırt edilebilir),
  köylü çizimi (isimden deterministik renk, bob animasyonu, interpolasyonlu),
  karo kovaları, hayalet önizleme.
- **UI:** kaynak HUD'u, bina bilgi kartı (işçi +/−, yükselt, yık), toast, ipucu.
- **Testler: 31/31 yeşil** (13 yeni sim testi: yerleştirme kuralları, işçi,
  üretim/açlık, yükseltme/yıkım, **komut determinizmi**, mevsim döngüsü).
- Duman testi: meydan+ev kuruldu, 5 köylü dolaşıyor, 60 fps, sıfır hata.
### Faz 0 · M1 — Dünya Gezgini (2. oturum)
- Vite + TypeScript (strict) + Vitest iskeleti; `npm run dev/build/test/lint`.
- Klasör yapısı: `src/core` (saf sim), `src/render`, `src/ui`, `src/data`, `src/test`.
- **Core taşındı (birebir davranış):** `rng.ts` (deterministik RNG), `noise.ts`
  (değer gürültüsü + fbm), `world.ts` (biyom haritası, domain warp, ada maskesi,
  kaynak serpiştirme), `data/biomes.ts` (16 biyom, saf veri).
- **Render:** izometrik kamera + koordinat dönüşümü + clamp (prototipten port),
  biyom×gölge sprite üretimi (Canvas2D, geçici görsel — Faz 2'de gerçek dokular),
  görünür-alan taraması, köşegen çizim sırası, minimap (önbellekli + görüş alanı).
- **Girdi:** dokunmatik sistem birebir port — kaydırma+atalet, pinch zoom,
  dokunuş/uzun basma/çift dokunuş, fare tekerleği; minimap'e dokun→odaklan.
- **Testler: 18/18 yeşil** — RNG/noise determinizmi, aynı tohum→aynı dünya,
  biyom eşikleri, kara/su dengesi, kaynak kuralları. `tsc --noEmit` temiz.
- Headless Chromium duman testi: 60 fps, seçim + bilgi kartı çalışıyor.

### 1. oturum
- Prototip incelendi (6772 satır, tüm sistemler haritalandı).
- Yön kararları alındı:
  - Temel: **HTML prototipi** (WebGL canlı dünya). Repo'daki React iskeleti
    kullanılmıyor, göz ardı edilecek/kaldırılacak.
  - Mimari: **modüler TypeScript + Vite**, deterministik sim, çok oyunculuya hazır.
  - Platform: **mobil-önce**.
  - Kapsam: üç sütun dengeli (ekonomi + strateji + savaş) + canlı dünya.
  - Çok oyunculu: ileride şart → determinizm baştan korunacak.
- Master plan yazıldı: `docs/00`…`docs/12` + bu DURUM dosyası.
- Prototip repoya alındı (`prototype/`).

## 🔜 Sıradaki adım (Faz 0 · M3)
1. Olay/felaket sistemi portu (koşullu yangın/veba/deprem/fırtına + iyi olaylar;
   yangın yayılma/söndürme).
2. AI krallıklar + diplomasi portu (kişilikler, büyüme, ilişki, elçi).
3. Sis (keşif) sistemi portu.
4. Kayıt/yükleme (yeni format: tohum + durum; IndexedDB Faz 3'te, önce
   localStorage MVP).
5. Sonra: askeri sistem, teknoloji, zafer/yenilgi → Faz 0 biter.
- Not: Görseller (karo + bina) bilinçli yer tutucu — **gerçek dokular Faz 2'de
  her öğe için ayrı ayrı üretilecek** (kullanıcının açık talebi).
- Not: WebGL atlas motoru henüz taşınmadı; Canvas2D sprite yolu 60 fps veriyor,
  sprite sayısı artınca geçilecek.

## 🧠 Karar günlüğü (neden böyle?)
- **HTML prototipi temel alındı** çünkü gerçek WebGL grafik motoru ve canlı
  dünyası var; React iskeleti emoji-tabanlı ve kullanıcı tarafından kullanılmıyor.
- **Determinizm korunuyor** (Date.now/Math.random sim'de yasak) çünkü çok
  oyunculu ileride şart.
- **İnşa süresi** çekirdek yenilik olarak Faz 1'e alındı (kullanıcı özel istedi).
- **Kayıt/devamlılık** erkene çekildi (Faz 3) çünkü kullanıcı "kaldığı yeri
  hatırlasın" dedi ve her testte ilerlemeyi korur.

## ❓ Açık sorular (ilerledikçe kullanıcıya/teste sorulacak)
- Savaş taktik derinliği: Model A (otomatik) yeterli mi, Model B (taktiksel) şart mı?
- Çevrimdışı ilerleme tavanı ve savaşın çevrimdışı çözülüp çözülmeyeceği.
- Ekonomi zinciri kaç adım derin olacak.

## 📝 Oturum notları
- **2026-07-26 (2b):** Faz 0 M2 bitti — komut desenli sim çekirdeği (ekonomi,
  köylüler, mevsim), inşa akışı (hayalet+kurallar), yer tutucu bina/köylü
  render'ı, HUD/toast. 31 test yeşil, duman testi 60 fps.
  Kullanıcı notu kayda geçti: **dokular her şey için ayrı ayrı üretilecek
  (ileride, Faz 2'de — şimdilik yer tutucu bilinçli tercih).**
- **2026-07-26 (2):** Faz 0 M1 bitti — modüler iskelet + deterministik dünya
  üretimi (testli) + izometrik render + dokunmatik kamera. Duman testi 60 fps.
  Eski React iskeleti kaldırıldı; görsel yol haritası eklendi (docs/yol-haritasi.html).
- **2026-07-26 (1):** Prototip analizi + yön kararları + master plan (docs/) yazıldı,
  prototip repoya alındı.
