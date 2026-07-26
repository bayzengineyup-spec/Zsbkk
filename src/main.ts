/* ============================================================
   ÖNYÜKLEME + OYUN DÖNGÜSÜ (M2 — Köy Kurma)
   Katman kuralı: core hiçbir DOM bilmez; render core'u okur;
   UI komut üretir → sim uygular (docs/01-MIMARI).
   ============================================================ */
import { World } from './core/world';
import { Sim } from './core/sim';
import { BIOMES } from './data/biomes';
import { BUILDINGS, costStr, type BuildingType } from './data/buildings';
import { Camera, type Viewport } from './render/camera';
import { buildTileSprites } from './render/tiles';
import { buildBuildingSprites } from './render/buildings';
import { drawScene, type Frame, type Ghost, type RenderStats, type TileSel } from './render/scene';
import { MiniMap } from './render/minimap';
import { TouchInput } from './ui/input';
import { initToasts, toast } from './ui/toast';
import { saveNow, hasSave, restoreGame } from './ui/persist';
import {
  initDiplo, openDiploPanel, closeDiploPanel, refreshDiploPanel, diploOpen,
} from './ui/diplo';

function el<T extends HTMLElement>(id: string): T {
  const e = document.getElementById(id);
  if (!e) throw new Error(`#${id} bulunamadı`);
  return e as T;
}

// ---------- tuval + görüş alanı ----------
const cv = el<HTMLCanvasElement>('cv');
const ctx = cv.getContext('2d')!;
const mm = el<HTMLCanvasElement>('minimap');
const mmx = mm.getContext('2d')!;

const view: Viewport = { w: 0, h: 0, dpr: 1 };

function resize(): void {
  view.dpr = Math.min(window.devicePixelRatio || 1, 2);
  view.w = Math.floor(innerWidth * view.dpr);
  view.h = Math.floor(innerHeight * view.dpr);
  cv.width = view.w; cv.height = view.h;
  cv.style.width = `${innerWidth}px`;
  cv.style.height = `${innerHeight}px`;
}
window.addEventListener('resize', () => { resize(); if (world) cam.clamp(world.W, world.H); });
window.addEventListener('orientationchange', () => {
  setTimeout(() => { resize(); if (world) cam.clamp(world.W, world.H); }, 120);
});
resize();

// ---------- durum ----------
const cam = new Camera(view);
const tileSprites = buildTileSprites();
const bSprites = buildBuildingSprites();
let world: World | null = null;
let sim: Sim | null = null;
let minimap: MiniMap | null = null;
let sel: TileSel | null = null;
let ghost: Ghost | null = null;
const stats: RenderStats = { tiles: 0, sprites: 0 };

initToasts(el('toasts'));

// ---------- ipucu ----------
const hintEl = el<HTMLElement>('hint');
function hint(msg: string | null): void {
  if (msg) { hintEl.textContent = msg; hintEl.classList.add('show'); }
  else hintEl.classList.remove('show');
}

// ---------- HUD ----------
function refreshHUD(): void {
  if (!sim) return;
  const p = sim.player;
  el('r-food').textContent = String(Math.floor(p.res.food));
  el('r-wood').textContent = String(Math.floor(p.res.wood));
  el('r-stone').textContent = String(Math.floor(p.res.stone));
  el('r-gold').textContent = String(Math.floor(p.res.gold));
  el('r-pop').textContent = `${p.pop}/${p.popCap}`;
  el('r-happy').textContent = `%${Math.round(p.happy)}`;
  const s = sim.currentSeason();
  el('r-season').textContent = `${s.icon} ${s.name} · ${sim.time.year}. yıl`;
  // aktif etkiler (veba, sert kış, altın çağ…)
  el('efxbar').innerHTML = sim.events.activeEffects
    .map(e => `<div class="efx">${e.icon} <b>${e.name}</b> · ${Math.ceil(e.timer)}sn</div>`)
    .join('');
  refreshDiploPanel();
}

// ---------- karo bilgi kartı ----------
const tileinfo = el<HTMLElement>('tileinfo');

function hideInfo(): void {
  sel = null;
  tileinfo.classList.remove('show');
}

function refreshTileInfo(): void {
  if (!world || !sel || !world.inBounds(sel.gx, sel.gy)) { tileinfo.classList.remove('show'); return; }
  const { gx, gy } = sel;
  const i = world.idx(gx, gy);
  const act = el<HTMLElement>('ti-act');
  const b = sim?.buildingAt(gx, gy) ?? null;

  if (b && sim) {
    const def = BUILDINGS[b.type];
    el('ti-name').textContent = `${def.icon} ${def.name} · sv ${b.level}${b.burning ? ' 🔥' : ''}`;
    el('ti-l1').textContent = def.desc;
    el('ti-l2').textContent = def.maxWorkers
      ? `İşçi: ${b.workers}/${def.maxWorkers} · Boşta: ${sim.player.idle}`
      : '';
    el('ti-l3').textContent = b.burning ? `Sağlamlık: ${Math.max(0, Math.round(b.hp ?? 100))}/100` : '';
    act.innerHTML = '';
    act.style.display = 'flex';

    if (b.burning) {
      const ext = document.createElement('button');
      ext.textContent = '🪣 Söndür';
      ext.disabled = sim.player.idle <= 0;
      ext.onclick = () => { sim!.applyCommand({ kind: 'extinguish', x: gx, y: gy }); refreshTileInfo(); };
      act.append(ext);
    }
    if (def.maxWorkers > 0) {
      const minus = document.createElement('button');
      minus.textContent = '− işçi';
      minus.disabled = b.workers <= 0;
      minus.onclick = () => { sim!.applyCommand({ kind: 'assign', x: gx, y: gy, delta: -1 }); refreshTileInfo(); refreshHUD(); };
      const plus = document.createElement('button');
      plus.textContent = '+ işçi';
      plus.disabled = sim.player.idle <= 0 || b.workers >= def.maxWorkers;
      plus.onclick = () => { sim!.applyCommand({ kind: 'assign', x: gx, y: gy, delta: 1 }); refreshTileInfo(); refreshHUD(); };
      act.append(minus, plus);
    }
    if (b.type === 'center') {
      const ups = BUILDINGS.center.upgrade!;
      if (b.level - 1 < ups.length) {
        const up = document.createElement('button');
        up.textContent = `⬆ Yükselt (${costStr(ups[b.level - 1].cost)})`;
        up.disabled = !sim.canAfford(ups[b.level - 1].cost);
        up.onclick = () => { sim!.applyCommand({ kind: 'upgradeCenter', x: gx, y: gy }); refreshTileInfo(); refreshHUD(); };
        act.append(up);
      }
    } else {
      const dem = document.createElement('button');
      dem.className = 'danger';
      dem.textContent = '🗑 Yık';
      dem.onclick = () => { sim!.applyCommand({ kind: 'demolish', x: gx, y: gy }); hideInfo(); refreshHUD(); };
      act.append(dem);
    }
  } else {
    el('ti-name').textContent = BIOMES[world.tiles[i]].name;
    el('ti-l1').textContent = `Konum: ${gx}, ${gy}`;
    el('ti-l2').textContent = `Yükseklik: ${world.height[i].toFixed(2)}`;
    el('ti-l3').textContent = `Kaynak: ${world.res[i] ?? '—'}`;
    el<HTMLElement>('ti-act').style.display = 'none';
  }
  tileinfo.classList.add('show');
}

// ---------- inşa paneli ----------
const buildpanel = el<HTMLElement>('buildpanel');
const bBuild = el<HTMLElement>('b-build');

function openBuildPanel(): void {
  if (!sim) return;
  const grid = el<HTMLElement>('bgrid');
  grid.innerHTML = '';
  for (const type of Object.keys(BUILDINGS) as BuildingType[]) {
    const def = BUILDINGS[type];
    if (def.unique && sim.player.buildings.some(x => x.type === type)) continue;
    // merkez yoksa önce merkez
    if (!sim.player.hasCenter && type !== 'center') continue;
    const afford = sim.canAfford(def.cost);
    const card = document.createElement('div');
    card.className = 'bcard' + (afford ? '' : ' poor');
    card.innerHTML = `<div class="bic">${def.icon}</div>`
      + `<div class="bnm">${def.name}</div>`
      + `<div class="bcost">${costStr(def.cost)}</div>`;
    card.title = def.desc;
    card.onclick = () => {
      if (!sim!.canAfford(def.cost)) { toast('Yeterli kaynak yok.', 'bad'); return; }
      enterPlace(type);
      closeBuildPanel();
    };
    grid.appendChild(card);
  }
  buildpanel.classList.add('show');
  bBuild.classList.add('on');
}
function closeBuildPanel(): void {
  buildpanel.classList.remove('show');
  bBuild.classList.remove('on');
}

// ---------- yerleştirme modu ----------
const placebar = el<HTMLElement>('placebar');

function enterPlace(type: BuildingType): void {
  if (!world) return;
  hideInfo();
  // hayalet: ekran ortasındaki karo
  const c = cam.screenToWorld(innerWidth / 2, innerHeight / 2);
  const gx = Math.max(0, Math.min(world.W - 1, c.gx));
  const gy = Math.max(0, Math.min(world.H - 1, c.gy));
  ghost = { type, gx, gy, valid: false };
  updateGhostValidity();
  el('pb-name').textContent = `${BUILDINGS[type].icon} ${BUILDINGS[type].name}`;
  placebar.classList.add('show');
  hint('Yer seçmek için haritaya dokun');
}

function updateGhostValidity(): void {
  if (!ghost || !sim) return;
  const def = BUILDINGS[ghost.type];
  const placeOk = sim.canPlaceOn(ghost.type, ghost.gx, ghost.gy);
  const afford = sim.canAfford(def.cost);
  ghost.valid = placeOk && afford;
  const status = el<HTMLElement>('pb-status');
  const ok = el<HTMLButtonElement>('pb-ok');
  if (!placeOk) status.textContent = 'buraya kurulamaz';
  else if (!afford) status.textContent = 'kaynak yetersiz';
  else status.textContent = 'hazır';
  ok.disabled = !ghost.valid;
}

function confirmPlace(): void {
  if (!ghost || !sim) return;
  const wasCenter = ghost.type === 'center';
  const okPlaced = sim.applyCommand({ kind: 'place', building: ghost.type, x: ghost.gx, y: ghost.gy });
  if (okPlaced) {
    cancelPlace();
    if (wasCenter) hint(null);
    refreshHUD();
    saveNow(sim); // önemli eylem sonrası anında kayıt
  } else {
    updateGhostValidity();
  }
}

function cancelPlace(): void {
  ghost = null;
  placebar.classList.remove('show');
  hint(null);
}

el<HTMLButtonElement>('pb-ok').onclick = confirmPlace;
el<HTMLButtonElement>('pb-cancel').onclick = () => {
  const wasCenter = ghost?.type === 'center';
  cancelPlace();
  // merkez hâlâ yoksa yerleştirme şart — ipucunu koru
  if (wasCenter && sim && !sim.player.hasCenter) {
    hint('Köy kurmak için önce Köy Meydanı gerekli — İnşa menüsünden seç');
  }
};

// ---------- girdi ----------
function haptic(ms: number): void {
  try { navigator.vibrate?.(ms || 12); } catch { /* desteklenmiyor */ }
}

const input = new TouchInput(cv, cam, view, () => world, {
  haptic,
  onSelect(clientX, clientY) {
    if (!world) return;
    const g = cam.screenToWorld(clientX, clientY);
    if (!world.inBounds(g.gx, g.gy)) { if (!ghost) hideInfo(); return; }
    if (ghost) {
      // yerleştirme modunda: hayaleti taşı
      ghost.gx = g.gx; ghost.gy = g.gy;
      updateGhostValidity();
    } else {
      sel = { gx: g.gx, gy: g.gy };
      refreshTileInfo();
    }
  },
});

// mini haritaya dokun → oraya odaklan
mm.addEventListener('pointerdown', (e) => {
  if (!world) return;
  const r = mm.getBoundingClientRect();
  const gx = Math.floor(((e.clientX - r.left) / r.width) * world.W);
  const gy = Math.floor(((e.clientY - r.top) / r.height) * world.H);
  cam.focusOn(
    Math.max(0, Math.min(world.W - 1, gx)),
    Math.max(0, Math.min(world.H - 1, gy)),
    world,
  );
  haptic(10);
});

// ---------- alt şerit ----------
const bDiplo = el<HTMLElement>('b-diplo');

function closeDiplo(): void {
  closeDiploPanel();
  bDiplo.classList.remove('on');
}

el('b-explore').onclick = () => { cancelPlace(); closeBuildPanel(); closeDiplo(); };
bBuild.onclick = () => {
  if (buildpanel.classList.contains('show')) closeBuildPanel();
  else { cancelPlace(); closeDiplo(); openBuildPanel(); }
};
bDiplo.onclick = () => {
  if (diploOpen) closeDiplo();
  else {
    cancelPlace(); closeBuildPanel();
    openDiploPanel(); bDiplo.classList.add('on');
  }
};
el('b-center').onclick = () => {
  if (!world || !sim) return;
  const c = sim.villageCenter();
  cam.focusOn(c.x, c.y, world);
  haptic(10);
};
el('b-new').onclick = () => {
  if (sim) saveNow(sim); // mevcut oyunu kaybetme
  el('boot').style.display = 'flex';
  refreshBootButtons();
  world = null; sim = null; minimap = null;
  cancelPlace(); closeBuildPanel(); closeDiplo(); hideInfo();
};

// diplomasi paneli bağlantısı
initDiplo({
  panel: el('diplopanel'),
  list: el('diplolist'),
  getSim: () => sim,
  onAction: (kingdomId, action) => {
    if (!sim) return;
    sim.applyCommand({ kind: 'diplo', kingdomId, action });
    haptic(12);
    refreshHUD();
  },
  onGoto: (x, y) => {
    if (!world) return;
    cam.focusOn(x, y, world);
    closeDiplo();
    haptic(10);
  },
});

// ---------- dünya kurulumu ----------
function finishSetup(focusX: number, focusY: number): void {
  if (!world || !sim) return;
  minimap = new MiniMap(world);
  sel = null; ghost = null;
  hideInfo();
  el('opt-seed').textContent = String(world.seed);
  cam.zoom = 1.1;
  cam.x = 0; cam.y = 0;
  cam.focusOn(focusX, focusY, world);
  el('boot').style.display = 'none';
  el<HTMLElement>('loadmsg').style.display = 'none';
  refreshHUD();
}

function startGame(size: number): void {
  el<HTMLElement>('loadmsg').style.display = 'block';
  setTimeout(() => {
    const seed = (Math.random() * 1e9) | 0; // yalnız tohum üretimi — sim dışı
    world = new World(size, size, seed);
    sim = new Sim(world);
    // rakip krallıklar (boyuta göre) + başlangıç vadisi
    const kc = size <= 192 ? (size <= 128 ? 6 : 6) : size <= 256 ? 9 : 13;
    sim.kingdoms.spawn(kc);
    const spot = sim.pickStartRegion();
    sim.revealStartArea(spot.x, spot.y, 25);
    finishSetup(spot.x, spot.y);
    // ilk görev: köy meydanı yerleştir (hayalet başlangıç vadisinde)
    enterPlace('center');
    if (ghost) {
      (ghost as Ghost).gx = spot.x;
      (ghost as Ghost).gy = spot.y;
      updateGhostValidity();
    }
    hint('Köy meydanını kurmak için bir yer seç');
  }, 30);
}

function continueGame(): void {
  el<HTMLElement>('loadmsg').style.display = 'block';
  setTimeout(() => {
    const r = restoreGame();
    if (!r) {
      toast('Kayıt okunamadı — yeni oyun başlat.', 'bad');
      el<HTMLElement>('loadmsg').style.display = 'none';
      return;
    }
    world = r.world;
    sim = r.sim;
    const c = sim.villageCenter();
    finishSetup(c.x, c.y);
    if (!sim.player.hasCenter) {
      enterPlace('center');
      hint('Köy meydanını kurmak için bir yer seç');
    } else {
      toast('▶ Kaldığın yerden devam ediyorsun.', 'good');
    }
  }, 30);
}

function refreshBootButtons(): void {
  el<HTMLElement>('opt-continue').style.display = hasSave() ? '' : 'none';
}

el<HTMLButtonElement>('opt-play').onclick = () => {
  startGame(parseInt(el<HTMLSelectElement>('opt-size').value, 10));
};
el<HTMLButtonElement>('opt-continue').onclick = continueGame;
refreshBootButtons();

// ---------- otomatik kayıt ----------
// aralıklı + uygulama arka plana geçince (docs/10-KAYIT)
setInterval(() => { if (sim) saveNow(sim); }, 20000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && sim) saveNow(sim);
});
window.addEventListener('pagehide', () => { if (sim) saveNow(sim); });

// ---------- döngü ----------
const SIM_HZ = 10, SIM_STEP = 1 / SIM_HZ;
let simAcc = 0;
let lastT = 0;
let fpsFrames = 0, fpsAcc = 0, hudAcc = 0, renderT = 0;

function loop(t: number): void {
  if (!lastT) lastT = t;
  let dt = (t - lastT) / 1000;
  lastT = t;
  if (!isFinite(dt) || dt < 0) dt = 0;
  if (dt > 0.25) dt = 0.25;
  renderT += dt;

  let alpha = 1;
  if (sim && world && minimap) {
    // sabit zaman adımı — determinizmin şartı
    simAcc += dt;
    let guard = 0;
    while (simAcc >= SIM_STEP && guard < 5) { sim.tick(SIM_STEP); simAcc -= SIM_STEP; guard++; }
    if (guard >= 5) simAcc = 0;
    alpha = Math.max(0, Math.min(1, simAcc / SIM_STEP));

    // sim olaylarını bildirime çevir
    for (const ev of sim.drainEvents()) toast(ev.msg, ev.kind);

    input.applyMomentum(dt);
    if (ghost) updateGhostValidity();

    const frame: Frame = {
      ctx, world, cam, view,
      tileSprites, bSprites,
      sim, sel, ghost, alpha, t: renderT, stats,
    };
    drawScene(frame);
    minimap.draw(mmx, cam, view, sim, dt);

    hudAcc += dt;
    if (hudAcc >= 0.25) { hudAcc = 0; refreshHUD(); }
  }

  fpsFrames++; fpsAcc += dt;
  if (fpsAcc >= 0.5) {
    el('hud-fps').textContent = `${Math.round(fpsFrames / fpsAcc)} fps`;
    fpsFrames = 0; fpsAcc = 0;
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
