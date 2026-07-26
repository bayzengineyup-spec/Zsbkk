# 05 — Savaş & Askeri

> Senin soruların: "savaş nasıl olacak, nasıl saldıracak, birimler nasıl kontrol
> edilecek?" Bu dokümanın tamamı bunu yanıtlıyor.

## Tasarım felsefesi
- Savaş **görünür ve haritada** olur (soyut sayı savaşı değil). Ordular yürür,
  çarpışır, kuşatır — oyuncu her şeyi izler ve müdahale eder.
- **Taş-kağıt-makas** dengesi: Mızrakçı > Süvari > Okçu > Mızrakçı (prototipte var).
- Erişilebilir ama derin: dokunmatikle kolay komut, ama formasyon/arazi/komutan
  ile ustalık tavanı yüksek.

## Birim türleri
| Birim | Rol | Güçlü | Zayıf |
|-------|-----|-------|-------|
| Mızrakçı | Piyade/ön saf | Süvariye | Okçuya |
| Okçu | Menzilli | Mızrakçıya | Süvariye |
| Süvari | Vurucu/hız | Okçuya | Mızrakçıya |
| Kuşatma (mancınık/koçbaşı) | Sur/bina yıkar | Yapılara | Yavaş, korumasız |
| (İleri) Kahraman/komutan | Ordu lideri, yetenek | — | — |

Her birim: sağlık, saldırı, savunma, menzil, hız, moral, bakım maliyeti (yiyecek/
altın). Teknoloji ve komutan bunları çarpar (prototipte temel var).

## Asker eğitimi (SÜRELİ)
- Kışla/talimhane/ahırda birim **eğitim kuyruğu** — inşa gibi süreli.
- Boştaki köylü → asker (nüfustan düşer). Kaynak + süre öder.
- Kuyruk arayüzü: kaç adet, hangi tür; ilerleme çubuğu; hızlandırma.
- Bakım: ordu büyüdükçe yiyecek/altın tüketir → sınırsız ordu olmaz.

## Ordu oluşturma & kontrol (dokunmatik)
Mobil-önce kontrol şeması:
1. **Ordu topla:** Kışladan/rally noktasından "Ordu Kur" → birim karışımını seç
   (örn. 10 mızrakçı, 5 okçu, bir komutan) → ordu haritada tek bir **jeton (token)**
   olarak belirir (içinde bileşim görünür).
2. **Seç:** jetona dokun → seçili (halka + bilgi kartı: güç, bileşim, komutan).
3. **Hareket:** haritada bir yere dokun → ordu oraya **yürür** (yol bulma, arazi
   hızını dikkate alır). Yürürken canlı görünür (prototipte yürüyen ordu var).
4. **Saldırı:** düşman ordusuna/şehrine/barbar kampına dokun → **saldır** komutu;
   ordu hedefe yürür, temas edince çarpışma başlar.
5. **Toplu komut (ileri):** birden çok orduyu grupla, formasyon ata.

> Not: Gerçek zamanlı ama "yavaş" — oyuncu düşünecek zaman bulur. İstenirse
> savaş anında hafif zaman yavaşlatma (bullet-time) opsiyonu.

## Çarpışma nasıl çözülür
İki model destekliyoruz; **kademeli** geçiş:

### Model A — Otomatik çözüm (başlangıç, basit)
- İki ordu temas edince güç + tür avantajı + komutan + arazi + moral hesaplanır.
- Kısa bir animasyonlu çatışma (sprite'lar vuruşur, parçacık, kan), sonra
  kayıplar uygulanır. Kazanan kalır, kaybeden dağılır/kaçar.
- Prototipteki savaş çözümünün genişletilmiş hali.

### Model B — Taktiksel çarpışma (derinlik, sonraki faz)
- Birimler ayrı ayrı sprite; ön saf/arka saf **formasyon**.
- Okçular menzilden atar, mızrakçılar önde tutar, süvari kanattan sarar.
- Arazi etkisi: tepe = menzil/savunma bonusu, orman = süvariye ceza, nehir/geçit
  darboğaz.
- Oyuncu formasyon/hedef önceliği verir; gerisi otomatik (mikro-yönetim zorunlu
  değil, ama mümkün).
- **Moral:** kayıp alınca moral düşer; kırılınca birim kaçar (bozgun).

## Kuşatma & şehir savaşı
- Şehir/köyün **savunması:** sur (prototipte var), kule (menzilli otomatik atış),
  kapı, garnizon (savunan askerler), komutan bonusu.
- Saldıran ordu şehre gelince **kuşatma:** kuşatma birimleri sur/kapıyı yıkar
  (siege teknolojisi etkili — prototipte var), sonra içeri girer.
- **Sonuç:**
  - Savunma kırılırsa: yağma (kaynak çalınır), bina hasarı, nüfus kaybı, ve
    fetih ise **toprak/şehir el değiştirir**.
  - Saldırı püskürtülürse: saldıran kayıpla çekilir, savunanın moralı/itibarı artar.
- **Fetih sonrası:** işgal edilen şehir isyan riski taşır (mutluluk düşük),
  entegre etmek zaman/yatırım ister. Kültür/din farkı zorlaştırır (bkz. 04, 06).

## Savunma (oyuncunun köyü saldırı altında)
- Barbar akını / düşman ordusu geldiğinde erken uyarı (sınırda toz, casus raporu).
- Oyuncu: surları güçlendir, garnizon ata, komutanı savunmaya koy, ordusunu geri çek.
- Saldırı gerçek zamanlı izlenir; son anda takviye gönderilebilir.

## Komutanlar / Kahramanlar
Prototipte komutan + yetenek + seviye var; genişletilecek:
- Her komutanın **özelliği** (kuşatma ustası, süratli, kalkan duvarı, taktikçi…)
  ve **seviye** ile güçlenen bonusları.
- **Yetenek ağacı (ileri):** seviye atladıkça pasif/aktif yetenek seçimi.
- Aktif yetenek: savaşta tetiklenen güçlü etki (hücum emri, ok yağmuru, moral).
- **Ölüm/esaret:** komutan savaşta yaralanabilir/esir düşebilir → kurtarma/fidye.
- Sınırlı komutan sayısı → hangi orduya kimi koyacağın stratejik.

## Deniz (ileri faz)
- Su/balık zaten var. Liman + gemi → keşif, deniz ticareti, çıkarma birliği,
  deniz savaşı. Adalı haritalar anlam kazanır.

## Yapay zeka rakip savaşı
- AI krallıkları kişiliğe göre saldırır (Fatih agresif, İnzivacı savunmacı —
  prototipte var). Güç dengesini gözler, zayıf anında saldırır, koalisyon kurar.
- AI kuşatma/savunma da yapar; sadece oyuncuya değil birbirlerine de savaşır
  (prototipte `updateAIWars` var).

## Geri bildirim (juice)
- Kılıç sesi, ok vınlaması, kalkan, boru; hasar sayıları; kan/toz parçacığı;
  ekran sarsıntısı; zafer/bozgun bildirimi + müzik değişimi.

## Denge & test
- Tüm birim/teknoloji değerleri veri dosyasında.
- Headless "savaş simülatörü" testi: eşit güçte X ordusu vs Y → tür avantajı
  beklenen sonucu veriyor mu? Denge otomatik doğrulanır.
