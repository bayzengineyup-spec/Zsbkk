# 02 — Grafik & Sanat

> Bu doküman senin en çok vurguladığın konuyu ele alır: "gerçek dokular
> üretilmeli, çizgi film / yapay zeka üretimi gibi duran yerler gerçek gibi
> düzeltilmeli, boyutlar/oranlar düzeltilmeli, animasyonlar eklenmeli."

## Sanat yönü (art direction)
- **Ton:** "Gerçekçi-ama-okunur" izometrik. Elle boyanmış hissi veren, sıcak
  toprak paletli, hafif stilize ama **emoji/çizgi-film değil**.
- **Referans:** Age of Empires II arazi dokuları + The Settlers oran hissi +
  Tinytan/Rimworld okunurluğu. Fotoğraf-gerçekçi değil; **inandırıcı** ve tutarlı.
- **Tutarlılık kuralı:** Tek bir ışık yönü (sol-üst), tek bir palet ailesi, tek
  bir izometrik açı. Her sprite aynı "dünyaya ait" görünmeli.

## "Çizgi film / yapay zeka gibi" görünümü düzeltme reçetesi
Prototipteki dokular prosedürel üretiliyor; bazıları düz/yapay duruyor. Kalite
yükseltme adımları:
1. **Doku denetimi (audit):** Her biyom ve bina için ekran görüntüsü al, "saçma"
   duranları listele (bkz. aşağıdaki denetim tablosu). Önce en çok görüneni düzelt.
2. **Katmanlı prosedürel doku:** Düz renk yerine 3+ katman — taban rengi + gürültü
   (grain) + detay (çim öbeği, çatlak, gölge) + kenar koyulaştırma (ambient occ.).
3. **Palet disiplini:** Her biyomun 4-5 tonluk sınırlı paleti; rastgele parlak
   renk yok. Doğadan alınmış tonlar.
4. **Kenar/geçiş yumuşatma (autotiling):** Biyomlar arası keskin kareler yerine
   yumuşak geçişler (prototipte temeli var, genişletilecek).
5. **Doku çözünürlüğü:** Karo başına yeterli piksel; zoom'da bulanık/blok
   görünmemeli. Gerekirse @2x doku + mipmap.
6. **Işık & gölge:** Her nesne zemine gölge düşürsün; yükseklikte kenar ışığı.

### Doku denetim tablosu (Faz 2'de doldurulacak)
| Öğe | Şu anki sorun | Hedef |
|-----|---------------|-------|
| Çayır | (denetlenecek) | Öbekli, tonlu, düz olmayan çim |
| Orman | | Katmanlı ağaç gölgeleri, derinlik |
| Su | | Animasyonlu dalga + kıyı köpüğü |
| Çöl/kum | | Kum dalgası deseni, sıcak ton |
| Binalar | | Doğru oran, malzeme dokusu, gölge |
| Dağ/kaya | | Katmanlı kaya, kar geçişi |

## Boyut & oran standardı (çok önemli)
Prototipte oran karışıklıkları var (kimi sprite çok büyük/küçük). Tek bir
**ölçü sistemi** tanımlıyoruz:
- **Karo (tile):** izometrik, örn. 64×32 px taban (1 dünya birimi = 1 karo).
- **Karakter yüksekliği:** ~1.3 karo (insan). Referans "kapı yüksekliği" kuralı.
- **Bina ayak izi:** karo cinsinden tam sayı (1×1, 2×2, 3×3); yüksekliği ayak
  izine oranlı. Ev 1×1, kışla 2×2, köy meydanı 3×3 gibi.
- **Ağaç/kaya:** karakterle kıyaslanabilir, abartısız.
- **Tek referans figür:** Tüm sprite'lar tasarlanırken yanına "standart köylü"
  konur; oran ona göre kontrol edilir.
- **Z-sıralama:** İzometrik derinlik sıralaması net kural (y + yükseklik).

## Karakter animasyon sistemi
Prototipte iskelet-tabanlı temel var; genişleteceğiz:
- **İskelet:** gövde, kafa, 2 kol, 2 bacak (insan); dört ayaklı için ayrı iskelet.
- **Durumlar (state machine):** idle, yürüme, koşma, çalışma (baltalama/
  kazma/ekme), taşıma, savaş (saldırı/savunma/ölüm), kutlama, üşüme/terleme.
- **Meslek animasyonu:** oduncu ağaca vurur, çiftçi eğilir, madenci kazar,
  asker kılıç sallar — iş yerinde görünür emek.
- **İkincil hareket:** nefes/bob, kumaş/pelerin sallanması, gölge.
- **Yön:** 4 veya 8 yönlü (izometrik). Sprite yerine iskelet döndürme.
- **Çeşitlilik:** isimden türeyen deterministik görünüm (ten, saç, kıyafet
  rengi) — aynı köylü hep aynı görünür (prototipte var, genişletilecek).

## Bina görselleri
- **Yapı kombinasyonu:** temel + duvar + çatı + detay (baca, bayrak, işçi).
- **İnşa aşamaları:** iskele → yarım duvar → tamamlanmış (inşa süresiyle senkron,
  bkz. 03). Oyuncu binanın *yükseldiğini* görür.
- **Seviye görseli:** yükseltilen bina büyür/detaylanır (daha görkemli çatı,
  ek kule). Seviye gözle anlaşılır.
- **Hasar/yangın:** çatlak, is, alev parçacıkları; yıkım animasyonu.

## Efektler (juice)
- Parçacık havuzu: toz, kıvılcım, kan, yaprak, kar, ok izi, büyü/araştırma
  parıltısı, altın toplama parıltısı.
- Ekran geri bildirimi: hafif sarsıntı (deprem/darbe), vurgulama (seçim halkası),
  hasar/iyileşme sayıları.
- Hava: yağmur, kar, sis, rüzgârda eğilen otlar, gölge bulutları.

## Gündüz/gece & atmosfer
- Zaman geçtikçe ışık rengi ve gölge yönü değişir (prototipte temel var).
- Gece: pencerelerde ışık, meşale, ateş parıltısı, yıldızlar.
- Mevsim renk tonu (prototipte var): ilkbahar yeşil, kış mavimsi/karlı.

## Performans için LOD (detay seviyesi)
- Uzak/çok zoom-out: köylüler nokta/basit sprite; yakında tam iskelet.
- Görünmeyen alan çizilmez (frustum culling — prototipte var).
- Statik arazi tek seferde atlas'a pişirilir; sadece hareketliler her kare çizilir.

## Sanat üretim hattı (pipeline)
- Dokular **kodla üretilir** (prototipteki gibi) → dosya yok, seed'li, küçük paket.
- Üretilen dokular atlas'a bir kez pişirilir (buildAllSprites).
- Palet ve parametreler `data/` içinde ayarlanabilir → sanat yönü kod değişmeden
  ince ayarlanır.
- Alternatif: kritik birkaç varlık için elle çizilmiş PNG atlas'ı da desteklenir
  (ileride, gerekirse).

## Kabul ölçütü (bu faz "bitti" demek için)
- Yan yana konunca hiçbir sprite "yapay/çizgi-film" durmuyor.
- Tüm oranlar tek referans figürle tutarlı.
- İnşa/çalışma/savaş animasyonları akıcı ve okunur.
- Düşük telefonda hedef fps korunuyor.
