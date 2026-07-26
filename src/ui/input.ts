/* ============================================================
   DOKUNMATİK GİRDİ (birleşik, atalet kaydırmalı) — prototipten
   birebir taşındı.
   Tek parmak: kaydır (bırakınca kayarak durur)
   İki parmak: yakınlaştır + kaydır
   Dokunuş: seç · Uzun basma: seç · Çift dokunuş: yakınlaş
   Fare tekerleği: yakınlaştır
   ============================================================ */
import type { Camera, Viewport } from '../render/camera';
import type { World } from '../core/world';

export interface InputCallbacks {
  /** Karo seçimi (ekran CSS koordinatı ile çağrılır) */
  onSelect(clientX: number, clientY: number): void;
  /** Titreşim geri bildirimi */
  haptic(ms: number): void;
}

interface Pt { x: number; y: number; }

export class TouchInput {
  private pts = new Map<number, Pt>();
  private panning = false;
  private startX = 0; private startY = 0; private startT = 0;
  private lastX = 0; private lastY = 0;
  private moved = 0;
  private vx = 0; private vy = 0; // hız (atalet için)
  private lastMoveT = 0;
  private pinchDist = 0; private pinchMidX = 0; private pinchMidY = 0;
  private lastTapT = 0; private lastTapX = 0; private lastTapY = 0;
  private longTimer: ReturnType<typeof setTimeout> | null = null;
  private suppressTap = false;

  constructor(
    private readonly cv: HTMLCanvasElement,
    private readonly cam: Camera,
    private readonly view: Viewport,
    private readonly getWorld: () => World | null,
    private readonly cb: InputCallbacks,
  ) {
    cv.addEventListener('pointerdown', this.onDown, { passive: true });
    cv.addEventListener('pointermove', this.onMove, { passive: true });
    cv.addEventListener('pointerup', this.onEnd, { passive: true });
    cv.addEventListener('pointercancel', this.onEnd, { passive: true });
    cv.addEventListener('wheel', this.onWheel, { passive: false });
  }

  private clearLongPress(): void {
    if (this.longTimer !== null) { clearTimeout(this.longTimer); this.longTimer = null; }
  }

  private midOf(): { x: number; y: number } {
    let x = 0, y = 0, n = 0;
    for (const p of this.pts.values()) { x += p.x; y += p.y; n++; }
    return { x: x / n, y: y / n };
  }

  private distOf(): number {
    const a = [...this.pts.values()];
    if (a.length < 2) return 0;
    return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
  }

  private onDown = (e: PointerEvent): void => {
    this.cv.setPointerCapture(e.pointerId);
    this.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.vx = 0; this.vy = 0;

    if (this.pts.size === 1) {
      this.panning = true;
      this.startX = this.lastX = e.clientX;
      this.startY = this.lastY = e.clientY;
      this.startT = this.lastMoveT = performance.now();
      this.moved = 0;
      this.suppressTap = false;
      this.clearLongPress();
      this.longTimer = setTimeout(() => {
        if (this.moved < 12 && this.pts.size === 1) {
          this.suppressTap = true;
          this.cb.haptic(18);
          this.cb.onSelect(this.startX, this.startY);
        }
      }, 480);
    } else if (this.pts.size === 2) {
      this.panning = false;
      this.clearLongPress();
      this.pinchDist = this.distOf();
      const m = this.midOf();
      this.pinchMidX = m.x; this.pinchMidY = m.y;
    }
  };

  private onMove = (e: PointerEvent): void => {
    const p = this.pts.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX; p.y = e.clientY;
    const world = this.getWorld();
    if (!world) return;

    if (this.pts.size === 1 && this.panning) {
      const dx = e.clientX - this.lastX, dy = e.clientY - this.lastY;
      this.moved += Math.abs(dx) + Math.abs(dy);
      if (this.moved > 12) this.clearLongPress();
      this.cam.x -= dx * this.view.dpr;
      this.cam.y -= dy * this.view.dpr;
      this.cam.clamp(world.W, world.H);
      const now = performance.now();
      const dt = Math.max(1, now - this.lastMoveT);
      // hız (px/ms), yumuşatılmış
      this.vx = this.vx * 0.6 + (-dx * this.view.dpr / dt) * 0.4;
      this.vy = this.vy * 0.6 + (-dy * this.view.dpr / dt) * 0.4;
      this.lastMoveT = now;
      this.lastX = e.clientX; this.lastY = e.clientY;
    } else if (this.pts.size >= 2) {
      const d = this.distOf();
      const m = this.midOf();
      if (this.pinchDist > 0 && d > 0) {
        this.cam.zoomAt(m.x, m.y, d / this.pinchDist, world);
      }
      // iki parmakla kaydırma
      this.cam.x -= (m.x - this.pinchMidX) * this.view.dpr;
      this.cam.y -= (m.y - this.pinchMidY) * this.view.dpr;
      this.cam.clamp(world.W, world.H);
      this.pinchDist = d;
      this.pinchMidX = m.x; this.pinchMidY = m.y;
      this.moved += 20;
    }
  };

  private onEnd = (e: PointerEvent): void => {
    const had = this.pts.has(e.pointerId);
    this.pts.delete(e.pointerId);
    this.clearLongPress();
    if (!had) return;

    if (this.pts.size === 0) {
      const dur = performance.now() - this.startT;
      const world = this.getWorld();
      // dokunuş mu?
      if (this.moved < 12 && dur < 400 && !this.suppressTap && world) {
        const now = performance.now();
        const near = Math.hypot(e.clientX - this.lastTapX, e.clientY - this.lastTapY) < 34;
        if (now - this.lastTapT < 300 && near) {
          this.cam.zoomAt(e.clientX, e.clientY, 1.55, world); // çift dokunuş
          this.cb.haptic(10);
          this.lastTapT = 0;
        } else {
          this.cb.onSelect(e.clientX, e.clientY);
          this.cb.haptic(8);
          this.lastTapT = now;
          this.lastTapX = e.clientX; this.lastTapY = e.clientY;
        }
        this.vx = 0; this.vy = 0;
      }
      this.panning = false;
      this.pinchDist = 0;
    } else if (this.pts.size === 1) {
      // pinch'ten tek parmağa dönüş
      const only = [...this.pts.values()][0];
      this.panning = true;
      this.lastX = only.x; this.lastY = only.y;
      this.lastMoveT = performance.now();
      this.moved = 999; // dokunuş sayılmasın
      this.pinchDist = 0;
    }
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const world = this.getWorld();
    if (!world) return;
    this.cam.zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.14 : 0.88, world);
  };

  /** Atalet kaydırma — her karede çağrılır. */
  applyMomentum(dt: number): void {
    if (this.pts.size > 0) return;
    const world = this.getWorld();
    if (!world) return;
    const sp = Math.hypot(this.vx, this.vy);
    if (sp < 0.004) { this.vx = 0; this.vy = 0; return; }
    this.cam.x += this.vx * dt * 1000;
    this.cam.y += this.vy * dt * 1000;
    const decay = Math.pow(0.0022, dt); // saniyede ~%99.8 sönüm
    this.vx *= decay; this.vy *= decay;
    this.cam.clamp(world.W, world.H);
  }
}
