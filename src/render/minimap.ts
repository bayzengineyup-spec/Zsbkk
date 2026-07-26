/* ============================================================
   MİNİ HARİTA — biyom renkleri önbellekli, üstüne görüş alanı
   ============================================================ */
import type { World } from '../core/world';
import { BIOMES } from '../data/biomes';
import type { Camera, Viewport } from './camera';

/** Dünya başına bir kez: karo→piksel biyom haritası üretir. */
export function buildMinimapCache(world: World): HTMLCanvasElement {
  const cnv = document.createElement('canvas');
  cnv.width = world.W; cnv.height = world.H;
  const c = cnv.getContext('2d')!;
  const img = c.createImageData(world.W, world.H);
  for (let i = 0; i < world.tiles.length; i++) {
    const hex = BIOMES[world.tiles[i]].top;
    const n = parseInt(hex.slice(1), 16);
    const h = world.height[i];
    const mult = 0.8 + h * 0.4;
    const o = i * 4;
    img.data[o] = Math.min(255, ((n >> 16) & 255) * mult);
    img.data[o + 1] = Math.min(255, ((n >> 8) & 255) * mult);
    img.data[o + 2] = Math.min(255, (n & 255) * mult);
    img.data[o + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  return cnv;
}

/** Her kare: önbelleği bas + kamera görüş alanını altın çerçeveyle göster. */
export function drawMinimap(
  mmx: CanvasRenderingContext2D,
  cache: HTMLCanvasElement,
  world: World,
  cam: Camera,
  view: Viewport,
): void {
  const size = mmx.canvas.width;
  mmx.imageSmoothingEnabled = false;
  mmx.clearRect(0, 0, size, size);
  mmx.drawImage(cache, 0, 0, size, size);

  // görüş alanı: ekran köşeleri → karo → minimap pikseli
  const cssW = view.w / view.dpr, cssH = view.h / view.dpr;
  const pts = [
    cam.screenToWorld(0, 0),
    cam.screenToWorld(cssW, 0),
    cam.screenToWorld(cssW, cssH),
    cam.screenToWorld(0, cssH),
  ].map(p => ({
    x: (p.gx / world.W) * size,
    y: (p.gy / world.H) * size,
  }));

  mmx.strokeStyle = '#d9a441';
  mmx.lineWidth = 1.5;
  mmx.beginPath();
  mmx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) mmx.lineTo(pts[i].x, pts[i].y);
  mmx.closePath();
  mmx.stroke();
}
