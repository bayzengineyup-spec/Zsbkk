# 11 — Yol Haritası

Her faz **kendi başına oynanabilir bir sürüm** bırakır. Sıra bağımlılığa göre;
ama sanat (Faz 2) ve derinlik fazları iç içe ilerleyebilir.

> Güncel ilerleme her zaman [DURUM.md](DURUM.md) dosyasında. Bu dosya *plan*,
> DURUM *gerçek durum*.

---

## FAZ 0 — Temel (altyapı) `[sürüm 0.6]`
Amaç: prototipi modüler, test edilebilir projeye taşımak.
- [x] Vite + TS (strict) + Vitest kurulumu; eski React iskeletini kaldır. *(lint kapısı: `tsc --noEmit`)*
- [x] Klasör yapısı (core/render/ui/data/test) — bkz. 01-MIMARI.
- [x] RNG + Noise + World üretimini core'a taşı (deterministik testli, 18 test).
- [x] Render çekirdeği: kamera + izometrik çizim + minimap. *(M1: Canvas2D sprite; WebGL atlas sprite sayısı artınca)*
- [x] Dokunmatik input porta (atalet, pinch, çift dokunuş, uzun basma).
- [ ] Ekonomi + köylü + olay + diplomasi + savaş çekirdeğini modüllere böl.
      *(M2 ✓: ekonomi+köylü+mevsim, komut deseniyle · M3 ←: olaylar, krallıklar/diplomasi, sis, kayıt · M4: askeri, teknoloji, zafer)*
- [ ] Veri dosyaları: buildings/units/techs/events ayrı veri modüllerine. *(biomes+buildings+seasons+names taşındı)*
- [x] Bilinen bug'lar: tekrarlı `#rail` butonları — yeni arayüzde yok.
- **Bitti kriteri:** prototiple aynı oyun, artık modüler + testli çalışıyor.

## FAZ 1 — İnşa süreleri & ekonomi derinliği `[0.7]`
- [ ] İnşa/yükseltme SÜRE sistemi (kuyruk, işçi, ilerleme, iptal) — bkz. 03.
- [ ] Aşamalı inşa görseli (iskele→tam).
- [ ] Tüm binalara seviye/yükseltme.
- [ ] İlk üretim zincirleri (un→ekmek, kereste, cevher→alet).
- [ ] Kaynağa özel depo + uyarılar.
- **Bitti kriteri:** bina kurunca süre işliyor, ekonomi zincirli.

## FAZ 2 — Grafik & sanat yükseltmesi `[0.8]`
- [ ] Doku denetimi + "saçma" dokuları yeniden üret (katmanlı prosedürel).
- [ ] Boyut/oran standardı; tüm sprite'lar referans figüre göre.
- [ ] Animasyon durum makinesi (idle/yürü/çalış/savaş/ölüm).
- [ ] Meslek animasyonları, gölge, ışık, gündüz-gece cilası.
- [ ] Efekt havuzu genişletme (toz/kıvılcım/yaprak/parıltı).
- **Bitti kriteri:** hiçbir yer "çizgi film/yapay zeka" durmuyor; akıcı animasyon.

## FAZ 3 — Kayıt & devamlılık `[0.9]`
- [ ] IndexedDB kayıt + sürümleme + migrasyon — bkz. 10.
- [ ] Otomatik kayıt + "Devam Et" akışı.
- [ ] Çevrimdışı ilerleme + "sen yokken" özeti.
- [ ] Determinizm/kayıt-yükle testi.
- **Bitti kriteri:** kapat-aç, her şey yerinde; yokken zaman kısmen işledi.

## FAZ 4 — Savaş & birim kontrolü `[0.10]`
- [ ] Asker eğitim kuyruğu (süreli).
- [ ] Ordu kur/seç/hareket/saldır (dokunmatik) — bkz. 05.
- [ ] Otomatik çözüm savaşı (Model A) + animasyon + kayıp.
- [ ] Kuşatma & şehir savaşı; fetih & işgal temeli.
- [ ] Savunma: sur/kule/garnizon; barbar akını dengesi.
- **Bitti kriteri:** ordu kurup düşmana saldırıp şehir alabiliyorsun.

## FAZ 5 — Toplum & nüfus derinliği `[0.11]`
- [ ] Köylü yaşam döngüsü (yaş/doğum/ölüm), meslek becerisi.
- [ ] İhtiyaç-tabanlı mutluluk modeli.
- [ ] Olay günlüğü + ortaya çıkan hikâyeler.
- [ ] Din/kültür temeli.

## FAZ 6 — Diplomasi & büyük strateji `[0.12]`
- [ ] AI beyni (hedef/hafıza/koalisyon) — bkz. 06.
- [ ] Şartlı antlaşmalar, vasallık, casusluk derinliği.
- [ ] Dinamik ticaret fiyatları.

## FAZ 7 — Çağlar & ilerleme `[0.13]`
- [ ] Çağ sistemi + çağ atlama + görsel evrim — bkz. 07.
- [ ] Teknoloji ağacı genişletme + araştırma süresi.
- [ ] Harikalar; çeşitli zafer koşulları.

## FAZ 8 — Dünya zenginliği `[0.14]`
- [ ] Nehirler, kaynak yatakları, özel lokasyonlar.
- [ ] Hava durumu; ekoloji/evcilleştirme — bkz. 08.
- [ ] Yeni olaylar/felaketler.

## FAZ 9 — Cila, UX, yerelleştirme `[0.15]`
- [ ] Arayüz cilası, olay günlüğü, uyarı rozetleri — bkz. 09.
- [ ] Kampanya öğreticisi; erişilebilirlik.
- [ ] TR + EN yerelleştirme; katmanlı müzik; başarımlar.

## FAZ 10 — Platform `[1.0]`
- [ ] PWA/çevrimdışı/kurulabilir.
- [ ] Düşük cihaz optimizasyonu (LOD, bütçeler).
- [ ] (Opsiyonel) Capacitor ile mağaza paketleme.

## FAZ 11 — Çok oyunculu (ileri) `[2.0]`
- [ ] Lockstep ağ katmanı (sim zaten deterministik + komut tabanlı).
- [ ] Senkron/relay sunucu; masa/lobi; anti-hile doğrulama.

---

## Sürümleme
- `0.x` = geliştirme fazları; `1.0` = ilk tam/cilalı tek-oyunculu sürüm;
  `2.0` = çok oyunculu.
- Her faz sonunda `prototype/` referans kalır, `CHANGELOG` güncellenir.

## Bağımlılık notları
- Faz 1 (süre) → Faz 4 (asker eğitimi de süreli) temelini kurar.
- Faz 3 (kayıt) mümkün olduğunca erken → her testte ilerleme korunur.
- Faz 2 (sanat) diğer fazlara paralel serpiştirilebilir.
