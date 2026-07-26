# DURUM — Nerede Kaldık?

> Bu dosya oyunun/geliştirmenin **canlı hafızası**. Her oturum başında okunur,
> her oturum sonunda güncellenir. "Neredeydik, ne yaptık, sırada ne var?"

## 📍 Şu an
- **Aşama:** **FAZ 1 · M1 tamamlandı — İNŞA SÜRELERİ ÇALIŞIYOR** (kullanıcının
  özel isteği ✔). Sırada Faz 1 · M2: üretim zincirleri (un→ekmek, kereste).
- **Sürüm:** v0.7-M1 · referans: `prototype/kralliklar-cagi-v0.5.html`.
- **Son güncelleme:** 2026-07-26 (2. oturum).
- **Bilinçli ertelenenler:** WebGL atlas (Canvas2D 60 fps veriyor; sprite
  sayısı artınca), iskelet animasyonları + gerçek dokular (Faz 2), kayıt
  slotları/IndexedDB/çevrimdışı ilerleme (Faz 3).

## ✅ Tamamlanan
### FAZ 1 · M1 — İnşa Süreleri (2. oturum, devam)
- **"Bir yer kurunca süre olmalı" ✔** Kur → kaynak düşer → ŞANTİYE:
  bina zeminden yükselir (clip), iskele direkleri, ilerleme çubuğu, kalan
  süre. Boşta köylüler şantiyeye koşar ve hızlandırır (işçi başına +%50,
  en çok 3 → 2.5x). Bitince "tamamlandı" + işlev açılır.
- **İnşa halindeki bina İŞLEVSİZ:** üretim yok, kapasite yok, işçi atanamaz;
  merkez tamamlanana dek krallık "kurulmamış" (hasCenter false).
- **İnşaat kuyruğu sınırı:** eşzamanlı inşaat = merkez seviyesi + 1
  (meydan yükseltmek kuyruk açar). Merkez muaf.
- **İptal:** şantiye iptalinde maliyetin %70'i iade.
- **TÜM binalara süreli yükseltme:** merkez kendi tablosu (süre eklendi);
  diğerleri formül (maliyet ×sv×1.5, süre ×(1+0.6(sv−1))). Yükseltme
  sırasında bina ESKİ seviyede çalışmaya devam eder; ev +3 kapasite/sv,
  ambar depo ×sv, üretim ×sv (mevcut çarpan).
- **Asker eğitimi SÜRELİ kuyruk:** kışla başına 5'lik kuyruk (mızrakçı 8sn /
  okçu 10sn / süvari 14sn; kışla sv2 %25 hızlı). Köylü kuyruğa girince
  ayrılır, süre bitince asker olur. Kışla yıkılırsa kuyruktakiler geri döner.
- **UI:** şantiye paneli (ilerleme/işçi/iptal), her binada ⬆ yükselt
  (maliyet+süre), kışla kuyruğu görünümü, inşa kartlarında ⏳süre.
- **Testler: 81/81** — 9 yeni Faz 1 testi (işçi hızlandırma kanıtı, kuyruk
  sınırı, iade, işlevsizlik, yükseltme etkileri, **şantiye+kuyruk ortasında
  kayıt roundtrip determinizmi**). Eski testler süreli inşaya uyarlandı
  (test yardımcıları: completeAll/trainMany).
### Faz 0 · M5 — Atmosfer & Parite (2. oturum, devam)
- **Yaban hayatı** (`core/wildlife.ts` + `data/species.ts`): 7 tür (geyik,
  kurt sürüsü, ayı, domuz, tavşan + koyun/inek), biyoma göre dağılım,
  dolaşma/kaçma/yırtıcı yaklaşması, tarla çevresinde çiftlik hayvanları.
  **Bilinçli sapma:** prototipteki kamera-LOD'u determinizmi bozacağı için
  kaldırıldı — tüm hayvanlar simüle ediliyor (≤140, ucuz).
- **Ticaret kervanları** (`core/caravans.ts`): anlaşmalı krallıktan altın
  taşır, savaştaki toprakta yağmalanabilir; haritada araba+flama görseli.
- **Gündüz/gece** (`render/daynight.ts`): 4 dk'lık gün, şafak/akşam turuncusu,
  gece mavisi; mevsim renk tonu; HUD'da vakit etiketi.
- **Ses motoru** (`ui/sound.ts`): tamamen sentez (dosyasız) — 17 efekt +
  ruh haline göre üretken müzik (barış/gece/savaş gamları, savaşta davul);
  ses ayarları kalıcı.
- **Öğretici** (`ui/tutorial.ts`): 9 adımlı hedef sistemi, ilerleme kayda
  yazılıyor (kaldığın adımdan devam).
- **Menü paneli:** ses aç/kapa + müzik/efekt sesi, kayıt dışa/içe aktarma
  (JSON dosyası), yeni oyun.
- **Testler: 71/71 yeşil** — yaban hayatı + kervan dahil kayıt roundtrip
  determinizmi.
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

## 🔜 Sıradaki adım — FAZ 1 · M2: Üretim Zincirleri (docs/03)
1. Yeni kaynaklar: tahıl → un → ekmek; kütük → kereste (girdi tüketen binalar).
2. Yeni binalar: Değirmen, Fırın, Bıçkıhane (girdi/çıktı akışı).
3. Kaynağa özel depo uyarıları ("ambar dolu, üretim boşa gidiyor").
4. Denge testi: zincirin bir halkası durunca alt üretim yavaşlamalı.
Sonra Faz 2 (gerçek dokular — her öğe için ayrı) veya Faz 3 (kayıt
genişletme, çevrimdışı ilerleme).
- Not: Görseller (karo + bina + köylü + ordu + hayvan) bilinçli yer tutucu —
  **gerçek dokular Faz 2'de her öğe için ayrı ayrı üretilecek** (kullanıcının
  açık talebi).

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
- **2026-07-26 (2f):** FAZ 1 M1 — İNŞA SÜRELERİ: şantiye (yükselen bina +
  iskele + ilerleme çubuğu), işçi hızlandırma, kuyruk sınırı, %70 iade,
  tüm binalara süreli yükseltme, süreli asker eğitim kuyruğu. 81 test
  (şantiye ortasında kayıt determinizmi dahil).
- **2026-07-26 (2e):** 🎉 FAZ 0 KAPANDI — M5: yaban hayatı, kervanlar,
  gündüz/gece, sentez ses motoru + üretken müzik, 9 adımlı öğretici, menü
  (ses/dışa-içe aktar). 71 test yeşil. Prototip paritesi (görseller hariç,
  bilinçli) tamam.
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
