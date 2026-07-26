# DURUM — Nerede Kaldık?

> Bu dosya oyunun/geliştirmenin **canlı hafızası**. Her oturum başında okunur,
> her oturum sonunda güncellenir. "Neredeydik, ne yaptık, sırada ne var?"

## 📍 Şu an
- **Aşama:** **FAZ 2 · M2 TAMAMLANDI** — görsel yenileme tüm dünya
  nesnelerine yayıldı: hayvanlar/askerler/kervanlar/AI başkentleri v2 +
  canlı ayrıntılar (baca dumanı, dönen değirmen kanadı, dalgalanan
  bayraklar). Arazi kesintisiz zemin + biyom kenarı yumuşatma ile
  kullanıcının "blok blok" şikâyeti giderildi.
  **M3 de tamam:** dünya uzayında sürekli ton yamaları (karo sınırı
  tanımaz), 8 kaynak için el çizimi mini ikonlar, iş başındaki köylülerde
  alet sallama animasyonu (balta/kazma/çapa).
  **Performans turu da tamam:** arazi ön-belleği (TerrainCache) ile karo
  başına 3-4 çizim → karede tek drawImage; sis tek yol+2 doldurma.
  Yazılım render'ında bile 60 fps'e kilitlendi (42-48'den).
  **FAZ 3 · M1 TAMAM** (IndexedDB + 3 slot + çevrimdışı ilerleme).
  **FAZ 4 · M1 TAMAM** (savaş derinliği): kısmi ordu gönderimi, taktik
  duruşlar (agresif/dengeli/temkinli+çekilme), geri çağırma, haritada
  ordu seçimi + canlı bilgi kartı. 101 test yeşil.
  **FAZ 4 · M2 de TAMAM:** meydan savaşları artık süreli (4sn) ve haritada
  izleniyor — toz bulutu, çarpışan iki taraf, kıvılcımlar, çift sancak.
  103 test yeşil.
  **PWA TAMAM** (ana ekrana ekle + çevrimdışı açılış, testli).
  **FAZ 4 · M3 de TAMAM:** 🐏 koçbaşı (sur etkisi ×0.5, 🪵80+🪚20) ve
  başarılı baskında binaların ateşe verilmesi (mevcut yangın sistemiyle).
  106 test yeşil.
  Sırada: denge/ilerleme turu, zafer koşulları cilası veya çok oyunculu
  hazırlık (komut kaydı/replay) — kullanıcıya göre.
- **Sürüm:** v0.7 (Faz 2 M2) · referans: `prototype/kralliklar-cagi-v0.5.html`.
- **Son güncelleme:** 2026-07-26 (2. oturum).
- **Bilinçli ertelenenler:** WebGL atlas / chunk bake (Canvas2D ~42-56 fps
  yazılım render'ında; cihazda GPU var), köylü çalışma pozları + kaynak
  ikon çizimleri (Faz 2 M3), kayıt slotları/IndexedDB/çevrimdışı (Faz 3).

## ✅ Tamamlanan
### FAZ 4 · M3 — Kuşatma & Savunma (2. oturum)
- **🐏 Koçbaşı:** saldırı başına tek kullanımlık (🪵80 + 🪚20, geri
  gelmez); hedef surlarının savunma katkısını YARIYA indirir. Ordu
  panelinde tam satır düğme + açıklama; kaynak yoksa saldırı reddedilir;
  ordu bilgi kartında 🐏 rozeti. Kayda girer (Army.ram).
- **Baskında yangın:** düşman/barbar baskını köyü ele geçirirse
  yağmacılar giderken BİR binayı kesin, ikincisini %35 şansla ateşe
  verir (mevcut yangın sistemi: yayılma + söndürme komutu devrede;
  surlar taş olduğundan yanmaz). Savunmanın bedeli artık görünür.
- **Testler: 106/106** — koçbaşının savaşı çevirmesi (aynı tohumda
  koçbaşısız yenilgi / koçbaşılı zafer + maliyet düşümü), kaynak yoksa
  reddetme, başarılı baskında yangın çıkması. 60 fps, sıfır hata.
### PWA — Ana Ekrana Ekle + Çevrimdışı (2. oturum)
- **Manifest (`public/manifest.webmanifest`):** ad, standalone görünüm,
  tema renkleri (ahşap koyu), TR dili, oyun kategorisi.
- **İkonlar:** oyunun sanat yönünde üretilmiş taş kale ikonu (mazgal,
  sıcak pencereler, altın-kızıl bayrak, ahşap çerçeve) — 192/512 +
  maskable varyant (`public/icons/`, Chromium canvas ile üretildi).
- **Service worker (`public/sw.js`):** gezinmede ağ-öncelikli (çevrimdışı
  → kabuk), varlıklarda önbellek-öncelikli + arka planda tazeleme
  (Vite hash'li adlarla güvenli); sürümlü önbellek temizliği. Kayıtlar
  IndexedDB'de olduğundan SW'den bağımsız güvende. Kayıt yalnız PROD.
- **iOS metaları:** apple-touch-icon, tam ekran, durum çubuğu.
- **Test:** Playwright — manifest ✓, SW activated ✓, **çevrimdışı
  yeniden yükleme ✓** (boot ekranı açılıyor). 103/103 vitest yeşil.
### FAZ 4 · M2 — Savaş Görselleştirme (2. oturum)
- **Süreli meydan savaşı:** ordu hedefe varınca savaş ANINDA çözülmez —
  `Army.fighting = BATTLE_TIME (4sn)` başlar, süre bitince mevcut savaş
  matematiği aynen çalışır. "⚔️ Ordun X önünde savaşa tutuştu!" bildirimi
  + savaş sesi. Kayda girer (çarpışma ortasında kaydet-yükle roundtrip
  determinizmi testli). Çarpışma sırasında geri çağırma kapalı (çekilmeyi
  taktik belirler).
- **Çarpışma sahnesi (drawBattle):** kabaran toz bulutu, hamle yapan
  kollu-bacaklı iki taraf (saldıran/savunan renkleri), kısa ömürlü kılıç
  kıvılcımları, iki dalgalanan sancak, "⚔ N" rozeti. Savunan rengi
  hedeften türer (köy=altın, krallık=kendi rengi).
- **Bilgi kartı:** çarpışan orduda "ÇARPIŞIYOR!" durumu, geri çağır gizli.
- **Testler: 103/103** — varışta çözülmeme + ganimetin savaş sonuna
  kalması + çarpışma ortası kayıt determinizmi. Tarayıcıda başkent önünde
  savaş sahnesi doğrulandı; 56 fps, sıfır hata.
### FAZ 4 · M1 — Savaş Derinliği (2. oturum)
- **Kısmi ordu gönderimi:** `attack` komutu artık `comp` (birim seçimi)
  ve `tactic` alır; eldekiyle sınırlanır, sıfır seçim reddedilir. Diplomasi
  "Saldır" → parşömen **Ordu Gönder paneli**: birim başına −/+/hepsi
  düğmeleri, eldeki sayısı, canlı toplam ("Saldır (25)").
- **Taktik duruşlar (TACTICS):** 🔥 Agresif (saldırı +%22, kayıp +%25),
  ⚖️ Dengeli, 🛡️ Temkinli (saldırı -%15, kayıp -%30, bozgunda ordu
  DAĞILMAZ — yarı kayıpla düzenli çekilir, komutan ölmez/esir düşmez,
  sağ kalanlar köye döner). Panelde seçili taktik + açıklaması.
- **Geri çağırma:** `recallArmy` komutu — yürüyen ordu köye döner,
  askerler orduya, komutan görev listesine geri katılır.
- **Haritada ordu kontrolü:** yürüyen orduya dokun → altın kesikli vurgu
  halkası + canlı bilgi kartı (birlik dökümü, hedef, tahmini varış,
  taktik, komutan) + "↩ Geri Çağır" düğmesi; kart orduyla birlikte
  0.25sn'de bir tazelenir, ordu biterse kendini kapatır.
- **Testler: 101/101** — 7 yeni Faz 4 testi (kısmi gönderim, sınırlama,
  geri çağırma+komutan serbestliği, çift çağırma reddi, temkinli çekilme
  vs dengeli bozgun, taktikli determinizm, savaş ortasında JSON kayıt
  roundtrip'i). Tarayıcıda tam akış: diplomasi→panel→temkinli→saldır→
  yürüyüş→geri çağır; 58 fps, sıfır hata.
### FAZ 3 · M1 — IndexedDB + Kayıt Slotları + Çevrimdışı İlerleme (2. oturum)
- **Depolama katmanı (`ui/storage.ts`):** IndexedDB asıl depo (localStorage
  ~5MB sınırı yok), açılışta tüm kayıtlar belleğe alınır → oyun içi okuma
  senkron, yazma asenkron (akış takılmaz). IDB yoksa localStorage yedeğine,
  o da yoksa bellek-içi çalışmaya düşer.
- **3 kayıt slotu (`ui/persist.ts` v2):** `save:0..2` anahtarları, aktif
  slot kavramı; boot ekranında parşömen slot kartları — dolu: "📜 Kayıt 1 ·
  3. yıl · 👥 12 · 3 saat önce · ▶ Devam / 🗑 Sil (onaylı)", boş: "🌍 Yeni
  Dünya". Eski tek-kayıt (localStorage) açılışta boş slota otomatik taşınır.
- **Çevrimdışı ilerleme (`core/offline.ts`):** kayda `savedAt` damgası;
  devam edilince geçen süre kadar KABA üretim: yalnız girdisiz üreticiler,
  işçi×seviye×%50 verim, 8 saat tavan, 2dk altı yok sayılır, depo tavanı
  uygulanır, kısık tüketim, ÖLÜM YOK. RNG kullanmaz → deterministik.
  Rapor bildirimi: "⏰ Sen yokken (3sa): 🍞+540 · halk 448🍞 yedi."
  Uygulandıktan hemen sonra yeni damgayla kaydedilir (çifte ilerleme yok).
- **Düzeltme:** şantiye halindeki meydanla kaydedilen oyun, devam edilince
  yanlışlıkla "meydan kur" moduna düşüyordu — artık meydan binası (şantiye
  dahil) varsa yerleştirme istenmez.
- **Testler: 94/94** — 6 yeni çevrimdışı testi (kısa süre, kazanç raporu,
  8sa tavan+depo tavanı, ölümsüzlük, determinizm, zincir binası üretmez).
  Tarayıcıda: kayıt→yenile→slot kartı "3 saat önce"→Devam→rapor bildirimi
  doğrulandı; IndexedDB yenilemeden sağ çıkıyor. 58 fps, sıfır hata.
### FAZ 2 · Performans Turu — Arazi Ön-Belleği (2. oturum, devam)
- **TerrainCache (`render/scene.ts`):** arazi statik olduğundan
  (taban + biyom kenarı geçişi + detay varyantı + ton yaması) ekran +
  2.5 karoluk kenar payı offscreen tuvale BİR KEZ boyanır; her karede
  tek `drawImage`. Kaydırma kenar payını aşınca veya zoom değişince
  yeniden boyanır (en kötü durum = eski karede-bir-çizim maliyeti).
- **Sis örtüsü toplu doldurma:** karo başına çizim yerine görünmeyen
  (vis0, opak koyu) ve loş (vis1, yarı saydam) elmaslar tek yolda
  toplanıp 2 doldurmayla basılır. Loş karolardaki nesneler eskisi gibi
  yarı saydam çizilir — görsel sonuç birebir aynı.
- **Sonuç:** yazılım render'ında (GPU'suz test ortamı) 42-48 → **60 fps
  (tavan)**; gerçek cihazda daha da rahat. Görsel çıktı değişmedi.
- 88/88 test yeşil, sıfır konsol hatası.
### FAZ 2 · M3 — Boyamsı Zemin + İkonlar + Çalışma Pozları (2. oturum, devam)
- **Büyük ton yamaları (`buildTintMap`):** dünya tohumundan üretilen
  sürekli fbm gürültüsü karo başına -1..1 değer verir; çayır ailesi
  biyomlarda sıcak (saman) / serin (koyu yeşil) çok hafif örtü çizilir.
  Komşu karolar benzer değer aldığı için yamalar KARO SINIRI TANIMAZ —
  kalan karo hissini eritir. Tamamen kozmetik, sim'e girmez.
- **Kaynak ikonları (`buildResourceIcons`):** renkli nokta yerine minik
  el çizimi işaretler — balık, buğday demeti, nal (at), tomruk yığını,
  altın külçeleri, taş yığını, demir cevheri, mermer blok. Gölgeli,
  bake edilmiş, yakınlaşınca görünür.
- **Köylü çalışma pozları:** iş yerinin başında duran köylü aletini
  sallar — oduncu/bıçkıhane baltayla, taş ocağı/maden kazmayla, tarla
  çapayla. Omuzdan dönen kol + alet başı; köylü kimliğinden faz kayması
  (herkes aynı anda sallamaz).
- 88/88 test yeşil; duman testi 48 fps, sıfır hata.
### FAZ 2 · M2 — Dünya Nesneleri v2 + Canlı Ayrıntılar (2. oturum, devam)
- **Kesintisiz zemin (kullanıcı geri bildirimi):** facet degradesi + kenar
  çizgisi kaldırıldı, 12 ince gölge kademesi, biyom paleti uyumlandı,
  detay katmanı karo başına 3 varyanttan hash ile seçiliyor (tekrar
  ızgarası kırıldı), tundraya özel doku, **biyom kenarı yumuşatma**
  (komşu biyomun rengi 4 yönlü degrade+benek katmanıyla kenardan taşar;
  su kenarları bilinçli net). Binalar %28 iri (BUILDING_SCALE).
- **Hayvanlar v2:** iki segmentli eklemli bacaklar (çapraz yürüyüş),
  degrade gövde, boyun+kafa+burun+göz, tür ayrıntıları (geyik boynuzu,
  tavşan kulağı, kurt kuyruğu).
- **Askerler v2:** kollu-bacaklı figürler — miğfer, mızrak, kalkan,
  krallık renkli tunik şeridi; sancak dalgalanır; sayı rozeti korunur.
- **Kervan v2:** tırıs atan çeki atı (yele/kuyruk/koşum), damarlı ahşap
  kasa, kasnaklı krem tente, DÖNEN parmaklıklı tekerlekler, flama.
- **AI başkenti:** bake edilmiş taş burç sprite'ı (mazgal dişleri, kemerli
  kapı, gece ışıklı mazgal; gündüz/gece varyantı) + krallık renkli dalgalı
  bayrak sahnede çizilir (CAPITAL_FLAG direği).
- **Canlı ayrıntılar:** meydan/ev/fırın bacalarından yükselen duman
  parçacıkları (SMOKE_VENTS, sadece aktif binalarda); değirmen kanatları
  sprite'tan çıkarıldı, sahnede DÖNÜYOR (MILL_HUB). Hepsi kozmetik —
  sim'e dokunmaz, determinizm korunur.
- **Duman testi:** köy + ordu yürüyüşü (saldırı komutu) + başkent odağı;
  56 fps, sıfır konsol hatası. 88/88 test yeşil.
### FAZ 2 · M1 — Onaylanan Gerçekçi Stil Motorda (2. oturum, devam)
- **Sanat yönü süreci:** ilk 6 konsept (stil-mockup.html) kullanıcı tarafından
  REDDEDİLDİ (çizgi film gibi, insanlar kolsuz/bacaksız, boyutlar küçük).
  Sıfırdan yüksek ayrıntılı gerçekçi konseptler üretildi
  (**stil-mockup2.html**, ?mood=1..4) → kullanıcı ONAYLADI. Bu stil artık
  bağlayıcı referans.
- **`render/paint.ts` (yeni):** mockup2 tekniklerinin motor yardımcıları —
  taş taş duvar, sıva (leke/çatlak/nem/gren), damarlı kiriş, sıra sıra
  kiremit+yosun+mahya, gündüz/gece pencere, kalas kapı; `painter(seed)` ile
  tamamen deterministik.
- **Karolar v2 (`render/tiles.ts`):** biyom başına zengin doku — çayırda tek
  tek ot yaprakları+çiçek, suda yansıma/derinlik, kayada ışıklı bloklar,
  karda parıltı, bataklıkta su birikintileri; etek katman çizgileri.
- **Ağaçlar (`buildTreeSprites`):** 2 meşe + 1 çam; katmanlı taç, dallı gövde,
  güneş benekleri. Sahnede orman/iğne orman karolarına karo indeksinden
  deterministik dikim (1-2 ağaç, konum/boy/tür sabit hash'ten).
- **Binalar v2 (`render/buildings.ts`):** 14 tip, tip başına özel ressam —
  taş temel + sıvalı ahşap karkas gövde + kiremit çatı + baca/bayrak;
  değirmende kafes kanat, bıçkıhanede testere, fırında büyük baca, kışla/sur
  mazgallı taş. **Gündüz/gece iki sprite seti** (`buildBuildingSprites(night)`)
  — gece pencereleri ışıl ışıl; `dayLight<0.35` eşiğiyle otomatik geçiş.
- **Köylüler artık kollu-bacaklı insan:** yürüyüş makası (bacak+zıt kol
  salınımı), tunik+kemer+eller+saç; isimden deterministik giysi/saç rengi.
  (Kullanıcının "ne kolu var ne ayağı" şikâyeti giderildi.)
- **Arayüz onaylanan stile döndü (`ui/theme.ts` + index.html):** çalışma
  anında üretilen parşömen ve ahşap dokuları CSS değişkeni olarak veriliyor
  (harici dosya yok). Paneller parşömen+mürekkep, üst şerit ahşap kiriş,
  alt şerit **madalyon (yuvarlak metal-ahşap) düğmeler**, serif yazı
  (Georgia), altın ana düğmeler. "Web sitesi butonu" görünümü kaldırıldı.
- **Duman testi:** boot→yeni dünya→meydan+5 bina→inşaat→gündüz→gece→paneller;
  56 fps, sıfır konsol hatası; ekran görüntüleri kullanıcıya gönderildi.
- **Testler: 88/88** (render değişiklikleri sim'e dokunmuyor; tsc temiz).
### FAZ 1 · M2 — Üretim Zincirleri (2. oturum, devam)
- **Yeni kaynaklar:** 🪚 kereste (plank), 🌫 un (flour), 🥖 ekmek (bread).
- **Zincirler:** odun → Bıçkıhane → kereste · yiyecek(tahıl) → Değirmen → un
  → Fırın → ekmek. Girdi tüketen üretim: girdi yetersizse üretim aynı
  oranda kısılır; fırın unu anında tüketip dengede çalışır (testli).
- **Zincir sırası zorunlu:** Değirmen/Fırın maliyeti kereste ister →
  önce Bıçkıhane kurulmalı.
- **Ekmek premium gıda:** tüketimde ÖNCE ekmek yenir (1 ekmek = 2 yiyecek)
  ve halka +6 mutluluk verir → zincire yatırım gerçek fayda sağlar.
- **Depo dolu uyarısı:** üretim boşa gidiyorsa kaynak başına 30 sn'de bir
  bildirim ("Ambar kur/yükselt").
- **UI:** HUD'da kereste+ekmek, bilgi kartında zincir akışı (girdi→çıktı/sn).
- **Testler: 88/88** — girdi tüketimi, kıtlıkta durma/devam, zincir sırası,
  tam zincir ekmek üretimi, ekmek önceliği+mutluluk, depo uyarısı, zincir
  ortasında kayıt roundtrip determinizmi.
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

## 🔜 Sıradaki adım — FAZ 2 · M2 (görsel yenilemenin kalanı)
Onaylanan stil (stil-mockup2) karo/bina/ağaç/köylü + arayüze uygulandı.
Kalanlar, aynı stil ve `paint.ts` yardımcılarıyla:
- Hayvan sprite'ları (7 tür — şu an yer tutucu elips gövde).
- Ordu/asker figürleri (kollu-bacaklı, birim tipine göre teçhizat),
  kervan arabası, AI başkenti (gerçek kale dokusu).
- Animasyon durum makineleri (çalışma/taşıma/savaş duruşları), bina bacası
  dumanı, değirmen kanadı dönüşü gibi canlı ayrıntılar.
- Kaynak işaretleri (renkli nokta yerine minik ikon çizimleri).

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
- **2026-07-26 (2i):** Kullanıcı geri bildirimi düzeltmesi — "arazi blok blok
  görünüyor, konseptteki gibi kesintisiz zemin olmalı; evler biraz büyüsün":
  karo başına facet degradesi ve kenar çizgisi kaldırıldı, gölge 12 ince
  kademeye yumuşatıldı, etek kontrastı düşürüldü, kara biyom renkleri
  uyumlandı (orman artık rengiyle değil ağaçlarıyla ayırt ediliyor),
  detay katmanı tabandan ayrılıp karo başına 3 varyanttan deterministik
  seçilir oldu (tekrar ızgarası kırıldı), tundraya özel seyrek doku,
  binalar %28 büyütüldü (K=1.28). 88 test yeşil, sıfır hata; headless fps
  56→42 (yazılım render'ı; cihazda GPU var — gerekirse Faz 2'de bölge
  önbelleği/chunk bake optimizasyonu yapılacak).
- **2026-07-26 (2h):** FAZ 2 M1 — onaylanan gerçekçi stil motora işlendi:
  paint.ts yardımcıları, v2 karolar+ağaçlar+binalar (gündüz/gece setleri),
  kollu-bacaklı köylüler, parşömen/ahşap/madalyon arayüz (ui/theme.ts).
  56 fps, sıfır hata, 88 test yeşil.
- **2026-07-26 (2g):** Sanat yönü turu: ilk 6 konsept reddedildi (puanlar
  1-3/10); gerçekçi mockup2 üretildi ve ONAYLANDI ("Bunlar baya iyi").
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
