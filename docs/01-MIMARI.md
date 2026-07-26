# 01 — Mimari

## Karar özeti
- **Temel:** `prototype/kralliklar-cagi-v0.5.html` (WebGL izometrik canlı dünya).
- **Hedef:** Modüler TypeScript projesi, Vite ile derlenen; tarayıcı + PWA.
- **UI yaklaşımı:** Oyun dünyası **canvas/WebGL** (React değil). Menü/HUD/paneller
  için hafif bir katman (vanilla TS + şablonlar veya çok ince bir reaktif katman).
  Ağır React/DOM ağacı gerçek zamanlı oyun için gereksiz yüktür.
- **Determinizm birinci sınıf:** Tüm simülasyon deterministik; ileride
  çok oyunculu (lockstep) için baştan hazır.

## Neden tek dosya değil de modüler?
Prototip 6772 satır tek dosya. Büyük ölçekte:
- Test edilemez (headless sim testi yazılamaz).
- İçerik eklemek (yeni bina/birim) riskli — her şey birbirine değiyor.
- İki kişi aynı anda çalışamaz.
Modüler yapı bunların hepsini çözer; yine de `vite build` tek/az sayıda dosyaya
paketleyip prototipin taşınabilirliğini korur.

## Teknoloji yığını
| Katman | Seçim | Gerekçe |
|--------|-------|---------|
| Dil | TypeScript | Tip güvenliği, büyük kod tabanı için şart |
| Derleme | Vite | Hızlı, PWA eklentisi, prototipteki kurulum mevcut |
| Render | WebGL2 (2D batch) + Canvas2D fallback | Prototipten geliyor, binlerce sprite |
| UI | Vanilla TS + küçük reaktif yardımcı | Düşük yük, canvas ile çakışmaz |
| Ses | Web Audio (sentez) | Prototipten geliyor, dosyasız |
| Depolama | IndexedDB (+localStorage yedeği) | Büyük kayıtlar, çevrimdışı |
| Test | Vitest | Headless simülasyon + birim testleri |
| Lint | ESLint + tsc --noEmit | Kalite kapısı |

## Üç (dört) katman kuralı
Prototipteki **core / render / input** ayrımını koruyup güçlendiriyoruz:

```
┌─────────────────────────────────────────────┐
│  SIM (deterministik çekirdek)                │  ← saf mantık, DOM yok, zaman yok
│  world, economy, population, military,       │     (fixed timestep, seed'li RNG)
│  diplomacy, events, tech, kingdoms           │
├─────────────────────────────────────────────┤
│  RENDER (çizim)                              │  ← SIM durumunu okur, ara-değerli
│  webgl, atlas, sprites, camera, fx, minimap  │     (interpolation), yazmaz
├─────────────────────────────────────────────┤
│  INPUT / UI                                  │  ← komut üretir → SIM'e gönderir
│  touch, panels, hud, tutorial                │     (asla SIM'i doğrudan değiştirmez)
└─────────────────────────────────────────────┘
```

**Altın kural:** UI ve Render, SIM'i **asla doğrudan** değiştirmez. Her değişiklik
bir **komut** (Command) olarak SIM'e girer. Bu, determinizmin ve çok oyunculunun
temelidir.

## Simülasyon modeli
- **Sabit adım (fixed timestep):** 10 Hz mantık (prototipteki gibi), render
  interpolasyonlu 60 fps. `while(acc>=step) sim(step)`.
- **Komut kuyruğu:** Girdi → `Command[]`. Her tick, o tick'e ait komutlar sırayla
  işlenir. Kayıt = `seed + komut listesi` (çok küçük) **veya** anlık durum.
- **Deterministik RNG:** Prototipteki `makeRNG`/`makeNoise` çekirdeği korunur;
  tek global seed'den türetilen alt akışlar (dünya, olaylar, savaş ayrı akış).
- **Zaman soyutlaması:** `Date.now()` sim içinde yasak; sim yalnızca `dt` bilir.
  Gerçek zaman sadece çevrimdışı-ilerleme hesabı için dışarıda kullanılır
  (bkz. 10-KAYIT).

## Hedef klasör yapısı
```
src/
  main.ts                 # önyükleme, oyun döngüsü
  core/                   # SIM — saf, deterministik, DOM'suz
    rng.ts  noise.ts
    world.ts  biomes.ts
    economy.ts  construction.ts  storage.ts
    population.ts  villager.ts  needs.ts
    military.ts  combat.ts  army.ts  commander.ts
    diplomacy.ts  kingdom.ts  ai.ts
    tech.ts  ages.ts
    events.ts  weather.ts  season.ts
    wildlife.ts
    commands.ts           # Command tipleri + reducer
    gamestate.ts          # tek doğruluk kaynağı
  render/                 # RENDER — SIM'i okur
    gl.ts  atlas.ts  textures/  sprites.ts
    camera.ts  scene.ts  fx.ts  minimap.ts  daynight.ts
  ui/                     # INPUT/UI
    input.ts  hud.ts  panels/  tutorial.ts  toast.ts
    i18n/  (tr.json, en.json)
  data/                   # VERİ (kod değil)
    buildings.json  units.json  techs.json
    biomes.json  events.json  personalities.json
  save/                   # kayıt/yükleme, migrasyon, çevrimdışı ilerleme
  test/                   # Vitest — headless sim testleri
prototype/                # referans: orijinal tek dosya
docs/                     # bu planlar
```

## Prototipten göç planı (Faz 0)
Prototipi silmeden, parça parça taşıyacağız. Sıra (her adım sonrası oyun çalışır):
1. **İskele:** Vite + TS kurulumu, boş oyun döngüsü, canvas bağlanır.
2. **RNG + Noise + World:** dünya üretimi taşınır → harita çizilir (statik).
3. **Render çekirdeği:** atlas, doku üretimi, kamera, izometrik çizim.
4. **Input:** dokunmatik kaydırma/zoom.
5. **Ekonomi + inşa:** kaynaklar, binalar (şimdilik prototip mantığı).
6. **Köylüler, olaylar, mevsim, diplomasi, savaş** → sırayla modüllere.
7. **Kayıt sistemi** yeni formatla.
8. Prototip yalnızca referans olarak kalır; eski React iskeleti kaldırılır.

## Kalite kapıları
- `tsc --noEmit` temiz.
- Headless sim testi: "1000 tick oynat, kaynak/nüfus makul aralıkta" tarzı
  denge/regresyon testleri.
- Aynı seed + aynı komutlar → aynı son durum (determinizm testi).
- Performans bütçesi: hedef cihazda ≥45 fps, sim <6ms, çizim <10ms.

## Çok oyunculuya hazırlık (ileride)
- Sim zaten deterministik + komut tabanlı → **lockstep** doğal.
- İnternet katmanı sonradan eklenir: komutları N tick gecikmeyle senkronla,
  herkes aynı simülasyonu çalıştırır. Sunucu sadece komut relay + doğrulama.
- Bugün yazılacak kod, bu modeli **bozmayacak** disiplinle yazılır (Date.now
  yok, Math.random yok — hep seed'li RNG; DOM'dan sim'e sızıntı yok).
