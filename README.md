# Krallıklar Çağı

Mobil öncelikli, izometrik, canlı bir dünyada geçen strateji + medeniyet oyunu.
WorldBox'ın canlılığı + Civilization'ın derinliği + Rise of Kingdoms'ın erişilebilirliği.

> Bu depo, `prototype/kralliklar-cagi-v0.5.html` (tek dosyalık zengin prototip)
> temel alınarak **modüler, test edilebilir, çok oyunculuya hazır** bir projeye
> dönüştürülmektedir.

---

## 📚 Plan / Tasarım Dokümanları

Büyük plan çok parçalıdır. Sırayla:

| # | Doküman | İçerik |
|---|---------|--------|
| 00 | [Genel Bakış](docs/00-GENEL-BAKIS.md) | Vizyon, sütunlar, oyun hissi, tasarım ilkeleri |
| 01 | [Mimari](docs/01-MIMARI.md) | Teknoloji yığını, determinizm, klasör yapısı, göç planı |
| 02 | [Grafik & Sanat](docs/02-GRAFIK-SANAT.md) | Gerçek dokular, boyut/oran, animasyon, "çizgi film" düzeltmesi |
| 03 | [Ekonomi & İnşa](docs/03-EKONOMI-INSA.md) | İnşa süreleri, üretim zincirleri, depo, bina kataloğu |
| 04 | [Nüfus & Toplum](docs/04-NUFUS-TOPLUM.md) | Köylü yaşamı, ihtiyaçlar, meslek, mutluluk |
| 05 | [Savaş](docs/05-SAVAS.md) | Birim kontrolü, saldırı, kuşatma, komutanlar, savunma |
| 06 | [Diplomasi & Krallıklar](docs/06-DIPLOMASI.md) | Yapay zeka beyni, antlaşmalar, casusluk, koalisyon |
| 07 | [İlerleme & Çağlar](docs/07-ILERLEME.md) | Çağlar, teknoloji ağacı, harikalar, zafer koşulları |
| 08 | [Dünya & Olaylar](docs/08-DUNYA-OLAYLAR.md) | Harita üretimi, hava, mevsim, felaketler, yaban hayat |
| 09 | [Arayüz & UX](docs/09-UI-UX.md) | Mobil kontroller, HUD, paneller, öğretici, yerelleştirme |
| 10 | [Kayıt & Devamlılık](docs/10-KAYIT.md) | Kaldığın yerden devam, otomatik kayıt, çevrimdışı ilerleme |
| 11 | [Yol Haritası](docs/11-YOL-HARITASI.md) | Fazlar, kilometre taşları, teslimatlar, bağımlılıklar |
| 12 | [Backlog](docs/12-BACKLOG.md) | Tüm özellik/bina/birim/sistem havuzu |
| — | [DURUM (nerede kaldık)](docs/DURUM.md) | **Canlı ilerleme takibi** — her oturumda güncellenir |

---

## 🎯 Şu anki durum

**Faz 0 · M1 tamamlandı** — modüler motor çalışıyor: deterministik dünya
üretimi (testli), izometrik render, dokunmatik kamera, minimap.
Güncel ilerleme her zaman [docs/DURUM.md](docs/DURUM.md) dosyasındadır.

## 🚀 Geliştirme

```bash
npm install
npm run dev      # yerel geliştirme sunucusu (Vite)
npm run build    # üretim derlemesi → dist/
npm run test     # Vitest — determinizm + dünya üretimi testleri
npm run lint     # tsc --noEmit tip denetimi
```

Prototipi hemen denemek için `prototype/kralliklar-cagi-v0.5.html` dosyasını
bir tarayıcıda açın (yatay ekran / mobil önerilir).
