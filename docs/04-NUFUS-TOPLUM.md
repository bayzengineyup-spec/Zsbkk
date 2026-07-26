# 04 — Nüfus & Toplum

> Oyunun "ruhu": tek tek görünen, yaşayan köylüler. WorldBox hissi.

## Köylü bireyi
Prototipte köylüler görünür bireyler (isim, konum, meslek, ruh hali, hareket).
Bunu bir yaşam simülasyonuna genişletiyoruz:
- **Kimlik:** deterministik isim + görünüm (isimden türeyen ten/saç/kıyafet).
- **Yaş & yaşam döngüsü:** çocuk → yetişkin → yaşlı; doğum, yaşlanma, ölüm.
- **Meslek & beceri:** çalıştıkça o işte ustalaşır (oduncu, çiftçi, asker, alim…);
  usta işçi daha verimli. Meslek değiştirilebilir.
- **Ruh hali / ihtiyaçlar:** açlık, dinlenme, güvenlik, sosyal, inanç.
- **Özellikler (traits):** çalışkan, korkak, cesur, hastalıklı, zeki… (üretim/
  savaş/olaylara etki, ortaya çıkan hikâye).

## İhtiyaç-tabanlı mutluluk (tek sayıdan zengin modele)
Prototipte tek `happy` var. Genişletme:
```
mutluluk = f(yiyecek bolluğu, konut, güvenlik, lüks/eğlence, inanç, vergi, olaylar)
```
- Karşılanmayan ihtiyaç → mutluluk düşer → üretim düşer → isyan riski (prototipte
  isyan olayı var).
- Lüks mallar (baharat/şarap/mücevher), tapınak, tiyatro, festival mutluluğu artırır.
- **Vergi/refah dengesi (ileri):** çok vergi = altın ama mutsuzluk.

## Konut & büyüme
- Nüfus kapasitesi ev/konak ve merkez seviyesine bağlı (prototipte var).
- Doğum: yeterli yiyecek + kapasite + mutluluk şartı (prototipte var, ihtiyaç
  modeline bağlanacak).
- **Göç:** mutlu/zengin krallığa dışarıdan göçmen gelir; mutsuz krallıktan kaçış.

## Toplum katmanları (ileri)
- **Sınıflar:** köylü / zanaatkâr / soylu (farklı ihtiyaç ve katkı).
- **Kültür:** krallığın kimliği; fethedilen halkın kültürü farklıysa entegrasyon
  zor (asimilasyon zaman ister) — savaş/fetih ile bağ (bkz. 05).
- **Din/inanç:** tapınak, ayinler, mutluluk & diplomasi etkisi (prototipte
  "rites" teknolojisi var); din yayma/farklılık gerilim yaratır.

## Ortaya çıkan hikâyeler (emergent)
- Köylülerin küçük olayları: bir köylü kahraman olur, bir aile büyür, bir salgın
  bir mahalleyi vurur, bir isyancı öne çıkar.
- **Olay günlüğü** bunları anlatır ("Aslan adlı avcı bir ayı avladı", "Kış
  Demirköy'de 3 can aldı") → oyuncu köyüne bağlanır.

## Sağlık & felaket bağı
- Veba/salgın nüfusu tehdit eder (prototipte var); hijyen/şifahane teknolojisi
  azaltır. Kalabalık = salgın riski (prototipte `crowding` var).
- Kıtlık: yiyecek biterse ölüm (prototipte var), ihtiyaç modeline bağlanır.

## Arayüzde köylü
- Bir köylüye dokun → kart: isim, yaş, meslek, ruh hali, beceri, kısa hikâye.
- Nüfus paneli: toplam, boşta, meslek dağılımı, mutluluk kırılımı, doğum/ölüm oranı.

## Denge & test
- Nüfus eğrisi testi: erken oyunda istikrarlı büyüme, geç oyunda ihtiyaç baskısı.
- İhtiyaç ağırlıkları veri dosyasında → ince ayar kod değişmeden.
