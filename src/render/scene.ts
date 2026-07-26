/* ============================================================
   SAHNE ÇİZİMİ — görünür alan taraması + hazır sprite'lar
   Performans ilkeleri (prototipten):
   1. Sadece ekranda görünen karolar taranır
   2. Karolar/binalar hazır sprite (drawImage) ile çizilir
   3. Çizim sırası: uzaktan yakına (gx+gy köşegenleri)
   4. Köylüler karo kovalarına konur (karo başına liste taranmaz)
   ============================================================ */
import type { World } from '../core/world';
import type { Sim, Building, Villager } from '../core/sim';
import type { BuildingType } from '../data/buildings';
import type { ResourceKind } from '../data/biomes';
import { Camera, TILE_W, TILE_H, type Viewport } from './camera';
import { shadeBucket, type TileSprite } from './tiles';
import type { BuildingSprite } from './buildings';

export interface TileSel { gx: number; gy: number; }

export interface Ghost {
  type: BuildingType;
  gx: number;
  gy: number;
  valid: boolean;
}

const RES_COLORS: Record<ResourceKind, string> = {
  'balık': '#5ec8e8', 'yiyecek': '#a8e05f', 'at': '#d9b38c', 'odun': '#8a5a2a',
  'altın': '#ffd700', 'taş': '#b0a89a', 'demir': '#c0c8d0', 'mermer': '#f0f0f5',
};

/* köylü görünümü: isimden deterministik renk (aynı köylü hep aynı) */
const SHIRT_COLORS = ['#8a5a3a', '#5a7a8a', '#7a8a4a', '#8a4a5a', '#6a5a8a', '#8a7a3a'];
function nameHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export interface RenderStats { tiles: number; sprites: number; }

export interface Frame {
  ctx: CanvasRenderingContext2D;
  world: World;
  cam: Camera;
  view: Viewport;
  tileSprites: Map<string, TileSprite>;
  bSprites: Map<BuildingType, BuildingSprite>;
  sim: Sim | null;
  sel: TileSel | null;
  ghost: Ghost | null;
  /** sim interpolasyon katsayısı 0..1 */
  alpha: number;
  /** kozmetik animasyonlar için gerçek zaman (sn) — sim'e girmez */
  t: number;
  stats: RenderStats;
}

/** Yanan bina alev efekti (kozmetik). */
function drawFlames(f: Frame, sx: number, sy: number): void {
  const { ctx } = f;
  const z = f.cam.zoom;
  const fl = Math.sin(f.t * 11 + sx * 0.13) * 0.5 + 0.5;
  const fl2 = Math.sin(f.t * 14 + sy * 0.17 + 2) * 0.5 + 0.5;
  const baseY = sy - 8 * z;
  ctx.globalAlpha = 0.75 + fl * 0.25;
  ctx.fillStyle = '#ff8a2c';
  ctx.beginPath();
  ctx.moveTo(sx - 5 * z, baseY);
  ctx.lineTo(sx, baseY - (12 + fl * 6) * z);
  ctx.lineTo(sx + 5 * z, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffd23c';
  ctx.beginPath();
  ctx.moveTo(sx - 2.5 * z, baseY);
  ctx.lineTo(sx + 1 * z, baseY - (7 + fl2 * 4) * z);
  ctx.lineTo(sx + 3.5 * z, baseY);
  ctx.closePath();
  ctx.fill();
  // duman
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#555';
  ctx.beginPath();
  ctx.arc(sx + fl2 * 3 * z, baseY - (18 + fl * 5) * z, (4 + fl * 2) * z, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Yürüyen ordu (yer tutucu): asker kümesi + sancak + sayı rozeti. */
function drawArmy(f: Frame, sx: number, sy: number, color: string, size: number): void {
  const { ctx } = f;
  const z = f.cam.zoom;
  const step = Math.sin(f.t * 9) * 0.8 * z; // yürüyüş sallanması
  // gölge
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + 1.5 * z, 8 * z, 3 * z, 0, 0, Math.PI * 2);
  ctx.fill();
  // asker kümesi (3 figür)
  const offs: [number, number][] = [[-5, 0], [0, -2], [5, 0]];
  for (let i = 0; i < offs.length; i++) {
    const ox = offs[i][0] * z, oy = offs[i][1] * z + (i === 1 ? -step : step);
    ctx.fillStyle = '#3a3430';
    ctx.beginPath();
    ctx.ellipse(sx + ox, sy - 4 * z + oy, 2.2 * z, 3.4 * z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8c8a0';
    ctx.beginPath();
    ctx.arc(sx + ox, sy - 8.5 * z + oy, 1.8 * z, 0, Math.PI * 2);
    ctx.fill();
    // mızrak
    ctx.strokeStyle = '#8a7a5a';
    ctx.lineWidth = 0.9 * z;
    ctx.beginPath();
    ctx.moveTo(sx + ox + 2 * z, sy - 2 * z + oy);
    ctx.lineTo(sx + ox + 2 * z, sy - 13 * z + oy);
    ctx.stroke();
  }
  // sancak
  ctx.strokeStyle = '#2c241c';
  ctx.lineWidth = 1.2 * z;
  ctx.beginPath();
  ctx.moveTo(sx - 7 * z, sy - 3 * z);
  ctx.lineTo(sx - 7 * z, sy - 18 * z);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(sx - 7 * z, sy - 18 * z);
  ctx.lineTo(sx - 1 * z, sy - 16 * z);
  ctx.lineTo(sx - 7 * z, sy - 14 * z);
  ctx.closePath();
  ctx.fill();
  // sayı rozeti
  const label = String(size);
  ctx.font = `bold ${Math.max(9, 8 * z)}px sans-serif`;
  const tw = ctx.measureText(label).width;
  ctx.fillStyle = 'rgba(12,8,5,0.82)';
  const bw = tw + 8 * z * 0.6;
  ctx.beginPath();
  ctx.roundRect(sx - bw / 2, sy - 26 * z, bw, 10 * z, 3 * z);
  ctx.fill();
  ctx.fillStyle = '#f0e6d2';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, sx, sy - 21 * z);
}

/** AI krallık başkenti işareti (yer tutucu — gerçek doku Faz 2'de). */
function drawCapital(f: Frame, sx: number, sy: number, color: string): void {
  const { ctx } = f;
  const z = f.cam.zoom;
  // kule gövdesi
  ctx.fillStyle = '#4a4038';
  ctx.fillRect(sx - 7 * z, sy - 16 * z, 14 * z, 14 * z);
  ctx.fillStyle = '#5f544a';
  ctx.fillRect(sx - 7 * z, sy - 16 * z, 14 * z, 4 * z);
  // burç dişleri
  ctx.fillStyle = '#4a4038';
  for (let i = -1; i <= 1; i++) {
    ctx.fillRect(sx + i * 5 * z - 1.5 * z, sy - 19 * z, 3 * z, 3.5 * z);
  }
  // krallık bayrağı
  ctx.strokeStyle = '#2c241c';
  ctx.lineWidth = 1.2 * z;
  ctx.beginPath();
  ctx.moveTo(sx, sy - 19 * z);
  ctx.lineTo(sx, sy - 28 * z);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(sx, sy - 28 * z);
  ctx.lineTo(sx + 7 * z, sy - 26 * z);
  ctx.lineTo(sx, sy - 24 * z);
  ctx.closePath();
  ctx.fill();
}

function drawVillager(f: Frame, v: Villager): void {
  const { ctx, cam, world } = f;
  const z = cam.zoom;
  // interpolasyonlu konum
  const rx = v.px + (v.x - v.px) * f.alpha;
  const ry = v.py + (v.y - v.py) * f.alpha;
  const ix = Math.max(0, Math.min(world.W - 1, rx | 0));
  const iy = Math.max(0, Math.min(world.H - 1, ry | 0));
  const h = world.height[world.idx(ix, iy)];
  const c = cam.worldToScreen(rx - 0.5, ry - 0.5, h);
  const bob = Math.sin(v.bob) * 1.2 * z;

  // gölge
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(c.x, c.y + 1 * z, 3.2 * z, 1.5 * z, 0, 0, Math.PI * 2);
  ctx.fill();
  // gövde
  ctx.fillStyle = SHIRT_COLORS[nameHash(v.name) % SHIRT_COLORS.length];
  ctx.beginPath();
  ctx.ellipse(c.x, c.y - 4 * z + bob, 2.6 * z, 4 * z, 0, 0, Math.PI * 2);
  ctx.fill();
  // kafa
  ctx.fillStyle = '#e8c8a0';
  ctx.beginPath();
  ctx.arc(c.x, c.y - 9.5 * z + bob, 2.2 * z, 0, Math.PI * 2);
  ctx.fill();
}

function drawBuildingSprite(
  f: Frame, spr: BuildingSprite, gx: number, gy: number, h: number, alpha = 1,
): void {
  const { ctx, cam } = f;
  const z = cam.zoom;
  const c = cam.worldToScreen(gx, gy, h);
  if (alpha < 1) ctx.globalAlpha = alpha;
  ctx.drawImage(
    spr.cnv,
    c.x - (spr.w / 2) * z,
    c.y - spr.anchorY * z,
    spr.w * z,
    spr.h * z,
  );
  if (alpha < 1) ctx.globalAlpha = 1;
  f.stats.sprites++;
}

function diamondPath(
  ctx: CanvasRenderingContext2D, x: number, y: number, hw: number, hh: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x, y - hh);
  ctx.lineTo(x + hw, y);
  ctx.lineTo(x, y + hh);
  ctx.lineTo(x - hw, y);
  ctx.closePath();
}

export function drawScene(f: Frame): void {
  const { ctx, world, cam, view, sim } = f;
  ctx.fillStyle = '#0d0a07';
  ctx.fillRect(0, 0, view.w, view.h);

  const z = cam.zoom;
  const cssW = view.w / view.dpr, cssH = view.h / view.dpr;

  // görünür karo aralığı
  const corners = [
    cam.screenToWorld(0, 0), cam.screenToWorld(cssW, 0),
    cam.screenToWorld(0, cssH), cam.screenToWorld(cssW, cssH),
  ];
  const M = 3;
  let minGx = Infinity, maxGx = -Infinity, minGy = Infinity, maxGy = -Infinity;
  for (const c of corners) {
    if (c.gx < minGx) minGx = c.gx;
    if (c.gx > maxGx) maxGx = c.gx;
    if (c.gy < minGy) minGy = c.gy;
    if (c.gy > maxGy) maxGy = c.gy;
  }
  minGx = Math.max(0, minGx - M); maxGx = Math.min(world.W - 1, maxGx + M);
  minGy = Math.max(0, minGy - M); maxGy = Math.min(world.H - 1, maxGy + M);

  // binalar + köylüler karo kovalarına (yalnız görünür alan için)
  const bMap = new Map<number, Building>();
  const vMap = new Map<number, Villager[]>();
  if (sim) {
    for (const b of sim.player.buildings) bMap.set(world.idx(b.x, b.y), b);
    for (const v of sim.villagers) {
      const ix = v.x | 0, iy = v.y | 0;
      if (ix < minGx - 1 || ix > maxGx + 1 || iy < minGy - 1 || iy > maxGy + 1) continue;
      const i = iy * world.W + ix;
      let arr = vMap.get(i);
      if (!arr) { arr = []; vMap.set(i, arr); }
      arr.push(v);
    }
  }

  let drawn = 0;
  f.stats.sprites = 0;
  const halfWz = (TILE_W / 2) * z, halfHz = (TILE_H / 2) * z;

  // uzaktan yakına: köşegen sırası
  const sMin = minGx + minGy, sMax = maxGx + maxGy;
  for (let s = sMin; s <= sMax; s++) {
    const gxStart = Math.max(minGx, s - maxGy);
    const gxEnd = Math.min(maxGx, s - minGy);
    for (let gx = gxStart; gx <= gxEnd; gx++) {
      const gy = s - gx;
      const i = world.idx(gx, gy);
      // sis: hiç görülmemiş karo çizilmez (karanlık kalır)
      const visLevel = sim ? sim.vis[i] : 2;
      if (visLevel === 0) continue;
      const h = world.height[i];
      const spr = f.tileSprites.get(`${world.tiles[i]}:${shadeBucket(h)}`);
      if (!spr) continue;
      const c = cam.worldToScreen(gx, gy, h);
      if (c.x < -TILE_W * z || c.x > view.w + TILE_W * z) continue;
      if (c.y < -TILE_H * 3 * z || c.y > view.h + TILE_H * 3 * z) continue;
      const dim = visLevel === 1;
      if (dim) ctx.globalAlpha = 0.5; // keşfedilmiş ama görüş dışı: loş
      // 0.75px taşma: kesirli konumlarda sprite dikişlerini örter
      ctx.drawImage(spr.cnv, c.x - halfWz - 0.75, c.y - halfHz - 0.75, spr.w * z + 1.5, spr.h * z + 1.5);
      drawn++;

      // krallık toprağı tonu
      const owner = sim ? sim.kingdoms.ownerMap.get(i) : undefined;
      if (owner) {
        diamondPath(ctx, c.x, c.y, halfWz, halfHz);
        ctx.fillStyle = owner.color;
        const oldA = ctx.globalAlpha;
        ctx.globalAlpha = oldA * 0.20;
        ctx.fill();
        ctx.globalAlpha = oldA;
      }

      // kaynak işareti (yakınlaşınca, bina yoksa)
      const res = world.res[i];
      if (res !== null && z >= 1.1 && !bMap.has(i)) {
        ctx.fillStyle = RES_COLORS[res];
        ctx.strokeStyle = 'rgba(0,0,0,0.55)';
        ctx.lineWidth = z;
        ctx.beginPath();
        ctx.arc(c.x, c.y, 3.2 * z, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // AI başkenti
      if (owner && owner.cx === gx && owner.cy === gy) {
        drawCapital(f, c.x, c.y, owner.color);
      }

      // bina
      const b = bMap.get(i);
      if (b) {
        const bspr = f.bSprites.get(b.type);
        if (bspr) drawBuildingSprite(f, bspr, gx, gy, h);
        if (b.burning) drawFlames(f, c.x, c.y);
      }

      // bu karodaki köylüler (yalnız görüş alanında)
      const vs = visLevel === 2 ? vMap.get(i) : undefined;
      if (vs) for (const v of vs) drawVillager(f, v);

      if (dim) ctx.globalAlpha = 1;
    }
  }
  f.stats.tiles = drawn;

  // ---- yürüyen ordular ----
  if (sim) {
    for (const a of sim.military.armies) {
      const ix = a.x | 0, iy = a.y | 0;
      if (!world.inBounds(ix, iy)) continue;
      if (sim.vis[world.idx(ix, iy)] === 0 && a.owner !== 'player') continue;
      const rx = a.px + (a.x - a.px) * f.alpha;
      const ry = a.py + (a.y - a.py) * f.alpha;
      const h = world.height[world.idx(ix, iy)];
      const c = cam.worldToScreen(rx - 0.5, ry - 0.5, h);
      drawArmy(f, c.x, c.y, a.color, a.size);
    }
  }

  // ---- hayalet (inşa modu) ----
  if (f.ghost && world.inBounds(f.ghost.gx, f.ghost.gy)) {
    const gi = world.idx(f.ghost.gx, f.ghost.gy);
    const gh = world.height[gi];
    const gc = cam.worldToScreen(f.ghost.gx, f.ghost.gy, gh);
    // ayak izi
    diamondPath(ctx, gc.x, gc.y, halfWz, halfHz);
    ctx.fillStyle = f.ghost.valid ? 'rgba(90,200,90,0.30)' : 'rgba(220,70,50,0.32)';
    ctx.fill();
    ctx.strokeStyle = f.ghost.valid ? '#5ac85a' : '#dc4632';
    ctx.lineWidth = 2 * z;
    ctx.stroke();
    // bina önizlemesi
    const bspr = f.bSprites.get(f.ghost.type);
    if (bspr) drawBuildingSprite(f, bspr, f.ghost.gx, f.ghost.gy, gh, 0.6);
  }

  // ---- seçim vurgusu ----
  if (f.sel && world.inBounds(f.sel.gx, f.sel.gy)) {
    const i = world.idx(f.sel.gx, f.sel.gy);
    const c = cam.worldToScreen(f.sel.gx, f.sel.gy, world.height[i]);
    diamondPath(ctx, c.x, c.y, halfWz, halfHz);
    ctx.strokeStyle = '#d9a441';
    ctx.lineWidth = 2 * z;
    ctx.stroke();
  }
}
