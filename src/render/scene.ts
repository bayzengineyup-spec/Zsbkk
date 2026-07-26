/* ============================================================
   SAHNE ÇİZİMİ — görünür alan taraması + hazır sprite'lar
   Performans ilkeleri (prototipten):
   1. Sadece ekranda görünen karolar taranır
   2. Karolar/binalar hazır sprite (drawImage) ile çizilir
   3. Çizim sırası: uzaktan yakına (gx+gy köşegenleri)
   4. Köylüler karo kovalarına konur (karo başına liste taranmaz)
   ============================================================ */
import type { World } from '../core/world';
import { isActive, type Sim, type Building, type Villager } from '../core/sim';
import type { Creature } from '../core/wildlife';
import type { BuildingType } from '../data/buildings';
import { BIOMES, type ResourceKind } from '../data/biomes';
import { SPECIES } from '../data/species';
import { Camera, TILE_W, TILE_H, type Viewport } from './camera';
import { shadeBucket, DETAIL_VARIANTS, type TileSprite, type TreeSprite } from './tiles';
import {
  BUILDING_SCALE, MILL_HUB, SMOKE_VENTS, CAPITAL_FLAG, type BuildingSprite,
} from './buildings';
import { dayTint } from './daynight';
import { shade } from './paint';

export interface TileSel { gx: number; gy: number; }

export interface Ghost {
  type: BuildingType;
  gx: number;
  gy: number;
  valid: boolean;
}

/* büyük ton yamalarının uygulandığı "çayır ailesi" biyomları */
const GRASSY = new Set<string>(['grass', 'savanna', 'forest', 'taiga', 'swamp']);

/* iş yeri → köylünün salladığı alet */
const WORK_TOOLS: Partial<Record<BuildingType, 'axe' | 'pick' | 'hoe'>> = {
  woodcutter: 'axe', lumbermill: 'axe',
  quarry: 'pick', mine: 'pick',
  farm: 'hoe',
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

/* biyom kenarı yumuşatma yönleri: [dx, dy, kenar anahtarı] */
const EDGE_DIRS: Array<[number, number, string]> = [
  [0, -1, 'eNE'], [1, 0, 'eSE'], [0, 1, 'eSW'], [-1, 0, 'eNW'],
];

export interface Frame {
  ctx: CanvasRenderingContext2D;
  world: World;
  cam: Camera;
  view: Viewport;
  tileSprites: Map<string, TileSprite>;
  bSprites: Map<BuildingType, BuildingSprite>;
  treeSprites: TreeSprite[];
  capSprite: BuildingSprite;
  /** dünya uzayında sürekli çayır ton haritası (-1..1, kozmetik) */
  tintMap: Float32Array | null;
  resIcons: Map<ResourceKind, TileSprite>;
  terrain: TerrainCache;
  /** haritada seçili oyuncu ordusu (vurgu halkası) */
  armySel: number | null;
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

/** Hayvan v2: eklemli bacaklar, kuyruk, kulak, burun — onaylanan stil. */
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
  const s = c.scale * z * 0.6;
  const dir = c.flip ? -1 : 1;
  const moving = Math.abs(c.x - c.px) + Math.abs(c.y - c.py) > 0.001;
  const walk = moving ? Math.sin(c.bob * 4) : 0;
  const bodyY = p.y - S.hgt * 0.66 * s;

  // gölge
  ctx.fillStyle = 'rgba(0,0,0,0.24)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 1 * z, S.len * 0.52 * s, S.hgt * 0.22 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // bacaklar: iki segmentli (kalça→diz→toynak), çaprazlar birlikte salınır
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const front = i >= 2;
    const hipX = p.x + (front ? 1 : -1) * S.len * 0.3 * s * dir + (i % 2 ? 1.3 * s : -0.6 * s);
    const sw = walk * 2 * s * ((i + (front ? 1 : 0)) % 2 ? 1 : -1);
    const kneeX = hipX + sw * 0.45;
    const kneeY = p.y - S.hgt * 0.28 * s;
    ctx.strokeStyle = i % 2 ? shade(S.dark, 0.8) : S.dark;
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(hipX, bodyY + S.hgt * 0.2 * s);
    ctx.lineTo(kneeX, kneeY);
    ctx.lineTo(hipX + sw, p.y + 0.6 * z);
    ctx.stroke();
  }

  // kuyruk
  ctx.strokeStyle = S.dark;
  ctx.lineWidth = 1.1 * s;
  ctx.beginPath();
  ctx.moveTo(p.x - S.len * 0.5 * s * dir, bodyY - S.hgt * 0.1 * s);
  ctx.quadraticCurveTo(
    p.x - S.len * 0.68 * s * dir, bodyY + (c.sp === 'wolf' ? 0.2 : -0.25) * S.hgt * s,
    p.x - S.len * (c.sp === 'wolf' ? 0.75 : 0.62) * s * dir,
    bodyY + S.hgt * (c.sp === 'wolf' ? 0.34 : 0.12) * s,
  );
  ctx.stroke();

  // gövde: üstü aydınlık degrade elips
  const bg = ctx.createLinearGradient(0, bodyY - S.hgt * 0.45 * s, 0, bodyY + S.hgt * 0.45 * s);
  bg.addColorStop(0, shade(S.body, 1.14));
  bg.addColorStop(0.55, S.body);
  bg.addColorStop(1, shade(S.body, 0.78));
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.ellipse(p.x, bodyY, S.len * 0.5 * s, S.hgt * 0.44 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // karın
  ctx.fillStyle = S.belly;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.ellipse(p.x, bodyY + S.hgt * 0.22 * s, S.len * 0.36 * s, S.hgt * 0.18 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // boyun + kafa
  const hx = p.x + S.len * 0.54 * s * dir;
  const hy = bodyY - S.hgt * 0.36 * s + walk * 0.5 * s;
  ctx.strokeStyle = S.body;
  ctx.lineWidth = S.hgt * 0.34 * s;
  ctx.beginPath();
  ctx.moveTo(p.x + S.len * 0.34 * s * dir, bodyY - S.hgt * 0.1 * s);
  ctx.lineTo(hx, hy);
  ctx.stroke();
  ctx.fillStyle = shade(S.body, 1.06);
  ctx.beginPath();
  ctx.arc(hx, hy, S.hgt * 0.3 * s, 0, Math.PI * 2);
  ctx.fill();
  // burun
  ctx.fillStyle = shade(S.body, 0.92);
  ctx.beginPath();
  ctx.ellipse(hx + S.hgt * 0.3 * s * dir, hy + S.hgt * 0.08 * s, S.hgt * 0.2 * s, S.hgt * 0.13 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1c1410';
  ctx.beginPath();
  ctx.arc(hx + S.hgt * 0.46 * s * dir, hy + S.hgt * 0.06 * s, 0.5 * s, 0, Math.PI * 2);
  ctx.fill();
  // göz
  ctx.beginPath();
  ctx.arc(hx + S.hgt * 0.08 * s * dir, hy - S.hgt * 0.08 * s, 0.45 * s, 0, Math.PI * 2);
  ctx.fill();
  // kulaklar (tavşanda uzun)
  const earL = c.sp === 'rabbit' ? 1.1 : 0.4;
  ctx.strokeStyle = S.dark;
  ctx.lineWidth = 0.9 * s;
  for (const eo of [-0.12, 0.1]) {
    ctx.beginPath();
    ctx.moveTo(hx - S.hgt * 0.08 * s * dir + eo * S.hgt * s, hy - S.hgt * 0.24 * s);
    ctx.lineTo(hx - S.hgt * (0.2 - eo) * s * dir + eo * S.hgt * s, hy - S.hgt * (0.24 + earL) * s);
    ctx.stroke();
  }
  // geyik boynuzu
  if (c.sp === 'deer') {
    ctx.strokeStyle = '#8a6a42';
    ctx.lineWidth = 0.7 * s;
    for (const bo of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(hx + bo * S.hgt * 0.1 * s, hy - S.hgt * 0.26 * s);
      ctx.lineTo(hx + bo * S.hgt * 0.3 * s, hy - S.hgt * 0.7 * s);
      ctx.moveTo(hx + bo * S.hgt * 0.2 * s, hy - S.hgt * 0.48 * s);
      ctx.lineTo(hx + bo * S.hgt * 0.42 * s, hy - S.hgt * 0.62 * s);
      ctx.stroke();
    }
  }
}

/** Ticaret kervanı v2: at + damarlı ahşap araba + kasnaklı tente + flama. */
function drawCaravan(f: Frame, sx: number, sy: number, color: string): void {
  const { ctx } = f;
  const z = f.cam.zoom;
  const trot = Math.sin(f.t * 10 + sx * 0.05); // tırıs salınımı
  // gölge
  ctx.fillStyle = 'rgba(0,0,0,0.26)';
  ctx.beginPath();
  ctx.ellipse(sx + 2 * z, sy + 1 * z, 11 * z, 2.6 * z, 0, 0, Math.PI * 2);
  ctx.fill();

  // ---- çeken at (sağda) ----
  const hx = sx + 10 * z, hyB = sy - 4 * z;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#4a3826';
  ctx.lineWidth = 1.3 * z;
  for (let i = 0; i < 4; i++) {
    const lx = hx + (i < 2 ? -2.4 : 2.2) * z + (i % 2 ? 0.8 : -0.4) * z;
    const sw2 = trot * 1.6 * z * (i % 2 ? 1 : -1);
    ctx.beginPath(); ctx.moveTo(lx, hyB); ctx.lineTo(lx + sw2, sy + 0.6 * z); ctx.stroke();
  }
  const hg = ctx.createLinearGradient(0, hyB - 3.4 * z, 0, hyB + 2 * z);
  hg.addColorStop(0, '#8a6642'); hg.addColorStop(1, '#5f4426');
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.ellipse(hx, hyB - 1.4 * z, 4.4 * z, 2.6 * z, 0, 0, Math.PI * 2); ctx.fill();
  // boyun + kafa + yele
  ctx.strokeStyle = '#7a5836'; ctx.lineWidth = 2 * z;
  ctx.beginPath(); ctx.moveTo(hx + 3.4 * z, hyB - 2.4 * z); ctx.lineTo(hx + 5.6 * z, hyB - 5.6 * z); ctx.stroke();
  ctx.fillStyle = '#7a5836';
  ctx.beginPath(); ctx.ellipse(hx + 6.6 * z, hyB - 6 * z, 2.2 * z, 1.3 * z, 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 0.9 * z;
  ctx.beginPath(); ctx.moveTo(hx + 3.2 * z, hyB - 2.6 * z); ctx.lineTo(hx + 5.2 * z, hyB - 6 * z); ctx.stroke();
  // kuyruk
  ctx.beginPath(); ctx.moveTo(hx - 4.2 * z, hyB - 2 * z);
  ctx.quadraticCurveTo(hx - 5.6 * z, hyB, hx - 5 * z, hyB + 2 * z); ctx.stroke();
  // ok kolu (at → araba)
  ctx.strokeStyle = '#5a4126'; ctx.lineWidth = 0.9 * z;
  ctx.beginPath(); ctx.moveTo(sx + 4 * z, sy - 3 * z); ctx.lineTo(hx - 3 * z, hyB - 0.6 * z); ctx.stroke();

  // ---- araba ----
  // arka teker (büyük, parmaklıklı) — döner
  const wheel = (wx: number, wy: number, r: number) => {
    ctx.fillStyle = '#3f2f1c';
    ctx.beginPath(); ctx.arc(wx, wy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a6a42'; ctx.lineWidth = 0.8 * z;
    const rot = f.t * 2.2;
    for (let k = 0; k < 4; k++) {
      const a = rot + (k * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(wx - Math.cos(a) * r * 0.8, wy - Math.sin(a) * r * 0.8);
      ctx.lineTo(wx + Math.cos(a) * r * 0.8, wy + Math.sin(a) * r * 0.8);
      ctx.stroke();
    }
    ctx.strokeStyle = '#2a1e10'; ctx.lineWidth = 1.1 * z;
    ctx.beginPath(); ctx.arc(wx, wy, r, 0, Math.PI * 2); ctx.stroke();
  };
  // kasa: damarlı ahşap
  const cg = ctx.createLinearGradient(0, sy - 8 * z, 0, sy - 2 * z);
  cg.addColorStop(0, '#8a6642'); cg.addColorStop(1, '#5f4426');
  ctx.fillStyle = cg;
  ctx.fillRect(sx - 7 * z, sy - 8 * z, 12 * z, 6 * z);
  ctx.strokeStyle = 'rgba(30,20,10,0.5)'; ctx.lineWidth = 0.5 * z;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(sx - 7 * z, sy - 8 * z + i * 2 * z);
    ctx.lineTo(sx + 5 * z, sy - 8 * z + i * 2 * z);
    ctx.stroke();
  }
  // tente: krem kumaş + kasnak çizgileri
  const tg = ctx.createLinearGradient(0, sy - 13 * z, 0, sy - 7 * z);
  tg.addColorStop(0, '#e8ddc2'); tg.addColorStop(1, '#bfae8c');
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.ellipse(sx - 1 * z, sy - 8 * z, 6.6 * z, 4.6 * z, 0, Math.PI, 0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,70,40,0.4)'; ctx.lineWidth = 0.6 * z;
  for (const ox of [-4, -1, 2]) {
    ctx.beginPath();
    ctx.ellipse(sx + ox * z, sy - 8 * z, 2 * z, 4.4 * z, 0, Math.PI, 0, true);
    ctx.stroke();
  }
  wheel(sx - 4 * z, sy - 0.6 * z, 3 * z);
  wheel(sx + 3.4 * z, sy, 2.4 * z);
  // krallık flaması
  ctx.strokeStyle = '#2c241c'; ctx.lineWidth = z;
  ctx.beginPath(); ctx.moveTo(sx - 6 * z, sy - 9 * z); ctx.lineTo(sx - 6 * z, sy - 16 * z); ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(sx - 6 * z, sy - 16 * z);
  ctx.lineTo(sx - 2 * z, sy - 14.7 * z);
  ctx.lineTo(sx - 6 * z, sy - 13.5 * z);
  ctx.closePath();
  ctx.fill();
}

/** Tek asker: kollu-bacaklı, miğferli, mızrak+kalkanlı (onaylanan stil). */
function drawSoldier(
  f: Frame, sx: number, sy: number, phase: number, color: string, shield: boolean,
): void {
  const { ctx } = f;
  const z = f.cam.zoom;
  const walk = Math.sin(f.t * 9 + phase);
  const bob = Math.abs(walk) * 0.5 * z;
  const footY = sy + 0.8 * z;
  const hipY = footY - 4.6 * z - bob;
  const shoY = hipY - 4.2 * z;
  ctx.lineCap = 'round';
  // bacaklar
  ctx.strokeStyle = '#3a2c1c';
  ctx.lineWidth = 1.4 * z;
  ctx.beginPath();
  ctx.moveTo(sx - 0.8 * z, hipY);
  ctx.lineTo(sx - 0.8 * z + walk * 1.8 * z, footY);
  ctx.moveTo(sx + 0.8 * z, hipY);
  ctx.lineTo(sx + 0.8 * z - walk * 1.8 * z, footY);
  ctx.stroke();
  // gövde: deri yelek + krallık renkli tunik şeridi
  ctx.fillStyle = '#5a4632';
  ctx.beginPath();
  ctx.moveTo(sx - 2.1 * z, hipY + 0.5 * z);
  ctx.lineTo(sx + 2.1 * z, hipY + 0.5 * z);
  ctx.lineTo(sx + 1.6 * z, shoY);
  ctx.lineTo(sx - 1.6 * z, shoY);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(sx - 1.9 * z, shoY + 1.2 * z, 3.8 * z, 1.3 * z);
  ctx.globalAlpha = 1;
  // kollar
  ctx.strokeStyle = '#4c3a28';
  ctx.lineWidth = 1.1 * z;
  ctx.beginPath();
  ctx.moveTo(sx - 1.6 * z, shoY + 0.8 * z);
  ctx.lineTo(sx - 2.2 * z + walk * 1.2 * z, hipY - 0.4 * z);
  ctx.stroke();
  // mızrak tutan kol + mızrak
  ctx.beginPath();
  ctx.moveTo(sx + 1.6 * z, shoY + 0.8 * z);
  ctx.lineTo(sx + 2.4 * z, shoY + 2 * z);
  ctx.stroke();
  ctx.strokeStyle = '#8a7048';
  ctx.lineWidth = 0.7 * z;
  ctx.beginPath();
  ctx.moveTo(sx + 2.4 * z, sy + 0.5 * z);
  ctx.lineTo(sx + 2.4 * z, shoY - 6.5 * z);
  ctx.stroke();
  ctx.fillStyle = '#b8bec6';
  ctx.beginPath();
  ctx.moveTo(sx + 2.4 * z, shoY - 8.2 * z);
  ctx.lineTo(sx + 3.1 * z, shoY - 6.2 * z);
  ctx.lineTo(sx + 1.7 * z, shoY - 6.2 * z);
  ctx.closePath(); ctx.fill();
  // kalkan (soldaki figürlerde)
  if (shield) {
    ctx.fillStyle = '#6b4a28';
    ctx.beginPath();
    ctx.ellipse(sx - 2.6 * z, hipY - 1.4 * z, 1.5 * z, 2 * z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3a2814';
    ctx.lineWidth = 0.5 * z;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(sx - 2.6 * z, hipY - 1.4 * z, 0.6 * z, 0, Math.PI * 2);
    ctx.fill();
  }
  // kafa + miğfer
  const headY = shoY - 1.9 * z;
  ctx.fillStyle = '#e8c298';
  ctx.beginPath();
  ctx.arc(sx, headY, 1.7 * z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#9aa2ac';
  ctx.beginPath();
  ctx.arc(sx, headY - 0.3 * z, 1.75 * z, Math.PI * 1.02, Math.PI * 1.98);
  ctx.closePath(); ctx.fill();
  ctx.fillRect(sx - 1.75 * z, headY - 0.5 * z, 3.5 * z, 0.5 * z);
}

/** Yürüyen ordu v2: kollu-bacaklı asker kümesi + sancak + sayı rozeti. */
function drawArmy(f: Frame, sx: number, sy: number, color: string, size: number): void {
  const { ctx } = f;
  const z = f.cam.zoom;
  // gölge
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + 1.5 * z, 8.5 * z, 3 * z, 0, 0, Math.PI * 2);
  ctx.fill();
  // asker kümesi (arkadan öne)
  drawSoldier(f, sx, sy - 2.2 * z, 2.1, color, false);
  drawSoldier(f, sx - 4.8 * z, sy, 0, color, true);
  drawSoldier(f, sx + 4.8 * z, sy, 4.2, color, false);
  // sancak
  ctx.strokeStyle = '#2c241c';
  ctx.lineWidth = 1.2 * z;
  ctx.beginPath();
  ctx.moveTo(sx - 7.5 * z, sy - 3 * z);
  ctx.lineTo(sx - 7.5 * z, sy - 18 * z);
  ctx.stroke();
  const wv = Math.sin(f.t * 5) * 0.8 * z; // bayrak dalgası
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(sx - 7.5 * z, sy - 18 * z);
  ctx.quadraticCurveTo(sx - 4.5 * z, sy - 17.5 * z + wv, sx - 1.5 * z, sy - 16.5 * z);
  ctx.quadraticCurveTo(sx - 4.5 * z, sy - 15.5 * z + wv, sx - 7.5 * z, sy - 14 * z);
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

/** AI krallık başkenti: bake edilmiş taş kale + krallık renkli dalgalı bayrak. */
function drawCapital(f: Frame, sx: number, sy: number, color: string): void {
  const { ctx } = f;
  const z = f.cam.zoom;
  const spr = f.capSprite;
  const drawX = sx - (spr.w / 2) * z;
  const drawY = sy - spr.anchorY * z;
  ctx.drawImage(spr.cnv, drawX, drawY, spr.w * z, spr.h * z);
  f.stats.sprites++;
  // bayrak: direk ucundan krallık renginde, hafif dalgalı
  const K = BUILDING_SCALE;
  const fx = drawX + CAPITAL_FLAG.x * K * z;
  const fy = drawY + CAPITAL_FLAG.y * K * z;
  const wv = Math.sin(f.t * 4 + sx * 0.03) * 0.8 * z;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(fx, fy);
  ctx.quadraticCurveTo(fx + 4.5 * z, fy + 0.8 * z + wv, fx + 9 * z, fy + 1.6 * z);
  ctx.quadraticCurveTo(fx + 4.5 * z, fy + 2.6 * z + wv, fx, fy + 3.6 * z);
  ctx.closePath();
  ctx.fill();
}

/** Baca dumanı (kozmetik): yükselen, büyüyüp sönen 3 parçacık. */
function drawSmoke(f: Frame, sx: number, sy: number, seed: number): void {
  const { ctx } = f;
  const z = f.cam.zoom;
  for (let k = 0; k < 3; k++) {
    const ph = (f.t * 0.3 + seed * 0.137 + k / 3) % 1;
    const r = (1.6 + ph * 5) * z;
    const a = (1 - ph) * 0.26;
    const dx = Math.sin(f.t * 0.9 + seed + k * 2.1) * 1.6 * z + ph * 5 * z;
    ctx.fillStyle = `rgba(205,200,192,${a})`;
    ctx.beginPath();
    ctx.arc(sx + dx, sy - ph * 24 * z, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Değirmen kanatları: sahnede döner (sprite'a bake edilmez). */
function drawMillBlades(f: Frame, hubX: number, hubY: number): void {
  const { ctx } = f;
  const z = f.cam.zoom;
  const K = BUILDING_SCALE;
  const L = MILL_HUB.r * K * z;
  const rot = f.t * 0.55;
  for (let i = 0; i < 4; i++) {
    const a = rot + (i * Math.PI) / 2;
    const ca = Math.cos(a), sa = Math.sin(a);
    const ex = hubX + ca * L, ey = hubY + sa * L;
    ctx.strokeStyle = '#4c3a22';
    ctx.lineWidth = 2 * K * z;
    ctx.beginPath(); ctx.moveTo(hubX, hubY); ctx.lineTo(ex, ey); ctx.stroke();
    // kafes bez yüzey
    const px = Math.cos(a + Math.PI / 2) * 5 * K * z;
    const py = Math.sin(a + Math.PI / 2) * 5 * K * z;
    const inX = hubX + ca * L * 0.2, inY = hubY + sa * L * 0.2;
    ctx.strokeStyle = 'rgba(225,215,190,0.85)';
    ctx.lineWidth = 0.8 * K * z;
    ctx.beginPath();
    ctx.moveTo(inX, inY);
    ctx.lineTo(inX + px, inY + py);
    ctx.lineTo(ex + px, ey + py);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    for (let s2 = 1; s2 < 4; s2++) {
      const t = 0.2 + (s2 / 4) * 0.8;
      ctx.beginPath();
      ctx.moveTo(hubX + ca * L * t, hubY + sa * L * t);
      ctx.lineTo(hubX + ca * L * t + px, hubY + sa * L * t + py);
      ctx.stroke();
    }
  }
  // göbek
  ctx.fillStyle = '#3f2f1c';
  ctx.beginPath(); ctx.arc(hubX, hubY, 1.6 * K * z, 0, Math.PI * 2); ctx.fill();
}

/** Köylü: kollu-bacaklı yürüyen insan (onaylanan stil — mockup2 person()).
    İş yerinin başında duruyorsa aletini sallar (odun kesme/çapa/kazma). */
function drawVillager(f: Frame, v: Villager, work?: BuildingType): void {
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

  const tool = work ? WORK_TOOLS[work] : undefined;
  const working = !!tool && !moving;
  if (working) {
    // sol kol sarkık
    ctx.strokeStyle = shade(tunic, 0.78);
    ctx.lineWidth = 1.2 * z;
    ctx.beginPath();
    ctx.moveTo(c.x - 1.8 * z, shoulderY + 0.8 * z);
    ctx.lineTo(c.x - 2.1 * z, hipY - 0.2 * z);
    ctx.stroke();
    // alet kolu: omuzdan vuruş salınımı (yukarı kalk → öne in)
    const swing = Math.sin(f.t * 6 + v.id * 1.3);
    const ang = -0.35 - (swing * 0.5 + 0.5) * 1.15;
    const shX = c.x + 1.6 * z, shY = shoulderY + 0.8 * z;
    const armL = 2.6 * z;
    const hx2 = shX + Math.cos(ang) * armL, hy2 = shY + Math.sin(ang) * armL;
    ctx.beginPath();
    ctx.moveTo(shX, shY);
    ctx.lineTo(hx2, hy2);
    ctx.stroke();
    // alet sapı
    const tL = 3.4 * z;
    const tx2 = hx2 + Math.cos(ang) * tL, ty2 = hy2 + Math.sin(ang) * tL;
    ctx.strokeStyle = '#8a6a3a';
    ctx.lineWidth = 0.8 * z;
    ctx.beginPath();
    ctx.moveTo(hx2, hy2);
    ctx.lineTo(tx2, ty2);
    ctx.stroke();
    // alet başı
    if (tool === 'axe') {
      ctx.fillStyle = '#9aa0a8';
      ctx.beginPath();
      ctx.moveTo(tx2, ty2);
      ctx.lineTo(tx2 + Math.cos(ang + 1.4) * 1.9 * z, ty2 + Math.sin(ang + 1.4) * 1.9 * z);
      ctx.lineTo(tx2 + Math.cos(ang + 0.7) * 2.4 * z, ty2 + Math.sin(ang + 0.7) * 2.4 * z);
      ctx.closePath();
      ctx.fill();
    } else if (tool === 'pick') {
      ctx.strokeStyle = '#7c828a';
      ctx.lineWidth = 0.9 * z;
      ctx.beginPath();
      ctx.arc(tx2, ty2, 1.7 * z, ang + 0.6, ang + 2.5);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#6b6f75';
      ctx.save();
      ctx.translate(tx2, ty2);
      ctx.rotate(ang + 1.2);
      ctx.fillRect(-0.5 * z, 0, 1 * z, 2 * z);
      ctx.restore();
    }
    // el
    ctx.fillStyle = '#e0b88c';
    ctx.beginPath();
    ctx.arc(hx2, hy2, 0.65 * z, 0, Math.PI * 2);
    ctx.fill();
  } else {
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
  }

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

/* ============================================================
   ARAZİ ÖN-BELLEĞİ — arazi statiktir (taban + biyom kenarı +
   detay + ton yaması). Ekran + kenar payı bir offscreen tuvale
   BİR KEZ boyanır; her karede tek drawImage ile basılır.
   Kaydırma kenar payını aşınca veya zoom değişince yeniden boyanır.
   Sis / toprak tonu / nesneler dinamiktir, ön-belleğe girmez.
   ============================================================ */
export class TerrainCache {
  private cnv = document.createElement('canvas');
  private tctx: CanvasRenderingContext2D | null = null;
  private bx = 0;
  private by = 0;
  private zoom = -1;
  private margin = 0;
  private valid = false;

  /** Dünya değişince (yeni oyun / kayıt yükleme) çağrılır. */
  invalidate(): void { this.valid = false; }

  /** Gerekirse yeniden boya, sonra ana tuvale tek çizimde bas. */
  draw(f: Frame): void {
    const { cam, view, ctx } = f;
    const M = Math.ceil(TILE_W * 2.5 * cam.zoom) + 8; // kenar payı (iç px)
    const W = view.w + M * 2, H = view.h + M * 2;
    if (
      !this.valid || this.zoom !== cam.zoom
      || this.cnv.width !== W || this.cnv.height !== H
      || Math.abs(cam.x - this.bx) > M || Math.abs(cam.y - this.by) > M
    ) {
      this.rebake(f, M, W, H);
    }
    ctx.drawImage(this.cnv, this.bx - cam.x - this.margin, this.by - cam.y - this.margin);
  }

  private rebake(f: Frame, M: number, W: number, H: number): void {
    const { cam, view, world } = f;
    if (this.cnv.width !== W || this.cnv.height !== H) {
      this.cnv.width = W; this.cnv.height = H;
      this.tctx = null;
    }
    const t = this.tctx ?? (this.tctx = this.cnv.getContext('2d')!);
    t.fillStyle = '#0d0a07';
    t.fillRect(0, 0, W, H);

    const z = cam.zoom;
    const Mcss = M / view.dpr;
    const cssW = view.w / view.dpr, cssH = view.h / view.dpr;
    const corners = [
      cam.screenToWorld(-Mcss, -Mcss), cam.screenToWorld(cssW + Mcss, -Mcss),
      cam.screenToWorld(-Mcss, cssH + Mcss), cam.screenToWorld(cssW + Mcss, cssH + Mcss),
    ];
    let minGx = Infinity, maxGx = -Infinity, minGy = Infinity, maxGy = -Infinity;
    for (const c of corners) {
      if (c.gx < minGx) minGx = c.gx;
      if (c.gx > maxGx) maxGx = c.gx;
      if (c.gy < minGy) minGy = c.gy;
      if (c.gy > maxGy) maxGy = c.gy;
    }
    minGx = Math.max(0, minGx - 3); maxGx = Math.min(world.W - 1, maxGx + 3);
    minGy = Math.max(0, minGy - 3); maxGy = Math.min(world.H - 1, maxGy + 3);

    const halfWz = (TILE_W / 2) * z, halfHz = (TILE_H / 2) * z;
    for (let s = minGx + minGy; s <= maxGx + maxGy; s++) {
      const gxS = Math.max(minGx, s - maxGy), gxE = Math.min(maxGx, s - minGy);
      for (let gx = gxS; gx <= gxE; gx++) {
        const gy = s - gx;
        const i = world.idx(gx, gy);
        const h = world.height[i];
        const biome = world.tiles[i];
        const spr = f.tileSprites.get(`${biome}:${shadeBucket(h)}`);
        if (!spr) continue;
        const p = cam.worldToScreen(gx, gy, h);
        const px = p.x + M, py = p.y + M;
        if (px < -TILE_W * z || px > W + TILE_W * z) continue;
        if (py < -TILE_H * 3 * z || py > H + TILE_H * 3 * z) continue;
        // taban (0.75px taşma: dikiş örtme)
        t.drawImage(spr.cnv, px - halfWz - 0.75, py - halfHz - 0.75, spr.w * z + 1.5, spr.h * z + 1.5);
        // biyom sınırı yumuşatma
        if (!BIOMES[biome].water) {
          for (const [dx, dy, ek] of EDGE_DIRS) {
            const nx = gx + dx, ny = gy + dy;
            if (!world.inBounds(nx, ny)) continue;
            const nb = world.tiles[world.idx(nx, ny)];
            if (nb === biome || BIOMES[nb].water) continue;
            const eSpr = f.tileSprites.get(`${nb}:${ek}`);
            if (eSpr) {
              t.drawImage(eSpr.cnv, px - halfWz - 0.75, py - halfHz - 0.75, eSpr.w * z + 1.5, eSpr.h * z + 1.5);
            }
          }
        }
        // detay varyantı
        if (z >= 0.75) {
          const det = f.tileSprites.get(`${biome}:d${tileHash(i) % DETAIL_VARIANTS}`);
          if (det) {
            t.drawImage(det.cnv, px - halfWz - 0.75, py - halfHz - 0.75, det.w * z + 1.5, det.h * z + 1.5);
          }
        }
        // büyük ton yaması
        if (f.tintMap && GRASSY.has(biome)) {
          const tv = f.tintMap[i];
          if (tv > 0.08) {
            diamondPath(t, px, py, halfWz + 1, halfHz + 1);
            t.fillStyle = `rgba(198,182,86,${Math.min(0.12, (tv - 0.08) * 0.34)})`;
            t.fill();
          } else if (tv < -0.08) {
            diamondPath(t, px, py, halfWz + 1, halfHz + 1);
            t.fillStyle = `rgba(14,50,24,${Math.min(0.13, (-tv - 0.08) * 0.34)})`;
            t.fill();
          }
        }
      }
    }
    this.bx = cam.x; this.by = cam.y;
    this.zoom = z; this.margin = M;
    this.valid = true;
  }
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
  const sMin = minGx + minGy, sMax = maxGx + maxGy;

  // ---- arazi: ön-bellekten TEK çizim (taban+kenar+detay+ton) ----
  f.terrain.draw(f);

  // ---- sis örtüsü: tüm elmaslar tek yolda, 2 doldurma ----
  if (sim) {
    const fills: Array<[number, string]> = [[0, '#0d0a07'], [1, 'rgba(13,10,7,0.5)']];
    for (const [lvl, style] of fills) {
      ctx.beginPath();
      let any = false;
      for (let s = sMin; s <= sMax; s++) {
        const gxS = Math.max(minGx, s - maxGy), gxE = Math.min(maxGx, s - minGy);
        for (let gx = gxS; gx <= gxE; gx++) {
          const gy = s - gx;
          const i = world.idx(gx, gy);
          if (sim.vis[i] !== lvl) continue;
          const p = cam.worldToScreen(gx, gy, world.height[i]);
          if (p.x < -TILE_W * z || p.x > view.w + TILE_W * z) continue;
          if (p.y < -TILE_H * 3 * z || p.y > view.h + TILE_H * 3 * z) continue;
          const hw = halfWz + 1.5, hh = halfHz + 1 + 2 * z;
          ctx.moveTo(p.x, p.y - halfHz - 1);
          ctx.lineTo(p.x + hw, p.y);
          ctx.lineTo(p.x, p.y + hh);
          ctx.lineTo(p.x - hw, p.y);
          ctx.closePath();
          any = true;
        }
      }
      if (any) { ctx.fillStyle = style; ctx.fill(); }
    }
  }

  // uzaktan yakına: köşegen sırası (yalnız dinamik nesneler)
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
      const biome = world.tiles[i];
      const c = cam.worldToScreen(gx, gy, h);
      if (c.x < -TILE_W * z || c.x > view.w + TILE_W * z) continue;
      if (c.y < -TILE_H * 3 * z || c.y > view.h + TILE_H * 3 * z) continue;
      const dim = visLevel === 1;
      if (dim) ctx.globalAlpha = 0.5; // keşfedilmiş ama görüş dışı: nesneler loş
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

      // kaynak işareti: minik el çizimi ikon (yakınlaşınca, bina yoksa)
      const res = world.res[i];
      if (res !== null && z >= 1.1 && !bMap.has(i)) {
        const icon = f.resIcons.get(res);
        if (icon) {
          ctx.drawImage(
            icon.cnv,
            c.x - (icon.w / 2) * z,
            c.y - (icon.h - 2.5) * z,
            icon.w * z,
            icon.h * z,
          );
        }
      }

      // ağaçlar: orman/iğne orman karolarına deterministik dikim
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
            // canlı ayrıntılar: dönen değirmen kanadı + baca dumanı
            if (isActive(b)) {
              const K = BUILDING_SCALE;
              if (b.type === 'mill') {
                drawMillBlades(
                  f,
                  c.x - (bspr.w / 2) * z + MILL_HUB.x * K * z,
                  c.y - bspr.anchorY * z + MILL_HUB.y * K * z,
                );
              }
              const vent = SMOKE_VENTS[b.type];
              if (vent && !dim) {
                drawSmoke(
                  f,
                  c.x - (bspr.w / 2) * z + vent.x * K * z,
                  c.y - bspr.anchorY * z + vent.y * K * z,
                  i % 97,
                );
              }
            }
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
        if (vs) {
          for (const v of vs) {
            const jb = v.job ? bMap.get(world.idx(v.job.bx, v.job.by)) : undefined;
            drawVillager(f, v, jb?.type);
          }
        }
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
      // seçili ordu: altın vurgu halkası
      if (f.armySel === a.id) {
        ctx.strokeStyle = '#d9a441';
        ctx.lineWidth = 2 * z;
        ctx.setLineDash([4 * z, 3 * z]);
        ctx.beginPath();
        ctx.ellipse(c.x, c.y + 0.5 * z, 11 * z, 4.5 * z, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
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
