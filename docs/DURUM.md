# DURUM — Nerede Kaldık?

> Bu dosya oyunun/geliştirmenin **canlı hafızası**. Her oturum başında okunur,
> her oturum sonunda güncellenir. "Neredeydik, ne yaptık, sırada ne var?"

## 📍 Şu an
- **Aşama:** **Faz 0 — M1 tamamlandı** (Dünya Gezgini çalışıyor). Sırada M2:
  oyun sistemlerinin (ekonomi/köylü/olay/diplomasi/savaş) modüllere taşınması.
- **Sürüm:** v0.6-M1 (modüler) · referans: `prototype/kralliklar-cagi-v0.5.html`.
- **Son güncelleme:** 2026-07-26 (2. oturum).

## ✅ Tamamlanan
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

## 🔜 Sıradaki adım (Faz 0 · M2)
1. Bina/oyuncu durumu + ekonomi tick'ini `core`'a taşı (komut deseniyle:
   UI → Command → sim; docs/01-MIMARI kuralı).
2. İnşa modu + bina yerleştirme UI'ı (hayalet, geçerlilik kuralları).
3. Köylüler (görünür bireyler) + iş atama.
4. Mevsim/zaman + olay sistemi portu.
5. Sonra: diplomasi/krallıklar, savaş, sis, kayıt.
- Not: Karo görselleri şimdilik düz sprite (bilinçli) — gerçek dokular Faz 2'de.
- Not: WebGL atlas motoru henüz taşınmadı; Canvas2D sprite yolu 60 fps veriyor,
  WebGL'e sprite sayısı artınca geçilecek.

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
- **2026-07-26 (2):** Faz 0 M1 bitti — modüler iskelet + deterministik dünya
  üretimi (testli) + izometrik render + dokunmatik kamera. Duman testi 60 fps.
  Eski React iskeleti kaldırıldı; görsel yol haritası eklendi (docs/yol-haritasi.html).
- **2026-07-26 (1):** Prototip analizi + yön kararları + master plan (docs/) yazıldı,
  prototip repoya alındı.
