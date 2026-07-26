/* ============================================================
   SAHNE ÇİZİMİ — görünür alan taraması + hazır sprite'lar
   Performans ilkeleri (prototipten):
   1. Sadece ekranda görünen karolar taranır
   2. Karolar hazır sprite (drawImage) ile çizilir
   3. Çizim sırası: uzaktan yakına (gx+gy köşegenleri)
   ============================================================ */
import type { World } from '../core/world';
import type { ResourceKind } from '../data/biomes';
import { Camera, TILE_W, TILE_H, type Viewport } from './camera';
import { shadeBucket, type TileSprite } from './tiles';

export interface TileSel { gx: number; gy: number; }

const RES_COLORS: Record<ResourceKind, string> = {
  'balık': '#5ec8e8', 'yiyecek': '#a8e05f', 'at': '#d9b38c', 'odun': '#8a5a2a',
  'altın': '#ffd700', 'taş': '#b0a89a', 'demir': '#c0c8d0', 'mermer': '#f0f0f5',
};

export interface RenderStats { tiles: number; }

export function drawScene(
  ctx: CanvasRenderingContext2D,
  world: World,
  cam: Camera,
  view: Viewport,
  sprites: Map<string, TileSprite>,
  sel: TileSel | null,
  stats: RenderStats,
): void {
  ctx.fillStyle = '#0d0a07';
  ctx.fillRect(0, 0, view.w, view.h);

  const z = cam.zoom;
  const cssW = view.w / view.dpr, cssH = view.h / view.dpr;

  // görünür karo aralığı: ekran köşelerinin tersine çevrimi + pay
  const corners = [
    cam.screenToWorld(0, 0),
    cam.screenToWorld(cssW, 0),
    cam.screenToWorld(0, cssH),
    cam.screenToWorld(cssW, cssH),
  ];
  const M = 3; // yükseklik/etek payı
  let minGx = Infinity, maxGx = -Infinity, minGy = Infinity, maxGy = -Infinity;
  for (const c of corners) {
    if (c.gx < minGx) minGx = c.gx;
    if (c.gx > maxGx) maxGx = c.gx;
    if (c.gy < minGy) minGy = c.gy;
    if (c.gy > maxGy) maxGy = c.gy;
  }
  minGx = Math.max(0, minGx - M); maxGx = Math.min(world.W - 1, maxGx + M);
  minGy = Math.max(0, minGy - M); maxGy = Math.min(world.H - 1, maxGy + M);

  let drawn = 0;
  const halfWz = (TILE_W / 2) * z, halfHz = (TILE_H / 2) * z;

  // uzaktan yakına: köşegen (gx+gy) artan sırada
  const sMin = minGx + minGy, sMax = maxGx + maxGy;
  for (let s = sMin; s <= sMax; s++) {
    const gxStart = Math.max(minGx, s - maxGy);
    const gxEnd = Math.min(maxGx, s - minGy);
    for (let gx = gxStart; gx <= gxEnd; gx++) {
      const gy = s - gx;
      const i = world.idx(gx, gy);
      const h = world.height[i];
      const spr = sprites.get(`${world.tiles[i]}:${shadeBucket(h)}`);
      if (!spr) continue;
      const c = cam.worldToScreen(gx, gy, h);
      // ekran dışıysa atla (dar kontrol — etek payı dahil)
      if (c.x < -TILE_W * z || c.x > view.w + TILE_W * z) continue;
      if (c.y < -TILE_H * 3 * z || c.y > view.h + TILE_H * 3 * z) continue;
      // 0.75px taşma: kesirli konumlarda sprite dikişlerini (ince koyu çizgi) örter
      ctx.drawImage(spr.cnv, c.x - halfWz - 0.75, c.y - halfHz - 0.75, spr.w * z + 1.5, spr.h * z + 1.5);
      drawn++;

      // kaynak işareti (yakınlaşınca görünür)
      const res = world.res[i];
      if (res !== null && z >= 1.1) {
        ctx.fillStyle = RES_COLORS[res];
        ctx.strokeStyle = 'rgba(0,0,0,0.55)';
        ctx.lineWidth = z;
        ctx.beginPath();
        ctx.arc(c.x, c.y, 3.2 * z, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
  }
  stats.tiles = drawn;

  // seçim vurgusu: altın elmas çerçeve
  if (sel && world.inBounds(sel.gx, sel.gy)) {
    const i = world.idx(sel.gx, sel.gy);
    const c = cam.worldToScreen(sel.gx, sel.gy, world.height[i]);
    ctx.strokeStyle = '#d9a441';
    ctx.lineWidth = 2 * z;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y - halfHz);
    ctx.lineTo(c.x + halfWz, c.y);
    ctx.lineTo(c.x, c.y + halfHz);
    ctx.lineTo(c.x - halfWz, c.y);
    ctx.closePath();
    ctx.stroke();
  }
}
