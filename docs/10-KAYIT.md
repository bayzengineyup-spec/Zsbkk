# 10 — Kayıt & Devamlılık

> Senin isteğin: "her açtığımızda unutmasın nerede kaldığımızı." Bu dokümanın
> ana konusu tam olarak bu.

## Hedef deneyim
- Oyunu kapat, günler sonra aç → **her şey aynen kaldığın yerde.** Aynı köy,
  aynı ordular, aynı diplomasi, aynı an.
- Ekstra: yokken geçen sürenin bir kısmı işlemiş olur (çevrimdışı ilerleme) ve
  açılışta kısa bir **"sen yokken şunlar oldu"** özeti çıkar.
- Kaza olsa bile (tarayıcı kapandı, telefon kilitlendi) **otomatik kayıt** sayesinde
  en fazla birkaç saniye kaybolur.

## Kayıt mimarisi
### Ne kaydedilir
Determinist yapı sayesinde iki seçenek var; **hibrit** kullanacağız:
1. **Tohum + parametreler** → dünya haritası yeniden üretilir (küçük).
2. **Değişen durum (delta):** binalar, kaynaklar, nüfus/köylüler, ordular,
   krallıklar & ilişkiler, teknoloji, olaylar, zaman/mevsim, komutanlar,
   tutorial ilerlemesi, ayarlar.
- Böylece kayıt dosyası küçük kalır ama tam sadakatle geri yüklenir.
- **Sürüm numarası** (schema version) her kayıtta → oyun güncellenince eski
  kayıtları **migrasyon** ile yeni formata taşırız (kayıt bozulmaz).

### Nereye kaydedilir
- **IndexedDB** (birincil): büyük veriye uygun, çevrimdışı, hızlı.
- **localStorage** (yedek/küçük meta): son oyun, ayar, "devam et" işareti.
- **Dosya dışa/içe aktar** (JSON): yedek/paylaşım (prototipte var, korunur).
- **Bulut kayıt (ileri):** hesap ile cihazlar arası senkron (çok oyunculu
  altyapısıyla birlikte gelir).

## Otomatik kayıt (autosave)
- Sabit aralıkla (örn. her 15-30 sn) ve **kritik anlarda** (bina bitti, savaş
  sonu, çağ atlama, uygulama arka plana alındığında) sessizce kaydeder.
- `visibilitychange` / `pagehide` olaylarında **anında** kaydet → telefon
  kilitlense bile kayıp yok.
- Birden çok **slot** (otomatik + 3 manuel) — prototipte temel var, genişletilecek.

## "Devam Et" akışı
- Açılış ekranında en üstte büyük **"▶ Devam Et"** düğmesi (son otomatik kayıt).
- Altında: Yeni Oyun, Kayıt Yükle, Ayarlar.
- Devam Et → yükleme ekranı → tam kaldığın an. Kamera son konumda.

## Çevrimdışı ilerleme (idle)
- Kayıtta **gerçek zaman damgası** tutulur (bu, sim dışında; determinizmi bozmaz).
- Açılışta: `geçen_süre = şimdi − son_kayıt`.
- Bu sürenin bir kısmı (tavanlı, örn. en fazla 8-12 saat) **hızlandırılmış
  simülasyon** ile işlenir:
  - Üretim birikir (depo tavanına kadar), inşa/eğitim kuyrukları ilerler,
    nüfus artabilir.
  - Riskli olaylar (savaş/felaket) çevrimdışı **çözülmez** ya da yumuşatılır →
    oyuncu "dönünce her şey yıkılmış" hissine düşmez (adil tasarım).
- Açılışta özet kartı: "+320 odun, 2 bina tamamlandı, 1 göçmen geldi…"

## Determinizm & tekrar-oynatma (replay)
- Komut tabanlı sim → istenirse **komut günlüğü** de saklanır → tüm oyun
  yeniden oynatılabilir (hata ayıklama + ileride izleme/paylaşım).
- Determinizm testi: "kaydet → yükle → 100 tick oynat" iki farklı oturumda aynı
  sonucu vermeli.

## Veri bütünlüğü
- Yaz sırasında çökmeye karşı: **çift tampon** (yeni kaydı yaz, başarılıysa eskiyi
  değiştir) → yarım kayıt asla ana slotu bozmaz.
- Sağlama (checksum) ile bozuk kayıt tespiti → bozuksa bir önceki slota düş.

## Gizlilik & taşınabilirlik
- Her şey yerelde (IndexedDB) → internet olmadan çalışır.
- Dışa aktarılan JSON ile oyuncu kaydını taşıyabilir/yedekleyebilir.

## Kabul ölçütü
- Oyunu ortada kapat → aç → fark edilir hiçbir kayıp yok.
- Uygulama arka plana alınıp geri gelince durum korunuyor.
- Güncelleme sonrası eski kayıt sorunsuz açılıyor (migrasyon çalışıyor).
