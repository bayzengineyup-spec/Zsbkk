/* ============================================================
   ÖNYÜKLEME + OYUN DÖNGÜSÜ (M1 — Dünya Gezgini)
   Katman kuralı: core hiçbir DOM bilmez; render core'u okur;
   input komut/kamera üretir. (docs/01-MIMARI)
   ============================================================ */
import { World } from './core/world';
import { BIOMES } from './data/biomes';
import { Camera, type Viewport } from './render/camera';
import { buildTileSprites } from './render/tiles';
import { drawScene, type RenderStats, type TileSel } from './render/scene';
import { buildMinimapCache, drawMinimap } from './render/minimap';
import { TouchInput } from './ui/input';

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
const sprites = buildTileSprites();
let world: World | null = null;
let mmCache: HTMLCanvasElement | null = null;
let sel: TileSel | null = null;
const stats: RenderStats = { tiles: 0 };

// ---------- HUD ----------
const hudSeed = el<HTMLElement>('hud-seed');
const hudFps = el<HTMLElement>('hud-fps');
const tileinfo = el<HTMLElement>('tileinfo');
const tiName = el<HTMLElement>('ti-name');
const tiXy = el<HTMLElement>('ti-xy');
const tiH = el<HTMLElement>('ti-h');
const tiRes = el<HTMLElement>('ti-res');

function showTileInfo(gx: number, gy: number): void {
  if (!world || !world.inBounds(gx, gy)) { tileinfo.classList.remove('show'); return; }
  const i = world.idx(gx, gy);
  tiName.textContent = BIOMES[world.tiles[i]].name;
  tiXy.textContent = `${gx}, ${gy}`;
  tiH.textContent = world.height[i].toFixed(2);
  tiRes.textContent = world.res[i] ?? '—';
  tileinfo.classList.add('show');
}

// ---------- girdi ----------
function haptic(ms: number): void {
  try { navigator.vibrate?.(ms || 12); } catch { /* desteklenmiyor */ }
}

const input = new TouchInput(cv, cam, view, () => world, {
  haptic,
  onSelect(clientX, clientY) {
    if (!world) return;
    const g = cam.screenToWorld(clientX, clientY);
    if (world.inBounds(g.gx, g.gy)) {
      sel = { gx: g.gx, gy: g.gy };
      showTileInfo(g.gx, g.gy);
    } else {
      sel = null;
      tileinfo.classList.remove('show');
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

// ---------- dünya kurulumu ----------
function startGame(size: number): void {
  const loadmsg = el<HTMLElement>('loadmsg');
  loadmsg.style.display = 'block';
  // ağır işi bir sonraki karede yap (ekran donmasın)
  setTimeout(() => {
    const seed = (Math.random() * 1e9) | 0; // yalnız dünya tohumu üretimi — sim dışı
    world = new World(size, size, seed);
    mmCache = buildMinimapCache(world);
    sel = null;
    tileinfo.classList.remove('show');
    hudSeed.textContent = String(seed);
    el<HTMLElement>('opt-seed').textContent = String(seed);
    cam.zoom = 1.1;
    cam.x = 0; cam.y = 0;
    cam.focusOn(size / 2, size / 2, world);
    el<HTMLElement>('boot').style.display = 'none';
    loadmsg.style.display = 'none';
  }, 30);
}

el<HTMLButtonElement>('opt-play').onclick = () => {
  startGame(parseInt(el<HTMLSelectElement>('opt-size').value, 10));
};
el<HTMLButtonElement>('b-new').onclick = () => {
  el<HTMLElement>('boot').style.display = 'flex';
  world = null; mmCache = null;
  tileinfo.classList.remove('show');
};
el<HTMLButtonElement>('b-center').onclick = () => {
  if (world) { cam.focusOn(world.W / 2, world.H / 2, world); haptic(10); }
};

// ---------- döngü ----------
let lastT = 0;
let fpsFrames = 0, fpsAcc = 0;

function loop(t: number): void {
  if (!lastT) lastT = t;
  let dt = (t - lastT) / 1000;
  lastT = t;
  if (!isFinite(dt) || dt < 0) dt = 0;
  if (dt > 0.25) dt = 0.25;

  if (world && mmCache) {
    input.applyMomentum(dt);
    drawScene(ctx, world, cam, view, sprites, sel, stats);
    drawMinimap(mmx, mmCache, world, cam, view);
  }

  fpsFrames++; fpsAcc += dt;
  if (fpsAcc >= 0.5) {
    hudFps.textContent = String(Math.round(fpsFrames / fpsAcc));
    fpsFrames = 0; fpsAcc = 0;
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
