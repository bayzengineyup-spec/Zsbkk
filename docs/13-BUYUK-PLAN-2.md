# BÜYÜK PLAN 2 — "Gerçek Oyun" Yolculuğu (Aşama 3 → 15)

> **Çıkış noktası:** Kullanıcı oyunu test etti. **Puan: 2/10.**
> "Daha yeni 2. temel aşamasını bitirdik; gerçek oyun için 10-15. aşamaya
> ulaşmak lazım." Bu plan o yolculuğun haritasıdır.
> Önceki plan (docs/00..12) TEMEL'i kurdu; bu plan OYUNU kuracak.

---

## 0) Kullanıcı Geri Bildirimi — Madde Madde (BAĞLAYICI)

| # | Geri bildirim | Planda karşılığı |
|---|---|---|
| G1 | Mevcut tüm sistemler **5 kat** geliştirilecek | Aşama 10 (+her aşamada dokunduğu sistemi derinleştirme kuralı) |
| G2 | Mantık ve AI **20 kat** gelişmiş olacak | Aşama 6 + 7 (iki tam aşama sadece AI) |
| G3 | Grafikler hâlâ **çocuksu** — grafik + hava/atmosfer | Aşama 8 + 9 (ışık, hava durumu, yüksek çözünürlük, renk dili) |
| G4 | Yeni şeyler eklenecek | Aşama 10 + 11 (içerik patlaması) |
| G5 | Animasyon geliştirme | Aşama 9 (animasyon durum makineleri, savaş koreografisi) |
| G6 | Dünya boyutu SEÇİLMEYECEK — **sınırsız otomatik dünya**; sise yaklaşan onu otomatik açar | Aşama 5 (chunk tabanlı sonsuz dünya) |
| G7 | Oluşturma (inşa) süreleri biraz daha uzun | Aşama 3 (denge botuyla yeniden ayar) |
| G8 | Tutorial olacak ama **atlanabilir** | Aşama 3 |
| G9 | Başlangıçta orta büyüklükte alan **sissiz** | Aşama 3 |
| G10 | Arayüz **çok karışık ve kaba** — harita görünmüyor, her yer kaplı | Aşama 3 (arayüz büyük sadeleştirme — İLK İŞ) |
| G11 | Sesler **berbat (-100/10)** — her eylem için AYRI, GERÇEKçi orta çağ sesi (çekiç, odun…) | Aşama 4 (ses devrimi — sentez terk ediliyor) |
| G12 | Oyun başında **nedensiz mesaj yağmuru** — gerçek olay yokken mesaj gelmesin | Aşama 3 (olay sistemi nedene bağlanır + olay günlüğü) |

**Kalıcı ilkeler (değişmez):**
- Determinizm + komut deseni korunur (çok oyunculu hedefi canlı).
- Her aşama: testli, tarayıcıda doğrulanmış, push edilmiş, DURUM.md güncel.
- Her aşama sonunda oynanabilir tek dosya çıkar → kullanıcı test eder,
  puanlar; geri bildirim bir sonraki aşamanın başına işlenir.

---

## 1) Benim Analizim — Kullanıcının Dediklerine Ek Bulgular

Oyunu ve kodu kendi gözümle de denetledim; şunlar da düzeltilmeli/eklenmeli:

**Şu an bozuk/eksik hissettirenler**
- A1. Toast sistemi TEK iletişim kanalı — kritik uyarı ile önemsiz bilgi
  aynı yerde akıyor (G12'nin kökü). Kalıcı **olay günlüğü** şart.
- A2. Kaynak çubuğu 12 kalem birden gösteriyor (G10'un kökü) —
  oyuncunun o an ihtiyacı olmayan bilgi ekranı işgal ediyor.
- A3. Köylüler "dolaşan kuklalar": iş yerine gidiyor görünüyor ama taşıma,
  ev, uyku, ihtiyaç yok. Canlılık hissi yüzeysel (G2'nin kökü).
- A4. AI krallıklar haritada TEK karo başkent — "krallık" hissi yok.
  Genişlemeleri renk lekesi; köyleri, binaları, tarlaları yok (G2).
- A5. Yol bulma yok — herkes kuş uçuşu yürüyor, engel tanımıyor.
- A6. Hava durumu yok; mevsim sadece renk filtresi. Atmosfer eksik (G3).
- A7. Işık yok: gece sadece mavi perde. Pencere/meşale ışık havuzu,
  gölge yönü yok (G3).
- A8. Savaşta ok/mızrak uçmuyor, süvari şarj etmiyor — çarpışma sahnesi
  statik figüran (G5).
- A9. Ekonomide para/pazar yok: altın sadece birikiyor; ticaret pasif.
- A10. Zafer tek örnek: fetih pratikte tek gerçekçi yol; refah/diplomasi
  koşulları silik.
- A11. Ses: müzik dahil her şey tek osilatör sentezi — G11 haklı.
- A12. Erişilebilirlik yok: renk körlüğü, yazı boyutu, titreşim ayarı.
- A13. Zorluk seçimi yok (rahat/normal/zor) — herkes aynı baskıda.
- A14. Sprite üretimi açılışta ~yüzlerce canvas — sonsuz dünya + 4x
  çözünürlükte açılış süresi patlar → **atlas önbelleği (IndexedDB)** gerek.
- A15. Kayıt formatı sürüm migrasyonu "eski sürümü reddet" — Aşama 5'te
  gerçek migrasyon zinciri gerekecek (oyuncu ilerlemesi kaybolmamalı).

---

## 2) AŞAMA HARİTASI (3 → 15)

Numara kullanıcının ölçeğiyle hizalı: "şu an 2. aşamadayız."

### AŞAMA 3 — BÜYÜK TEMİZLİK (kullanıcının canını sıkan her şey) ⬅ SIRADAKİ
Amaç: aynı motor, bambaşka his. Puanı 2'den yukarı çeken en ucuz kazanımlar.
- **M3.1 Arayüz sadeleştirme (G10):**
  - Kaynak çubuğu: yalnız 4 ana kaynak + nüfus; dokununca açılan detay.
  - Minimap varsayılan KÜÇÜK/kapalı; tek dokunuşla açılır.
  - Alt şerit yarı saydam ve daha ince; paneller alt sayfa (bottom-sheet),
    haritayı asla tamamen örtmez; açıkken harita karartılmaz.
  - Bildirim yağmuru yerine sağ üstte TEK rozetli 📜 günlük simgesi.
  - Hedef: normal oyunda ekranın ≥%80'i HARİTA.
- **M3.2 Olay sistemi nedene bağlanır (G12 + A1):**
  - "Nedensiz olay" kavramı silinir. Her olayın görünür/simüle nedeni olur:
    yangın → yıldırım (fırtınada) veya baskın; veba → kalabalık + kirli su
    (kuyu yoksa); göç → yüksek mutluluk ÜNÜ duyulunca; kervan → anlaşma.
  - İlk 5 dakika: yalnız oyuncunun kendi eylemlerinin sonuçları konuşur.
  - Olay GÜNLÜĞÜ paneli: tüm geçmiş, simge + zaman + neden açıklaması.
  - Toast yalnız: saldırı, açlık, zafer/yenilgi gibi ACİL şeyler.
- **M3.3 Başlangıç deneyimi (G8, G9, G7):**
  - Açılışta orta büyüklükte sissiz bölge (yarıçap ~40, vadi tamamı).
  - Tutorial: "Atla" düğmesi + istenirse menüden geri açma; hedefler tek
    satırlık çip olarak, kutu değil.
  - İnşa süreleri +%50-75 (denge botu yeniden koşulur, eğri korunur).
- **M3.4 Zorluk seçimi (A13):** Rahat / Normal / Zor (felaket sıklığı,
  AI saldırganlığı, başlangıç kaynağı).
- Çıktı: oynanabilir sürüm v2 → kullanıcı puanlar.

### AŞAMA 4 — SES DEVRİMİ (G11)
Amaç: -100/10 → gerçek orta çağ ses dünyası. Sentez çöpe.
- **M4.1 Ses varlık hattı:** CC0/kendi ürettiğimiz örnek paket (Web Audio
  ile oynatılan gerçek kayıt dokulu örnekler); her eylem AYRI ses:
  çekiç+testere (inşa, bina türüne göre varyant), balta+devrilen ağaç
  (oduncu), taş kırma, ekmek fırını, pazar uğultusu, kılıç/kalkan/ok
  (savaş türüne göre), boru+davul (ordu), yazı/parşömen (panel), ahşap
  tık (düğme), madeni para…
- **M4.2 Ambiyans katmanları:** gündüz kuş+rüzgâr, gece cırcır+baykuş,
  köy yaklaşınca çekiç/insan uğultusu, savaşta uzak davul; yumuşak geçiş.
- **M4.3 Konumsal ses:** kameraya yakın olaylar yüksek, uzak kısık/pan.
- **M4.4 Müzik 2.0:** gerçek enstrüman dokulu orta çağ temaları (huzur,
  gerginlik, savaş, zafer) — katmanlı geçiş.
- Boyut bütçesi: ≤ 3-4 MB (PWA önbelleğine girer; tek dosya sürüm için
  ayrı hafif paket).

### AŞAMA 5 — SONSUZ DÜNYA (G6)
Amaç: boyut seçimi yok; dünya keşfettikçe kendini üretir.
- **M5.1 Chunk mimarisi:** 32×32'lik parçalar; konumdan deterministik
  üretim (tohum+koordinat hash — ziyaret sırasından bağımsız, replay uyumlu).
  Seyrek depolama (Map), yalnız dokunulan chunk kaydedilir. SAVE v5 +
  **migrasyon zinciri** (A15: eski kayıtlar sınırlı dünya olarak yaşamaya
  devam eder).
- **M5.2 Sis 2.0:** sise yaklaşan HER birim (köylü/asker/kervan) otomatik
  açar (G6); açılmış alan sınırsız büyür; minimap "yakın bölge" gösterir,
  uzaklaşınca kaydırılabilir dünya haritası.
- **M5.3 Dinamik krallıklar:** keşfedilen uzak bölgelerde deterministik
  krallık/harabe/nötr köy doğar — dünya hep "ileride bir şey var" hissi verir.
- **M5.4 Performans:** chunk yükleme/boşaltma, TerrainCache uyumu,
  sprite atlas önbelleği IndexedDB'de (A14), hedef: orta cihazda 60 fps.

### AŞAMA 6 — YAŞAYAN KÖY (G2 · AI 20x, bölüm 1)
Amaç: köylü "kukla" değil KİŞİ.
- **M6.1 Yol bulma (A5):** A* + yol ağı; çok yürünen güzergâh patikaya,
  sonra taş yola dönüşür (görsel + hız bonusu).
- **M6.2 Köylü rutini:** ev sahibi olma, sabah işe gitme, öğle molası,
  akşam eve dönüş, gece uyku (pencere ışıkları gerçek veriyle yanar);
  taşıma görselleştirme: omuzda çuval/odun, depoya taşıma.
- **M6.3 İhtiyaçlar:** açlık/yorgunluk/mutluluk kişi bazında; ihtiyacı
  karşılanmayan köylü yavaşlar, söylenir (günlüğe düşer), göç edebilir.
- **M6.4 İsim+portre+geçmişi olan köylüler:** dokununca mini kart.
- Determinizm: tüm rutinler sim tick'inde, tohumlu.

### AŞAMA 7 — YAŞAYAN KRALLIKLAR (G2 · AI 20x, bölüm 2)
Amaç: rakipler renk lekesi değil GERÇEK komşu.
- **M7.1 AI köyleri haritada gerçek binalarla:** merkez+evler+tarlalar
  görünür; büyüdükçe yeni bina dikerler (A4).
- **M7.2 AI ekonomisi:** bizimkiyle aynı kurallarla üretir/tüketir;
  kıtlıkta zayıflar, bolluktaki komşu ordu besler (hissedilir stratejik doku).
- **M7.3 Amaç güdümlü kişilikler:** fatih "hedef seçer, ordu yığar,
  ultimatom verir"; tüccar ticaret ağı örer; sinsi casus atar, ittifak bozar.
  Elçi birimi haritada gerçekten yürür (mesajlar artık NEDENLİ — G12).
- **M7.4 AI-AI ilişkileri görünür:** savaşları, ittifakları, ticaret
  yolları haritada; oyuncu bunları casusla/keşifle öğrenir.
- **M7.5 Denge botu 2.0:** yeni AI'a karşı eğri yeniden ölçülür.

### AŞAMA 8 — ATMOSFER & IŞIK (G3, bölüm 1)
Amaç: "çocuksu" hissin kökü düz renk + ışıksızlık; burada kırılır.
- **M8.1 Işık katmanı:** güneş yönü + gün saatiyle dönen bina/ağaç
  gölgeleri; gece pencere/meşale/ocak ışık havuzları; şafak/akşam sıcak
  yıkama (A7).
- **M8.2 Hava durumu (A6):** deterministik hava sim'i — yağmur, sağanak,
  kar, sis bankları, fırtına (yıldırım → M3.2'deki yangın nedeni!);
  ekin/hareket/etki bağlantıları.
- **M8.3 Renk dili yeniden:** doygunluk kısılır, zengin toprak paleti,
  film greni + vinyet (çok hafif), mevsim paletleri gerçekten farklı.
- **M8.4 Su 2.0:** kıyı köpüğü, dalga animasyonu, yansıyan gökyüzü rengi.
- Gerekirse WebGL karar noktası burada (Canvas2D yetmezse).

### AŞAMA 9 — SPRITE 3.0 + ANİMASYON (G3+G5, bölüm 2)
- **M9.1 Yüksek çözünürlük bake (3-4x) + atlas:** yakınlaşınca keskin.
- **M9.2 Animasyon durum makineleri:** köylü (yürü/taşı/kes/ek/uyu),
  asker (yürü/koş/savaş/ölüm), hayvan (otla/koş/av); kare tabanlı
  prosedürel iskelet.
- **M9.3 Savaş koreografisi (A8):** ok yağmuru yay çizer, mızrak hattı
  itişir, süvari kanattan şarj eder, kaçanlar döner; kayıplar tek tek düşer.
- **M9.4 Bina yaşam animasyonları:** inşaatta çekiç sallayan işçi,
  demirci örsü kıvılcımı, fırın közü, tarla büyüme evreleri.

### AŞAMA 10 — SİSTEM DERİNLİĞİ 5x (G1+G4)
- **M10.1 Ekonomi 2.0 (A9):** pazar + dinamik fiyat, kervanla al-sat,
  vergi/kira, işsizlik/mutluluk döngüsü.
- **M10.2 30+ bina:** kuyu (veba önler → M3.2), demirci, tapınak, liman
  + balıkçı tekneleri, han, çeşme, heykel/anıt (prestij)…
- **M10.3 Çağ sistemi + 40+ teknoloji:** Karanlık → Feodal → Kale çağı;
  çağ atlama koşulları, çağa özel bina/birim görselleri.
- **M10.4 Komutan RPG:** ekipman, özellik ağacı, sadakat, esir takası.
- **M10.5 Zafer 2.0 (A10):** gerçek refah/diplomasi/mucize zaferleri;
  puan dökümü ve oyun sonu haritası.

### AŞAMA 11 — DÜNYA İÇERİĞİ (G4)
- Harabeler/hazineler/kayıp teknolojiler (sonsuz dünyada keşif ödülü).
- Nötr köyler: koru/haraç al/fethet seçimleri.
- NEDENLİ olay zincirleri: "kuraklık → kıtlık → göç dalgası" gibi çok
  adımlı, oyuncu kararlı hikâyecikler (G12 ile uyumlu: hepsi simüle).
- Patron barbar kampları: haritada görünür, temizlenmezse büyür.

### AŞAMA 12 — SAVAŞ 2.0
- Formasyonlar (hat/kama/çember), moral + bozgun kaçışı.
- Kuşatma makineleri çeşitliliği (mancınık kule yıkar, kule ok üstünlüğü).
- Kale savunma yerleşimi: sur hattı çizme, kapı, kule yerleşimi; savunma
  savaşını köyünde adım adım izleme.

### AŞAMA 13 — CİLA + PERFORMANS + ERİŞİLEBİLİRLİK
- Cihaz matrisi (düşük RAM telefon dahil), pil dostu mod.
- Erişilebilirlik (A12): renk körü paleti, yazı boyutu, titreşim ayarı.
- Yerelleştirme altyapısı (TR ana; metinler tek dosyada).
- Kayıt bulutu için hazırlık (dışa aktarım otomasyonu).

### AŞAMA 14 — ÇOK OYUNCULU ALFA
- Replay altyapısı (hazır ✓) üstüne gerçek ağ: oda kur/katıl, lockstep
  senkron, kopukluk toparlama, gözlemci modu (= tekrar izleyici).

### AŞAMA 15 — YAYIN
- Mağaza paketleri (PWA + TWA/Android), telemetri (opsiyonel, anonim),
  canlı denge güncellemeleri, sürüm notları.

---

## 3) Çalışma Düzeni

1. Sıra: 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15.
   (3-4-5 kullanıcının en acı puan verdiği yerler; önce onlar.)
2. Her aşama sonunda: testler + duman testi + denge botu + **oynanabilir
   tek dosya** → kullanıcı puanı alınır, plan gerekirse revize edilir.
3. Her aşamada dokunulan eski sistem "5x kuralı"yla derinleştirilir
   (G1 tek seferlik değil, sürekli ilke).
4. DURUM.md her oturumun canlı hafızası olmaya devam eder.

## 4) Başarı Ölçütleri (kullanıcı puanıyla)

| Kilometre taşı | Hedef puan |
|---|---|
| Aşama 3-4 sonu (temizlik+ses) | 4/10 |
| Aşama 5-7 sonu (sonsuz dünya + AI) | 6/10 |
| Aşama 8-9 sonu (grafik+animasyon) | 7.5/10 |
| Aşama 10-12 sonu (derinlik+savaş) | 9/10 |
| Aşama 13-15 (cila+MP+yayın) | 10/10 · "gerçek oyun" |
