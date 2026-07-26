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
import type { Creature } from '../core/wildlife';
import type { BuildingType } from '../data/buildings';
import type { ResourceKind } from '../data/biomes';
import { SPECIES } from '../data/species';
import { Camera, TILE_W, TILE_H, type Viewport } from './camera';
import { shadeBucket, type TileSprite, type TreeSprite } from './tiles';
import type { BuildingSprite } from './buildings';
import { dayTint } from './daynight';
import { shade } from './paint';

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
const HAIR_COLORS = ['#2c1c10', '#4a3018', '#6b4a22', '#8a6a3a', '#3d3d3d'];
function nameHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/* karo indeksinden deterministik ağaç yerleşimi */
function tileHash(i: number): number {
  let h = (i + 0x9e3779b9) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

export interface RenderStats { tiles: number; sprites: number; }

export interface Frame {
  ctx: CanvasRenderingContext2D;
  world: World;
  cam: Camera;
  view: Viewport;
  tileSprites: Map<string, TileSprite>;
  bSprites: Map<BuildingType, BuildingSprite>;
  treeSprites: TreeSprite[];
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

/** Hayvan (yer tutucu dört ayaklı — iskelet animasyonu Faz 2'de). */
function drawCreature(f: Frame, c: Creature): void {
  const { ctx, cam, world } = f;
  const z = cam.zoom;
  const S = SPECIES[c.sp];
  const rx = c.px + (c.x - c.px) * f.alpha;
  const ry = c.py + (c.y - c.py) * f.alpha;
  const ix = Math.max(0, Math.min(world.W - 1, rx | 0));
  const iy = Math.max(0, Math.min(world.H - 1, ry | 0));
  const h = world.height[world.idx(ix, iy)];
  const p = cam.worldToScreen(rx - 0.5, ry - 0.5, h);
  const s = c.scale * z * 0.55;
  const dir = c.flip ? -1 : 1;
  const moving = Math.abs(c.x - c.px) + Math.abs(c.y - c.py) > 0.001;
  const walk = moving ? Math.sin(c.bob * 4) : 0;

  // gölge
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 1 * z, S.len * 0.5 * s, S.hgt * 0.22 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // bacaklar
  ctx.strokeStyle = S.dark;
  ctx.lineWidth = 1.4 * s;
  const legY = p.y - S.hgt * 0.45 * s;
  for (let i = 0; i < 4; i++) {
    const lx = p.x + (i < 2 ? -1 : 1) * S.len * 0.28 * s * dir + (i % 2 ? 1.2 * s : -1.2 * s);
    const sw = walk * 1.6 * s * (i % 2 ? 1 : -1);
    ctx.beginPath();
    ctx.moveTo(lx, legY);
    ctx.lineTo(lx + sw, p.y + 0.5 * z);
    ctx.stroke();
  }
  // gövde
  ctx.fillStyle = S.body;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y - S.hgt * 0.62 * s, S.len * 0.5 * s, S.hgt * 0.42 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // karın
  ctx.fillStyle = S.belly;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y - S.hgt * 0.45 * s, S.len * 0.38 * s, S.hgt * 0.2 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // kafa + kulak
  const hx = p.x + S.len * 0.52 * s * dir;
  const hy = p.y - S.hgt * 0.85 * s + walk * 0.4 * s;
  ctx.fillStyle = S.body;
  ctx.beginPath();
  ctx.arc(hx, hy, S.hgt * 0.3 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = S.dark;
  ctx.beginPath();
  ctx.arc(hx + 1.5 * s * dir, hy - S.hgt * 0.28 * s, S.hgt * 0.12 * s, 0, Math.PI * 2);
  ctx.fill();
}

/** Ticaret kervanı (yer tutucu): araba + tekerlekler + krallık flaması. */
function drawCaravan(f: Frame, sx: number, sy: number, color: string): void {
  const { ctx } = f;
  const z = f.cam.zoom;
  // gölge
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + 1 * z, 7 * z, 2.5 * z, 0, 0, Math.PI * 2);
  ctx.fill();
  // tekerlekler
  ctx.fillStyle = '#4a3a26';
  ctx.beginPath(); ctx.arc(sx - 4 * z, sy, 2.4 * z, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(sx + 4 * z, sy, 2.4 * z, 0, Math.PI * 2); ctx.fill();
  // kasa + tente
  ctx.fillStyle = '#7a5c38';
  ctx.fillRect(sx - 6 * z, sy - 7 * z, 12 * z, 5.5 * z);
  ctx.fillStyle = '#d8cbb0';
  ctx.beginPath();
  ctx.ellipse(sx, sy - 7.5 * z, 6.4 * z, 3.6 * z, 0, Math.PI, 0);
  ctx.fill();
  // flama
  ctx.strokeStyle = '#2c241c';
  ctx.lineWidth = z;
  ctx.beginPath();
  ctx.moveTo(sx + 5 * z, sy - 8 * z);
  ctx.lineTo(sx + 5 * z, sy - 14 * z);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(sx + 5 * z, sy - 14 * z);
  ctx.lineTo(sx + 9 * z, sy - 12.7 * z);
  ctx.lineTo(sx + 5 * z, sy - 11.5 * z);
  ctx.closePath();
  ctx.fill();
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

/** Köylü: kollu-bacaklı yürüyen insan (onaylanan stil — mockup2 person()). */
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

  const hash = nameHash(v.name);
  const tunic = SHIRT_COLORS[hash % SHIRT_COLORS.length];
  const hair = HAIR_COLORS[(hash >> 3) % HAIR_COLORS.length];
  const moving = Math.abs(v.x - v.px) + Math.abs(v.y - v.py) > 0.0005;
  const walk = moving ? Math.sin(v.bob * 2.2) : 0; // bacak/kol salınımı
  const bob = moving ? Math.abs(Math.sin(v.bob * 2.2)) * 0.6 * z : 0;
  const footY = c.y + 1 * z;
  const hipY = footY - 5 * z - bob;
  const shoulderY = hipY - 4.6 * z;

  // gölge
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(c.x, footY + 0.4 * z, 3.2 * z, 1.3 * z, 0, 0, Math.PI * 2);
  ctx.fill();

  // bacaklar (koyu pantolon, yürürken makas)
  ctx.strokeStyle = '#42311e';
  ctx.lineWidth = 1.5 * z;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(c.x - 0.9 * z, hipY);
  ctx.lineTo(c.x - 0.9 * z + walk * 2 * z, footY);
  ctx.moveTo(c.x + 0.9 * z, hipY);
  ctx.lineTo(c.x + 0.9 * z - walk * 2 * z, footY);
  ctx.stroke();

  // gövde (tunik: omuzdan kalçaya hafif genişleyen)
  ctx.fillStyle = tunic;
  ctx.beginPath();
  ctx.moveTo(c.x - 2.3 * z, hipY + 0.6 * z);
  ctx.lineTo(c.x + 2.3 * z, hipY + 0.6 * z);
  ctx.lineTo(c.x + 1.7 * z, shoulderY);
  ctx.lineTo(c.x - 1.7 * z, shoulderY);
  ctx.closePath();
  ctx.fill();
  // sağ yan gölgesi (hacim)
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.moveTo(c.x + 0.6 * z, hipY + 0.6 * z);
  ctx.lineTo(c.x + 2.3 * z, hipY + 0.6 * z);
  ctx.lineTo(c.x + 1.7 * z, shoulderY);
  ctx.lineTo(c.x + 0.6 * z, shoulderY);
  ctx.closePath();
  ctx.fill();
  // kemer
  ctx.fillStyle = '#332412';
  ctx.fillRect(c.x - 2.1 * z, hipY - 0.9 * z, 4.2 * z, 0.9 * z);

  // kollar (bacaklarla zıt salınım)
  ctx.strokeStyle = shade(tunic, 0.78);
  ctx.lineWidth = 1.2 * z;
  ctx.beginPath();
  ctx.moveTo(c.x - 1.8 * z, shoulderY + 0.8 * z);
  ctx.lineTo(c.x - 2.3 * z - walk * 1.6 * z, hipY - 0.4 * z);
  ctx.moveTo(c.x + 1.8 * z, shoulderY + 0.8 * z);
  ctx.lineTo(c.x + 2.3 * z + walk * 1.6 * z, hipY - 0.4 * z);
  ctx.stroke();
  // eller (ten)
  ctx.fillStyle = '#e0b88c';
  ctx.beginPath();
  ctx.arc(c.x - 2.3 * z - walk * 1.6 * z, hipY - 0.2 * z, 0.65 * z, 0, Math.PI * 2);
  ctx.arc(c.x + 2.3 * z + walk * 1.6 * z, hipY - 0.2 * z, 0.65 * z, 0, Math.PI * 2);
  ctx.fill();

  // kafa + saç
  const headY = shoulderY - 2.2 * z;
  ctx.fillStyle = '#e8c298';
  ctx.beginPath();
  ctx.arc(c.x, headY, 1.9 * z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.arc(c.x, headY - 0.4 * z, 1.9 * z, Math.PI * 1.05, Math.PI * 1.95);
  ctx.quadraticCurveTo(c.x, headY - 2.9 * z, c.x + 1.85 * z, headY - 0.75 * z);
  ctx.fill();
}

/** İlerleme çubuğu (şantiye/yükseltme/eğitim). */
function drawProgressBar(f: Frame, sx: number, sy: number, prog: number, color: string): void {
  const { ctx } = f;
  const z = f.cam.zoom;
  const w = 26 * z, h = 4 * z;
  ctx.fillStyle = 'rgba(10,7,4,0.75)';
  ctx.beginPath();
  ctx.roundRect(sx - w / 2 - z, sy - h / 2 - z, w + 2 * z, h + 2 * z, 2 * z);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(sx - w / 2, sy - h / 2, Math.max(1, w * Math.max(0, Math.min(1, prog))), h, 1.5 * z);
  ctx.fill();
}

/** Şantiye: bina zeminden yükselir + iskele direkleri + ilerleme çubuğu. */
function drawConstruction(
  f: Frame, spr: BuildingSprite, gx: number, gy: number, h: number, prog: number,
): void {
  const { ctx, cam } = f;
  const z = cam.zoom;
  const c = cam.worldToScreen(gx, gy, h);
  const drawX = c.x - (spr.w / 2) * z;
  const drawY = c.y - spr.anchorY * z;
  const fullH = spr.h * z;
  // bina alttan yukarı "yükselir": yalnız alt kısmı çiz (clip)
  const visibleH = fullH * (0.15 + 0.85 * prog);
  ctx.save();
  ctx.beginPath();
  ctx.rect(drawX - z, drawY + (fullH - visibleH), spr.w * z + 2 * z, visibleH + z);
  ctx.clip();
  ctx.globalAlpha = 0.55 + 0.45 * prog;
  ctx.drawImage(spr.cnv, drawX, drawY, spr.w * z, fullH);
  ctx.globalAlpha = 1;
  ctx.restore();
  // iskele direkleri
  ctx.strokeStyle = '#8a6a42';
  ctx.lineWidth = 1.4 * z;
  const poleH = fullH * 0.8;
  for (const off of [-0.42, 0.42]) {
    const px = c.x + off * spr.w * z;
    ctx.beginPath();
    ctx.moveTo(px, c.y + 4 * z);
    ctx.lineTo(px, c.y + 4 * z - poleH);
    ctx.stroke();
  }
  // yatay kalas
  ctx.beginPath();
  ctx.moveTo(c.x - 0.42 * spr.w * z, c.y + 4 * z - poleH * 0.7);
  ctx.lineTo(c.x + 0.42 * spr.w * z, c.y + 4 * z - poleH * 0.7);
  ctx.stroke();
  // ilerleme çubuğu
  drawProgressBar(f, c.x, drawY - 4 * z, prog, '#d9a441');
  f.stats.sprites++;
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

  // binalar + köylüler + hayvanlar karo kovalarına (yalnız görünür alan)
  const bMap = new Map<number, Building>();
  const vMap = new Map<number, Villager[]>();
  const cMap = new Map<number, Creature[]>();
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
    for (const c of sim.wildlife.creatures) {
      const ix = c.x | 0, iy = c.y | 0;
      if (ix < minGx - 1 || ix > maxGx + 1 || iy < minGy - 1 || iy > maxGy + 1) continue;
      const i = iy * world.W + ix;
      let arr = cMap.get(i);
      if (!arr) { arr = []; cMap.set(i, arr); }
      arr.push(c);
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

      // ağaçlar: orman/iğne orman karolarına deterministik dikim
      const biome = world.tiles[i];
      if ((biome === 'forest' || biome === 'taiga') && !bMap.has(i) && f.treeSprites.length) {
        const count = 1 + (tileHash(i) & 1);
        for (let k = 0; k < count; k++) {
          const hk = tileHash(i * 3 + k + 1);
          const variant = biome === 'taiga' ? 2 : (hk % 7 === 0 ? 2 : hk % 2);
          const tr = f.treeSprites[variant % f.treeSprites.length];
          const sc = 0.62 + (((hk >>> 20) & 63) / 63) * 0.3;
          const ox = ((((hk >>> 4) & 255) / 255) - 0.5) * TILE_W * 0.44 * z;
          const oy = ((((hk >>> 12) & 255) / 255) - 0.5) * TILE_H * 0.4 * z + 2 * z;
          ctx.drawImage(
            tr.cnv,
            c.x + ox - (tr.w / 2) * sc * z,
            c.y + oy - tr.baseY * sc * z,
            tr.w * sc * z,
            tr.h * sc * z,
          );
          f.stats.sprites++;
        }
      }

      // AI başkenti
      if (owner && owner.cx === gx && owner.cy === gy) {
        drawCapital(f, c.x, c.y, owner.color);
      }

      // bina (şantiye: yükselen görsel + ilerleme çubuğu)
      const b = bMap.get(i);
      if (b) {
        const bspr = f.bSprites.get(b.type);
        if (bspr) {
          if (b.buildLeft !== undefined && !b.upgrading) {
            const prog = 1 - b.buildLeft / (b.buildTotal ?? 1);
            drawConstruction(f, bspr, gx, gy, h, prog);
          } else {
            drawBuildingSprite(f, bspr, gx, gy, h);
            if (b.upgrading && b.buildLeft !== undefined) {
              const prog = 1 - b.buildLeft / (b.buildTotal ?? 1);
              drawProgressBar(f, c.x, c.y - 30 * z, prog, '#7fb3d5');
            }
          }
        }
        if (b.burning) drawFlames(f, c.x, c.y);
      }

      // bu karodaki köylüler + hayvanlar (yalnız görüş alanında)
      if (visLevel === 2) {
        const cs = cMap.get(i);
        if (cs) for (const cr of cs) drawCreature(f, cr);
        const vs = vMap.get(i);
        if (vs) for (const v of vs) drawVillager(f, v);
      }

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
    // ---- ticaret kervanları ----
    for (const cv of sim.caravans.caravans) {
      const ix = cv.x | 0, iy = cv.y | 0;
      if (!world.inBounds(ix, iy)) continue;
      if (sim.vis[world.idx(ix, iy)] === 0) continue;
      const rx = cv.px + (cv.x - cv.px) * f.alpha;
      const ry = cv.py + (cv.y - cv.py) * f.alpha;
      const h = world.height[world.idx(ix, iy)];
      const c = cam.worldToScreen(rx - 0.5, ry - 0.5, h);
      drawCaravan(f, c.x, c.y, cv.kcolor);
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

  // ---- atmosfer örtüleri: mevsim tonu + gündüz/gece ----
  if (sim) {
    const seasonTint = sim.currentSeason().tint;
    if (seasonTint) {
      ctx.fillStyle = seasonTint;
      ctx.fillRect(0, 0, view.w, view.h);
    }
    const tint = dayTint(sim.time.t);
    if (tint) {
      const [r, g, b, a] = tint;
      ctx.fillStyle = `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a})`;
      ctx.fillRect(0, 0, view.w, view.h);
    }
  }
}
