# DURUM — Nerede Kaldık?

> Bu dosya oyunun/geliştirmenin **canlı hafızası**. Her oturum başında okunur,
> her oturum sonunda güncellenir. "Neredeydik, ne yaptık, sırada ne var?"

## 📍 Şu an
- **Aşama:** **Faz 0 — M4 tamamlandı** (savaş, teknoloji, komutanlar, zafer).
  Oyunun ÇEKİRDEK sistemleri modüler motorda tam çalışıyor. Sırada M5:
  kalan prototip parite parçaları (aşağıda) → sonra **Faz 1: inşa süreleri**.
- **Sürüm:** v0.6-M4 (modüler) · referans: `prototype/kralliklar-cagi-v0.5.html`.
- **Son güncelleme:** 2026-07-26 (2. oturum).

## ✅ Tamamlanan
### Faz 0 · M4 — Savaş & İlerleme (2. oturum, devam)
- **Askeri sistem** (`core/military.ts` + `data/units.ts`): 3 birim türü
  (taş-kağıt-makas + %65 karşıt bonusu), kışlada eğitim (kaynak+köylü),
  ordu gönderme (komutanlı), yürüyen ordular, savaş çözümü (sur/kuşatma
  cezası/şans/ganimet/toprak kaybı), sağ kalanların dönüşü, barbar akını,
  AI'nin oyuncuya saldırısı (ilişki<-55 & güç üstünlüğü), müttefik yardımı,
  sinsi ihanet saldırısı.
- **Komutanlar:** 6 özellik, seviye/tecrübe (efsane teknolojisiyle 2x),
  savaşta ölüm/esaret, orduya otomatik önderlik.
- **Teknoloji** (`core/tech.ts` + `data/techs.ts`): 4 dalda 16 teknoloji,
  önkoşul zinciri, tüm çarpanlar ekonomi/savaş/diplomasi/olaylara bağlı
  (saban→tarla, taş ustalığı→maliyet, casus ağı→casusluk, pazar→ticaret…).
- **Zafer/Yenilgi:** fetih, refah (meydan max + 50 nüfus), diplomatik
  (herkesle ittifak), yenilgi (nüfus 0); istatistikli son ekran; oyun bitince
  sim durur, kayıt temizlenir.
- **Olay entegrasyonu:** barbar akını + kahraman olayları artık aktif;
  felaket riski "sağlam yapı" ile azalıyor.
- **Restore referans hatası bulundu ve düzeltildi** (host'ların tuttuğu
  res/units referansları korunuyor) + buna regresyon testi.
- **UI:** kışla paneli (eğitim+komutan), teknoloji paneli, diplomaside
  "Saldır", HUD'da 📜 bilgi + ⚔️ ordu, son ekran; sahnede yürüyen ordu
  (sancak+sayı rozeti).
- **Testler: 66/66 yeşil** — savaş matematiği, eğitim, ordu yürüyüşü/savaşı,
  komutanlar, teknoloji etkileri, zafer koşulları, askeri dahil kayıt
  roundtrip determinizmi.
### Faz 0 · M3 — Canlı Dünya (2. oturum, devam)
- **Olay/felaket sistemi** (`core/events.ts`): koşullu yangın (yayılır,
  söndürülür — komutla), veba (süreli can kaybı), deprem, kasırga, sert kış,
  isyan + iyi olaylar (altın çağ, göç, kervan). Etki çarpanları (prodMult/
  foodMult) ekonomiye bağlı. Barbar akını + kahraman olayı M4'te (ordu şart).
- **AI krallıklar + diplomasi** (`core/kingdoms.ts` + `data/personalities.ts`):
  8 kişilik, kendi kendine büyüme/genişleme, elçiler, ilişki/itibar/güç,
  hediye-ticaret-ittifak-ateşkes-haraç-casus-savaş eylemleri (hepsi komutla),
  sinsi ihaneti, AI'ların birbiriyle savaşı, krallık yıkımı.
- **Sis (keşif):** 0/1/2 seviyeli görüş; başlangıç vadisi seçimi
  (pickStartRegion) + yumuşak açılış; bina/köylü görüş yarıçapı; görülmemiş
  karo çizilmez, keşfedilmiş loş çizilir; minimap sis + krallık toprakları.
- **KAYIT — "kaldığın yerden devam" ✔:** Sim tam serialize/restore (RNG durumu
  dahil), sürümlü format; localStorage otomatik kayıt (20sn aralık + arka
  plana geçişte + önemli eylemde); açılışta **▶ Devam Et**. Tarayıcı testi:
  yenile → devam → aynı tohum/durum.
- **Render:** sis örtüsü, krallık toprağı tonu + başkent işareti (yer tutucu),
  yanan bina alev/duman animasyonu; aktif etki çubuğu (HUD).
- **Testler: 47/47 yeşil** — kritik: `serialize → restore → devam ==
  kesintisiz devam (birebir)` determinizm kanıtı.
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

## 🔜 Sıradaki adım (M5 — kalan prototip paritesi, sonra Faz 1)
Çekirdek oynanış tamam. Prototipten henüz taşınmayan "atmosfer" parçaları:
1. Ses motoru (Web Audio sentez — efekt + uyarlanabilir müzik).
2. Gündüz/gece döngüsü + mevsim renk tonu (render).
3. Yaban hayatı (hayvanlar + iskelet animasyonu) — Faz 2 ile birleşebilir.
4. Öğretici (adım adım hedefler) + ayarlar paneli.
5. Ticaret kervanları (görünür, yağmalanabilir) — market teknolojisiyle bağ.
6. Kayıt slotları + dosya dışa/içe aktarma.
Bunlar bitince **Faz 1: İnşa süreleri + üretim zincirleri** (docs/03) başlar.
- Not: Görseller (karo + bina + köylü + ordu) bilinçli yer tutucu — **gerçek
  dokular Faz 2'de her öğe için ayrı ayrı üretilecek** (kullanıcının açık talebi).
- Not: WebGL atlas motoru henüz taşınmadı; Canvas2D sprite yolu 60 fps veriyor,
  sprite sayısı artınca geçilecek.
- Not: Kayıt şimdilik tek slot (localStorage). Slotlar + IndexedDB + çevrimdışı
  ilerleme Faz 3'te (docs/10-KAYIT).

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
- **2026-07-26 (2d):** Faz 0 M4 bitti — askeri sistem (birimler, ordular,
  savaş, barbar/AI saldırıları), komutanlar, 16'lı teknoloji ağacı (tüm
  çarpanlar bağlı), zafer/yenilgi + son ekran. Restore referans hatası
  bulunup düzeltildi. 66 test yeşil; tarayıcıda eğitim→saldırı akışı doğrulandı.
- **2026-07-26 (2c):** Faz 0 M3 bitti — olaylar/felaketler, AI krallıklar +
  tam diplomasi, sis, otomatik kayıt + Devam Et. 47 test yeşil; tarayıcıda
  yenile→devam doğrulandı. Kullanıcının "her açtığında hatırlasın" isteği
  çalışır durumda (MVP).
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
