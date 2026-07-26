/* ============================================================
   ÖĞRETİCİ — adım adım hedefler (prototipten taşındı).
   Sim durumunu okur, hiçbir şeyi değiştirmez.
   ============================================================ */
import type { Sim } from '../core/sim';
import { compTotal } from '../data/units';

interface TutStep {
  id: string;
  icon: string;
  title: string;
  text: string;
  done(sim: Sim): boolean;
}

const TUT_STEPS: TutStep[] = [
  { id: 'center', icon: '🏛️', title: 'Köyünü Kur',
    text: 'İnşa butonuna bas, Köy Meydanı\'nı seç ve haritada bir yere kur.',
    done: s => s.player.hasCenter },
  { id: 'farm', icon: '🌾', title: 'Yiyecek Üret',
    text: 'Halkın karnını doyurmalı. Bir Tarla kur — çayır gibi verimli topraklara kurulur.',
    done: s => s.player.buildings.some(b => b.type === 'farm') },
  { id: 'worker', icon: '👷', title: 'İşçi Ata',
    text: 'Bina kendi kendine üretmez. Tarlaya dokun ve + tuşuyla işçi ata.',
    done: s => s.player.buildings.some(b => b.workers > 0) },
  { id: 'wood', icon: '🪓', title: 'Odun Kaynağı',
    text: 'Neredeyse her bina odun ister. Ormana yakın bir Oduncu kur ve işçi ata.',
    done: s => s.player.buildings.some(b => b.type === 'woodcutter' && b.workers > 0) },
  { id: 'house', icon: '🏠', title: 'Nüfusu Büyüt',
    text: 'Ev kurunca nüfus kapasiten artar, daha çok köylün olur.',
    done: s => s.player.buildings.some(b => b.type === 'house') },
  { id: 'explore', icon: '🌫️', title: 'Etrafı Keşfet',
    text: 'Harita sisle kaplı. Köylülerin ilerledikçe sis dağılır. Bir krallık başkenti bul.',
    done: s => s.kingdoms.kingdoms.some(k => s.vis[k.cy * s.world.W + k.cx] > 0) },
  { id: 'army', icon: '⚔️', title: 'Ordunu Kur',
    text: 'Kışla kur ve asker eğit. Unutma: 🛡️ mızrakçı > 🐎 süvari > 🏹 okçu > 🛡️ mızrakçı.',
    done: s => compTotal(s.player.units) > 0 },
  { id: 'diplo', icon: '🤝', title: 'Diplomasi Kur',
    text: 'Diplomasi panelinden bir krallığa hediye gönder. İlişkin iyileşsin, ittifak kurabilirsin.',
    done: s => s.kingdoms.kingdoms.some(k => k.relation > 25) },
  { id: 'tech', icon: '📜', title: 'Teknolojiye Yatır',
    text: 'Akademi kur, bilgi üret, Teknoloji panelinden araştır. Uzun vadede fark yaratır.',
    done: s => Object.keys(s.tech.done).length > 0 },
];

export interface TutState { step: number; done: boolean; hidden: boolean; }

let box: HTMLElement;
let onStepDone: (title: string, allDone: boolean) => void;
export const Tut: TutState = { step: 0, done: false, hidden: false };

export function initTutorial(opts: {
  box: HTMLElement;
  onStepDone: (title: string, allDone: boolean) => void;
}): void {
  box = opts.box;
  onStepDone = opts.onStepDone;
}

export function resetTutorial(state?: TutState): void {
  Tut.step = state?.step ?? 0;
  Tut.done = state?.done ?? false;
  Tut.hidden = state?.hidden ?? false;
  renderTutorial();
}

export function updateTutorial(sim: Sim): void {
  if (Tut.done) return;
  const s = TUT_STEPS[Tut.step];
  if (!s) { Tut.done = true; renderTutorial(); return; }
  let ok = false;
  try { ok = s.done(sim); } catch { ok = false; }
  if (ok) {
    Tut.step++;
    if (Tut.step >= TUT_STEPS.length) {
      Tut.done = true;
      onStepDone(s.title, true);
    } else {
      onStepDone(s.title, false);
    }
    renderTutorial();
  }
}

export function renderTutorial(): void {
  if (!box) return;
  const s = Tut.done ? null : TUT_STEPS[Tut.step];
  if (!s || Tut.hidden) { box.classList.remove('show'); return; }
  box.classList.add('show');
  box.innerHTML =
    `<div class="tuthead"><span class="tic">${s.icon}</span>`
    + `<span class="ttl">${s.title}</span>`
    + `<span class="tstep">${Tut.step + 1}/${TUT_STEPS.length}</span>`
    + `<button class="tclose" id="tut-x">✕</button></div>`
    + `<div class="tuttext">${s.text}</div>`;
  const x = document.getElementById('tut-x');
  if (x) x.onclick = () => { Tut.hidden = true; renderTutorial(); };
}
