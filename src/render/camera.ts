/* ============================================================
   KAMERA + KOORDİNAT DÖNÜŞÜMÜ
   Prototipten birebir taşındı. Kamera iç (DPR çarpılı) piksel
   uzayında çalışır; clamp haritanın dışını asla göstermez.
   ============================================================ */
import type { World } from '../core/world';

export const TILE_W = 64;
export const TILE_H = 32;
export const WALL = 10;

/** Canvas iç boyutları + DPR — resize'da güncellenir, herkes referansı paylaşır. */
export interface Viewport { w: number; h: number; dpr: number; }

export class Camera {
  x = 0;
  y = 0;
  zoom = 1;
  readonly min = 0.5;
  readonly max = 2.4;

  constructor(private readonly view: Viewport) {}

  /** Dünya karosu (+yükseklik) → ekran (iç piksel). */
  worldToScreen(gx: number, gy: number, h: number): { x: number; y: number } {
    const z = this.zoom;
    const sx = (gx - gy) * (TILE_W / 2) * z;
    const sy = (gx + gy) * (TILE_H / 2) * z - h * WALL * z;
    return { x: sx - this.x + this.view.w / 2, y: sy - this.y + this.view.h / 2 };
  }

  /** Ekran (CSS piksel, clientX/Y) → dünya karosu. */
  screenToWorld(px: number, py: number): { gx: number; gy: number } {
    const z = this.zoom;
    const x = px * this.view.dpr - this.view.w / 2 + this.x;
    const y = py * this.view.dpr - this.view.h / 2 + this.y;
    const a = x / ((TILE_W / 2) * z);
    const b = y / ((TILE_H / 2) * z);
    return { gx: Math.round((a + b) / 2), gy: Math.round((b - a) / 2) };
  }

  /** Kamerayı harita sınırları içinde tut — dışarıdaki karanlık görünmez. */
  clamp(worldW: number, worldH: number): void {
    const z = this.zoom;
    const halfW = (TILE_W / 2) * z, halfH = (TILE_H / 2) * z;
    const minX = -(worldH - 1) * halfW - halfW;
    const maxX = (worldW - 1) * halfW + halfW;
    const minY = -WALL * z * 3 - halfH;
    const maxY = (worldW + worldH - 2) * halfH + halfH;

    const vw = this.view.w / 2, vh = this.view.h / 2;

    if (maxX - minX <= vw * 2) this.x = (minX + maxX) / 2;
    else this.x = Math.max(minX + vw, Math.min(maxX - vw, this.x));

    if (maxY - minY <= vh * 2) this.y = (minY + maxY) / 2;
    else this.y = Math.max(minY + vh, Math.min(maxY - vh, this.y));
  }

  /** İmleç/parmak altındaki noktayı sabit tutarak yakınlaştır. */
  zoomAt(px: number, py: number, factor: number, world: World): void {
    const before = this.screenToWorld(px, py);
    const old = this.zoom;
    this.zoom = Math.max(this.min, Math.min(this.max, this.zoom * factor));
    if (this.zoom === old) return;
    const gx = Math.max(0, Math.min(world.W - 1, before.gx));
    const gy = Math.max(0, Math.min(world.H - 1, before.gy));
    const after = this.worldToScreen(before.gx, before.gy, world.height[world.idx(gx, gy)] ?? 0);
    this.x += after.x - px * this.view.dpr;
    this.y += after.y - py * this.view.dpr;
    this.clamp(world.W, world.H);
  }

  /** Kamerayı bir karoya odakla. */
  focusOn(gx: number, gy: number, world: World): void {
    const s = this.worldToScreen(gx, gy, world.height[world.idx(gx, gy)] ?? 0);
    this.x += s.x - this.view.w / 2;
    this.y += s.y - this.view.h / 2;
    this.clamp(world.W, world.H);
  }
}
