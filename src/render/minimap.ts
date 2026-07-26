/* ============================================================
   MİNİ HARİTA — biyom önbelleği + sis örtüsü + krallık toprakları
   Sis örtüsü yalnız kirli olduğunda (throttle ile) yeniden kurulur.
   ============================================================ */
import type { World } from '../core/world';
import type { Sim } from '../core/sim';
import { BIOMES } from '../data/biomes';
import type { Camera, Viewport } from './camera';

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export class MiniMap {
  private readonly cache: HTMLCanvasElement;
  private readonly fogCnv: HTMLCanvasElement;
  private readonly fogCtx: CanvasRenderingContext2D;
  private fogThrottle = 0;
  private fogBuilt = false;

  constructor(private readonly world: World) {
    // biyom önbelleği (1 piksel = 1 karo)
    this.cache = document.createElement('canvas');
    this.cache.width = world.W; this.cache.height = world.H;
    const c = this.cache.getContext('2d')!;
    const img = c.createImageData(world.W, world.H);
    for (let i = 0; i < world.tiles.length; i++) {
      const [r, g, b] = hexToRgb(BIOMES[world.tiles[i]].top);
      const mult = 0.8 + world.height[i] * 0.4;
      const o = i * 4;
      img.data[o] = Math.min(255, r * mult);
      img.data[o + 1] = Math.min(255, g * mult);
      img.data[o + 2] = Math.min(255, b * mult);
      img.data[o + 3] = 255;
    }
    c.putImageData(img, 0, 0);

    this.fogCnv = document.createElement('canvas');
    this.fogCnv.width = world.W; this.fogCnv.height = world.H;
    this.fogCtx = this.fogCnv.getContext('2d')!;
  }

  /** Sis + krallık toprağı örtüsünü yeniden kur (kirli + throttle). */
  private rebuildFog(sim: Sim): void {
    const w = this.world;
    const img = this.fogCtx.createImageData(w.W, w.H);
    const colorCache = new Map<number, [number, number, number]>();
    for (let i = 0; i < w.tiles.length; i++) {
      const o = i * 4;
      const v = sim.vis[i];
      if (v === 0) {
        // hiç görülmedi: tam karanlık
        img.data[o + 3] = 255;
        continue;
      }
      const owner = sim.kingdoms.ownerMap.get(i);
      if (owner) {
        let rgb = colorCache.get(owner.id);
        if (!rgb) { rgb = hexToRgb(owner.color); colorCache.set(owner.id, rgb); }
        img.data[o] = rgb[0]; img.data[o + 1] = rgb[1]; img.data[o + 2] = rgb[2];
        img.data[o + 3] = v === 2 ? 150 : 110;
      } else if (v === 1) {
        // keşfedildi ama görüş dışı: loş
        img.data[o + 3] = 110;
      }
      // v === 2 ve sahipsiz: tamamen açık (alpha 0)
    }
    this.fogCtx.putImageData(img, 0, 0);
    sim.fogDirty = false;
    this.fogBuilt = true;
  }

  draw(
    mmx: CanvasRenderingContext2D,
    cam: Camera,
    view: Viewport,
    sim: Sim | null,
    dt: number,
  ): void {
    const size = mmx.canvas.width;
    const w = this.world;

    if (sim) {
      this.fogThrottle -= dt;
      if ((sim.fogDirty || !this.fogBuilt) && this.fogThrottle <= 0) {
        this.fogThrottle = 0.5;
        this.rebuildFog(sim);
      }
    }

    mmx.imageSmoothingEnabled = false;
    mmx.clearRect(0, 0, size, size);
    mmx.drawImage(this.cache, 0, 0, size, size);
    if (sim && this.fogBuilt) mmx.drawImage(this.fogCnv, 0, 0, size, size);

    // görüş alanı çerçevesi
    const cssW = view.w / view.dpr, cssH = view.h / view.dpr;
    const pts = [
      cam.screenToWorld(0, 0),
      cam.screenToWorld(cssW, 0),
      cam.screenToWorld(cssW, cssH),
      cam.screenToWorld(0, cssH),
    ].map(p => ({ x: (p.gx / w.W) * size, y: (p.gy / w.H) * size }));

    mmx.strokeStyle = '#d9a441';
    mmx.lineWidth = 1.5;
    mmx.beginPath();
    mmx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) mmx.lineTo(pts[i].x, pts[i].y);
    mmx.closePath();
    mmx.stroke();
  }
}
