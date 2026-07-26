# 03 — Ekonomi & İnşa

> Senin özellikle istediğin **"bir yer kurunca süre olmalı"** bu dokümanın
> merkezinde.

## Kaynaklar
**Temel (prototipte var):** 🍞 yiyecek, 🪵 odun, 🪨 taş, 🪙 altın, 📜 bilgi.
**Eklenecek (üretim zincirleri için):**
- Hammadde: tahıl, kütük, cevher (demir), yün/deri, balık, av eti.
- İşlenmiş: un→ekmek, kereste, alet/silah, kumaş, tuğla, kömür.
- Lüks/prestij: baharat, mücevher, şarap (mutluluk & ticaret).

Her kaynağın: depo limiti, üretim/tüketim hızı, ticaret değeri, bozulma
(gıda) özelliği var.

## Üretim zincirleri (derinlik)
Tek adımlı üretim yerine zincir:
```
Tarla(tahıl) → Değirmen(un) → Fırın(ekmek) → nüfus tüketir
Orman(kütük) → Bıçkıhane(kereste) → inşaat & gelişmiş binalar
Maden(cevher) → İzabe/Demirci(alet, silah) → asker & üretim verimi
Otlak(yün) → Dokumacı(kumaş) → mutluluk & ticaret
```
- Zincirin bir halkası durursa alt üretim yavaşlar → oyuncu lojistik düşünür.
- **Basit başlangıç:** ilk çağda tek adımlı; çağ atladıkça zincir uzar (öğrenme
  eğrisi yumuşak).

## İnşa sistemi (BUILD TIMERS) — çekirdek yenilik
Prototipte binalar anında dikiliyor. Yeni sistem:

### Akış
1. Oyuncu binayı seçer → geçerli bir kareye **hayalet (ghost)** olarak yerleştirir
   (yeşil = geçerli, kırmızı = geçersiz; biyom/komşuluk kuralı prototipte var).
2. **Kur** → kaynak anında düşer, bina **"inşa halinde"** durumuna geçer.
3. Bir **inşa süresi** başlar (saniye). Süre boyunca:
   - Bina görseli **aşamalı yükselir** (iskele → yarım → tam, bkz. 02).
   - İşçiler binaya gelir, çalışır (animasyon).
   - Üstünde **ilerleme çubuğu + kalan süre** gösterilir.
4. Süre bitince bina **aktif** olur; üretim/işlev başlar; bildirim + ses.

### Süreyi belirleyen faktörler
```
sure = temel_sure(bina, seviye)
     ÷ atanan_inşaatçı_sayısı
     × mevsim/olay çarpanı
     × teknoloji indirimi (masonry vb.)
```
- **İnşaatçı ataması:** boştaki köylüler inşaata koşar; ne kadar çok işçi, o kadar
  hızlı (mantıklı bir üst sınıra kadar).
- **Hızlandırma (speedup):** opsiyonel bir kaynak/öğe ile süreyi kısaltma
  (Rise of Kingdoms hissi; prototipin React versiyonunda "speedups" fikri vardı).
- **İnşa kuyruğu:** Köy Meydanı seviyesine göre aynı anda kaç inşaat yürüyebilir
  (örn. seviye başına +1 kuyruk).
- **İptal:** inşa halindeyken iptal → kaynağın bir kısmı iade.

### Yükseltme (upgrade) de süreli
- Tüm binalar seviye atlar (prototipte sadece meydan atlıyordu — genişletilecek).
- Yükseltme sırasında bina çalışmaya devam eder ama süre bitene kadar yeni
  seviye bonusu gelmez. Üstünde yine süre çubuğu.

## Bina kataloğu (genişletilmiş)
Prototip 11 bina ile başlıyor; hedef ~30+. Kategoriler:

| Kategori | Binalar |
|----------|---------|
| Merkez | Köy Meydanı (çağ/kuyruk/sınır belirler) |
| Nüfus | Ev, Konak, Han (göçmen çeker) |
| Gıda | Tarla, Değirmen, Fırın, Avcı Kulübesi, Balıkçı, Otlak, Ahır |
| Malzeme | Oduncu, Bıçkıhane, Taş Ocağı, Maden, İzabe, Tuğla Fırını, Kömürcü |
| Üretim | Demirci, Marangoz, Dokumacı, Atölye |
| Depo | Ambar (kaynağa özel silolar dahil), Soğuk depo |
| Kültür | Akademi, Tapınak/Kilise, Kütüphane, Tiyatro (mutluluk) |
| Ticaret | Pazar, Liman, Kervansaray |
| Askeri | Kışla, Okçu Talimhanesi, Ahır(süvari), Kuşatma Atölyesi, Sur, Kule, Kapı |
| Harika | Çağ başına 1 anıt (kalıcı güçlü bonus, uzun inşa) |
| Altyapı | Yol, Köprü, Kuyu, Kanal |

Her bina veri dosyasında: maliyet, inşa süresi, ayak izi, işçi sayısı, üretim,
girdi/çıktı, kurulum koşulu (biyom/komşuluk), seviye eğrisi, önkoşul teknoloji.

## İşçi & meslek sistemi
- Nüfus = boştaki + atanmış. Boştakiler inşaata/söndürmeye/askere gider.
- Her üretim binası işçi ister; işçi başına üretim (prototipte var).
- **Meslek uzmanlaşması (ileri):** köylü bir işte çalıştıkça beceri kazanır →
  o işte daha verimli (bkz. 04-NUFUS).
- İşçi atama arayüzü: bina paneli + / − ; "otomatik dengele" seçeneği.

## Depolama & lojistik
- **Depo limiti:** her kaynağın tavanı var (prototipte tek genel limit; kaynağa
  özel silolara evrilecek). Tavana ulaşınca üretim boşa gitmesin diye uyarı.
- **Bozulma:** gıda zamanla azalır → soğuk depo/ambar teknolojisi gerekli.
- **Yollar:** yol üzerindeki taşıma daha hızlı → uzak madenler yol ister (ileri).
- **Dağıtım:** üretilen mal ambara taşınır; taşıyıcı köylüler görünür (juice).

## Mutlulukla bağ
Üretim mutluluğa bağlı (prototipte var): mutsuz halk daha az üretir. Lüks mallar,
tapınak, düşük vergi mutluluğu artırır (bkz. 04).

## Çevrimdışı ilerleme
Oyun kapalıyken geçen sürenin bir kısmı üretime işler (sınırlı, örn. en fazla
X saat), açılışta "yokken şunlar oldu" özeti (bkz. 10-KAYIT).

## Denge & test
- Her üretim/tüketim değeri veri dosyasında → headless sim ile test:
  "20 dk oynatınca ekonomi çökmüyor / patlamıyor mu?"
- Başlangıç ekonomisi cömert (öğrenme), ilerledikçe kıtlık baskısı artar.
