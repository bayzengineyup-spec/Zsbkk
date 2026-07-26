# 08 — Dünya & Olaylar

## Harita üretimi
Prototipte Perlin/fbm + 16 biyom + tohum tabanlı deterministik üretim var
(sağlam temel). Genişletme:
- **Nehirler & göller:** yükseklikten akan gerçek nehirler; tarım/ticaret/savunma
  değeri (geçit, köprü).
- **Kaynak yatakları:** demir/altın/taş/verimli toprak öbekleri haritaya dağılır
  → yer seçimi stratejik olur.
- **Özel lokasyonlar:** harabeler (keşif ödülü), kutsal alanlar, mağaralar,
  tarafsız köyler (fethet/ittifak), barbar kampları.
- **Harita boyutu & tipi:** küçük/orta/büyük (prototipte var); kıta, adalar,
  bozkır, dağlık gibi ön ayarlar.
- **İsimlendirme:** bölgeler/dağlar/nehirler prosedürel isim alır → dünya "gerçek".

## Biyomlar
Prototipte 16 biyom var. Her biyom: görsel doku (bkz. 02), kaynak, hareket
maliyeti, kurulabilir bina türü, savaş bonusu/cezası, hava eğilimi.

## Keşif & sis
Prototipte sis örtüsü (0 görülmedi / 1 keşfedildi / 2 görüşte) var.
- Keşif ödüllü: yeni bölge açınca kaynak/olay/lokasyon.
- Kâşif/keşif birimi (ileri): haritayı açan özel birim.
- Minimap sisi yansıtır (prototipte var).

## Mevsimler & zaman
Prototipte 4 mevsim (tarım/tüketim/yangın etkisi) + yıl sayacı + gündüz/gece var.
- Kış tarımı düşürür, yiyecek tüketimini artırır → depolama planı gerekir.
- Görsel: mevsim rengi, kar örtüsü, yaprak dökümü (bkz. 02).

## Hava durumu (yeni katman)
- Yağmur (tarım +, hareket −, yangın −), fırtına, kar, sıcak dalgası, sis.
- Görsel + oynanış etkisi + savaşta etki (yağmurda okçu zayıf, sisde görüş az).

## Olaylar & felaketler
Prototipteki **koşullu** olay sistemi korunur ve genişletilir (rastgele değil,
önlem alınabilir — temel ilke):
- **Felaketler (prototipte var):** yangın (yayılır, söndürülür), veba, deprem,
  fırtına, sert kış, barbar akını, isyan.
- **İyi olaylar (prototipte var):** altın çağ, göç, kervan, kahraman.
- **Eklenecek:** kıtlık zinciri, sel (nehir taşması), kuraklık, salgın türevleri,
  gezgin tüccar, kâşif keşfi, doğal afet sonrası dayanışma.
- Her olay: tetik koşulu (risk hesabı — prototipte `woodenRatio`, `crowding` var),
  önlem yolu (taş bina, şifahane, sur), süre/etki, bildirim.

## Yaban hayat & ekoloji
Prototipte dört-ayaklı iskelet animasyonu + hayvan yapay zekası (yerleşim,
dolaşım, kaçış, avlanma) var.
- **Türler:** geyik, tavşan, kurt, ayı, yaban domuzu; iklime göre dağılım.
- **Ekoloji (ileri):** av-avcı dengesi; aşırı avlanma türü azaltır.
- **Evcilleştirme:** at (süvari), sığır/koyun (otlak → yiyecek/yün), tavuk.
- Tehlike: kurt/ayı köylüye saldırabilir → savunma/avcı gerekir.

## Denge & test
- Dünya üretimi tohumla deterministik → aynı tohum aynı harita (test edilir).
- Olay tetikleyicileri veri dosyasında → sıklık/şiddet ayarlanabilir.
- "Adalet" testi: felaketler önlem alan oyuncuyu cezalandırmamalı.
