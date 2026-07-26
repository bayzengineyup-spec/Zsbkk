/* ============================================================
   SES MOTORU — tamamen sentez, dosya yok (prototipten taşındı).
   Web Audio API ile efektler + ruh haline göre üretken müzik.
   UI katmanıdır: sim'e dokunmaz, determinizmi etkilemez
   (müzikte Math.random serbest — kozmetik).
   ============================================================ */
import type { Sim } from '../core/sim';
import { dayLight } from '../render/daynight';

interface ToneOpt {
  type?: OscillatorType;
  vol?: number;
  atk?: number;
  delay?: number;
  slide?: number;
  filter?: number;
  music?: boolean;
  echo?: boolean;
}

interface NoiseOpt {
  freq?: number;
  sweep?: number;
  vol?: number;
  delay?: number;
  hp?: boolean;
  echo?: boolean;
}

const Snd = {
  ctx: null as AudioContext | null,
  master: null as GainNode | null,
  mGain: null as GainNode | null,
  sGain: null as GainNode | null,
  conv: null as DelayNode | null,
  musicVol: 0.30,
  sfxVol: 0.55,
  on: true,
  ready: false,
  nextNote: 0,
  bar: 0,
};

const PREF_KEY = 'kralliklar_cagi_snd';

export function loadSoundPrefs(): void {
  try {
    const p = JSON.parse(localStorage.getItem(PREF_KEY) ?? '{}') as {
      on?: boolean; musicVol?: number; sfxVol?: number;
    };
    if (p.on !== undefined) Snd.on = p.on;
    if (p.musicVol !== undefined) Snd.musicVol = p.musicVol;
    if (p.sfxVol !== undefined) Snd.sfxVol = p.sfxVol;
  } catch { /* yoksay */ }
}

function savePrefs(): void {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify({
      on: Snd.on, musicVol: Snd.musicVol, sfxVol: Snd.sfxVol,
    }));
  } catch { /* yoksay */ }
}

function sndInit(): boolean {
  if (Snd.ctx) return true;
  try {
    Snd.ctx = new AudioContext();
    Snd.master = Snd.ctx.createGain();
    Snd.master.gain.value = Snd.on ? 1 : 0;
    Snd.master.connect(Snd.ctx.destination);

    // basit yankı (gecikme + geri besleme)
    const dly = Snd.ctx.createDelay(1.0);
    dly.delayTime.value = 0.26;
    const fb = Snd.ctx.createGain(); fb.gain.value = 0.28;
    const wet = Snd.ctx.createGain(); wet.gain.value = 0.30;
    const lp = Snd.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 2200;
    dly.connect(fb); fb.connect(dly);
    dly.connect(lp); lp.connect(wet); wet.connect(Snd.master);
    Snd.conv = dly;

    Snd.mGain = Snd.ctx.createGain(); Snd.mGain.gain.value = Snd.musicVol;
    Snd.mGain.connect(Snd.master); Snd.mGain.connect(Snd.conv);
    Snd.sGain = Snd.ctx.createGain(); Snd.sGain.gain.value = Snd.sfxVol;
    Snd.sGain.connect(Snd.master);
    Snd.ready = true;
    return true;
  } catch { return false; }
}

export function sndResume(): void {
  if (!Snd.ctx) sndInit();
  if (Snd.ctx && Snd.ctx.state === 'suspended') void Snd.ctx.resume();
}

function tone(freq: number, dur: number, opt?: ToneOpt): void {
  if (!Snd.on || !Snd.ready || !Snd.ctx) return;
  const o = opt ?? {};
  const t = Snd.ctx.currentTime + (o.delay ?? 0);
  const osc = Snd.ctx.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t);
  if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t + dur);
  const g = Snd.ctx.createGain();
  const vol = o.vol ?? 0.5;
  const atk = o.atk ?? 0.008;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node: AudioNode = osc;
  if (o.filter) {
    const f = Snd.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = o.filter;
    osc.connect(f); node = f;
  }
  node.connect(g);
  g.connect(o.music ? Snd.mGain! : Snd.sGain!);
  if (o.echo && Snd.conv) g.connect(Snd.conv);
  osc.start(t); osc.stop(t + dur + 0.05);
}

function noiseBurst(dur: number, opt?: NoiseOpt): void {
  if (!Snd.on || !Snd.ready || !Snd.ctx) return;
  const o = opt ?? {};
  const t = Snd.ctx.currentTime + (o.delay ?? 0);
  const n = Math.floor(Snd.ctx.sampleRate * dur);
  const buf = Snd.ctx.createBuffer(1, n, Snd.ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = Snd.ctx.createBufferSource(); src.buffer = buf;
  const f = Snd.ctx.createBiquadFilter();
  f.type = o.hp ? 'highpass' : 'lowpass';
  f.frequency.setValueAtTime(o.freq ?? 1200, t);
  if (o.sweep) f.frequency.exponentialRampToValueAtTime(Math.max(60, o.sweep), t + dur);
  const g = Snd.ctx.createGain();
  g.gain.setValueAtTime(o.vol ?? 0.35, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(Snd.sGain!);
  if (o.echo && Snd.conv) g.connect(Snd.conv);
  src.start(t); src.stop(t + dur + 0.02);
}

/* ---------- efekt kütüphanesi (prototipten birebir) ---------- */
const SFX: Record<string, () => void> = {
  click:    () => { tone(760, 0.05, { type: 'triangle', vol: 0.16 }); },
  select:   () => { tone(560, 0.06, { type: 'sine', vol: 0.18 });
                    tone(840, 0.05, { type: 'sine', vol: 0.10, delay: 0.04 }); },
  build:    () => { noiseBurst(0.16, { freq: 1600, sweep: 280, vol: 0.30 });
                    tone(120, 0.20, { type: 'triangle', vol: 0.35, slide: 70 }); },
  coin:     () => { tone(1180, 0.07, { type: 'square', vol: 0.10, filter: 2600 });
                    tone(1560, 0.09, { type: 'square', vol: 0.09, filter: 2600, delay: 0.06 }); },
  train:    () => { noiseBurst(0.10, { freq: 3200, hp: true, vol: 0.16 });
                    tone(300, 0.14, { type: 'sawtooth', vol: 0.16, filter: 900, slide: 400 }); },
  battle:   () => { noiseBurst(0.42, { freq: 900, sweep: 140, vol: 0.42, echo: true });
                    tone(88, 0.5, { type: 'sawtooth', vol: 0.28, filter: 400, slide: 52 });
                    for (let i = 0; i < 4; i++) noiseBurst(0.09, { freq: 3000, hp: true, vol: 0.14, delay: 0.05 + i * 0.07 }); },
  victory:  () => { [523, 659, 784, 1047].forEach((f, i) =>
                    tone(f, 0.5, { type: 'triangle', vol: 0.22, delay: i * 0.11, echo: true })); },
  defeat:   () => { [392, 330, 262, 196].forEach((f, i) =>
                    tone(f, 0.7, { type: 'sine', vol: 0.24, delay: i * 0.18, echo: true })); },
  levelup:  () => { [660, 880, 1100].forEach((f, i) =>
                    tone(f, 0.22, { type: 'triangle', vol: 0.18, delay: i * 0.07, echo: true })); },
  birth:    () => { tone(520, 0.20, { type: 'sine', vol: 0.16, slide: 880 }); },
  death:    () => { tone(200, 0.42, { type: 'sine', vol: 0.20, slide: 70, echo: true }); },
  fire:     () => { noiseBurst(0.7, { freq: 700, sweep: 200, vol: 0.26, echo: true }); },
  quake:    () => { noiseBurst(1.1, { freq: 280, sweep: 60, vol: 0.45, echo: true });
                    tone(46, 1.2, { type: 'sine', vol: 0.35 }); },
  error:    () => { tone(160, 0.14, { type: 'square', vol: 0.14, filter: 600 }); },
  research: () => { [440, 554, 659, 880].forEach((f, i) =>
                    tone(f, 0.34, { type: 'sine', vol: 0.15, delay: i * 0.09, echo: true })); },
  horn:     () => { tone(146, 0.85, { type: 'sawtooth', vol: 0.26, filter: 700, echo: true });
                    tone(220, 0.85, { type: 'sawtooth', vol: 0.18, filter: 700, delay: 0.05, echo: true }); },
};

export function sfx(name: string): void {
  const f = SFX[name];
  if (f) { sndResume(); try { f(); } catch { /* yoksay */ } }
}

/* ---------- üretken müzik (ruh haline uyum) ---------- */
const SCALES: Record<string, number[]> = {
  peace: [0, 2, 4, 7, 9, 12, 14, 16],   // majör pentatonik — huzurlu
  night: [0, 3, 5, 7, 10, 12, 15, 17],  // minör — gizemli
  war:   [0, 1, 5, 7, 8, 12, 13, 17],   // frigyen — gergin
};
const ROOTS: Record<string, number> = { peace: 130.81, night: 98.0, war: 110.0 };

function musicMood(sim: Sim | null): string {
  if (!sim) return 'peace';
  if (sim.kingdoms.kingdoms.some(k => k.status === 'war')) return 'war';
  if (dayLight(sim.time.t) < 0.35) return 'night';
  return 'peace';
}

export function updateMusic(sim: Sim | null): void {
  if (!Snd.on || !Snd.ready || !Snd.ctx || Snd.ctx.state !== 'running') return;
  const now = Snd.ctx.currentTime;
  if (now < Snd.nextNote) return;

  const mood = musicMood(sim);
  const scale = SCALES[mood], root = ROOTS[mood];
  const barLen = mood === 'war' ? 1.5 : 2.6;

  // bas drone (her 2 barda bir)
  if (Snd.bar % 2 === 0) {
    tone(root / 2, barLen * 2.1, { type: 'triangle', vol: 0.10, atk: 0.5, music: true, filter: 420 });
  }
  // pad akoru
  const deg = scale[(Math.random() * scale.length) | 0];
  const f0 = root * Math.pow(2, deg / 12);
  tone(f0, barLen * 1.5, { type: 'sine', vol: 0.085, atk: 0.7, music: true, echo: true, filter: 1800 });
  tone(f0 * 1.5, barLen * 1.4, { type: 'sine', vol: 0.055, atk: 0.8, music: true, echo: true, filter: 1600 });
  // ezgi notası (bazen)
  if (Math.random() < (mood === 'war' ? 0.75 : 0.5)) {
    const d2 = scale[(Math.random() * scale.length) | 0] + 12;
    tone(root * Math.pow(2, d2 / 12), barLen * 0.5,
      { type: 'triangle', vol: 0.075, atk: 0.05, music: true, echo: true, delay: barLen * 0.35, filter: 2600 });
  }
  // savaşta davul
  if (mood === 'war') {
    noiseBurst(0.14, { freq: 220, sweep: 70, vol: 0.13 });
    noiseBurst(0.10, { freq: 200, sweep: 60, vol: 0.09, delay: barLen * 0.5 });
  }
  Snd.bar++;
  Snd.nextNote = now + barLen;
}

export function soundOn(): boolean { return Snd.on; }
export function toggleSound(on: boolean): void {
  Snd.on = on;
  if (Snd.master) Snd.master.gain.value = on ? 1 : 0;
  if (on) sndResume();
  savePrefs();
}
export function setMusicVol(v: number): void {
  Snd.musicVol = v;
  if (Snd.mGain) Snd.mGain.gain.value = v;
  savePrefs();
}
export function setSfxVol(v: number): void {
  Snd.sfxVol = v;
  if (Snd.sGain) Snd.sGain.gain.value = v;
  savePrefs();
}
export function getMusicVol(): number { return Snd.musicVol; }
export function getSfxVol(): number { return Snd.sfxVol; }
