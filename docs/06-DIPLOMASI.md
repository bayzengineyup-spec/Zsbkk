# 06 — Diplomasi & Krallıklar

> Prototipte 8 kişilikli, kendi kendine büyüyen AI krallıkları + diplomasi zaten
> var. Bunu gerçek bir büyük strateji katmanına çıkarıyoruz.

## AI krallıkları
- **Kişilikler (prototipte var):** Fatih, Barışçıl, Sinsi, Tüccar, İnzivacı,
  Fanatik, Bilge, Kaotik — her biri farklı agresiflik/genişleme/ticaret eğilimi.
- Kendi ekonomisi, nüfusu, ordusu, toprağı; kendi kendine büyür/genişler
  (prototipte var). Birbirleriyle de savaşır/ittifak kurar (prototipte
  `updateAIWars`).

## AI beyni (derinleştirme)
Basit tepkiden **hedef güden** yapay zekaya:
- **Hedefler:** genişle / zenginleş / teknolojiye yatır / rakibi zayıflat.
  Kişilik hedef ağırlığını belirler.
- **Hafıza & kin:** geçmiş ihanetleri, saldırıları hatırlar; ilişki buna göre.
- **Fırsatçılık:** zayıf/dağınık komşuya saldırır; güçlüyle ittifak/haraç.
- **Koalisyon:** çok güçlenen oyuncuya karşı birleşme (denge mekanizması).
- **İhanet kavisi (Sinsi):** dost görünür, arkadan vurur (prototipte tohum var).

## İlişki & durumlar
Prototipteki hat: **savaş → düşmanlık → tarafsız → dostluk → ittifak.**
- İlişki puanı zamanla ve eylemlerle değişir (hediye +, saldırı −, ticaret +).
- Güven ayrı bir eksen: yüksek güven = ittifak sürer; düşük güven = ihanet mümkün.

## Diplomatik eylemler
Prototipte var (genişletilecek): hediye, ateşkes, ticaret anlaşması, ittifak
teklif/boz, casus, haraç talep, savaş ilanı, saldırı, haritada göster.
Eklenecek:
- **Şartlı antlaşmalar:** "sana X öderim, Y krallığına saldırma" gibi terimler.
- **Sınır anlaşması:** genişleme hattı belirleme.
- **Vasallık:** zayıf krallığı haraca bağlama / koruma altına alma.
- **Kraliyet evliliği (ileri):** kalıcı ittifak bağı, veraset entrikaları.
- **Elçi/temsilci:** düzenli diplomasi teması (prototipte "envoy" var).

## Casusluk & gizli operasyonlar
Prototipte casus + casus ağı teknolojisi var. Genişletme:
- **İstihbarat:** rakibin gücü, ordusu, planları hakkında bilgi.
- **Sabotaj:** üretim düşür, bina hasarla, isyan kışkırt.
- **Propaganda:** rakibin mutluluğunu/ilişkilerini bozma.
- Yakalanma riski → diplomatik kriz.

## Ticaret ekonomisi
- Ticaret anlaşması → **görünür kervanlar** (prototipte var, yağmalanabilir).
- **Dinamik fiyatlar (ileri):** arz-talep; bir kaynakta zenginsen ucuza satar,
  fakirsen pahalıya alırsın.
- Pazar/liman/kervansaray ticaret gelirini artırır (bkz. 03).

## İtibar & prestij
- İtibar (prototipte var): sözünde durmak artırır, ihanet düşürür → gelecekteki
  diplomasiyi etkiler.
- Prestij/skor: harikalar, çağ atlama, zaferler → dünya sıralaması, zafer koşulu.

## Arayüz
- Diplomasi paneli (prototipte var): her krallık için ilişki, durum, eylem düğmeleri.
- Dünya ilişkiler haritası: kim kiminle dost/düşman, sınırlar renkli.
- Bildirimler: elçi geldi, savaş ilanı, ittifak teklifi, kervan yağmalandı.

## Denge & test
- Kişilik parametreleri veri dosyasında.
- Test: "AI'lar birbirini yok edip tek süper-güç oluşturuyor mu, yoksa denge
  koruyor mu?" — koalisyon mekanizması bunu dengelemeli.
