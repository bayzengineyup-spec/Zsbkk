/* ============================================================
   DİPLOMASİ PANELİ — prototipin paneli, komut sistemine bağlı.
   ============================================================ */
import type { Sim } from '../core/sim';
import type { DiploAction } from '../core/kingdoms';
import { statusLabel } from '../core/kingdoms';
import { PERSONALITIES } from '../data/personalities';

let panel: HTMLElement;
let list: HTMLElement;
let getSim: () => Sim | null;
let onAction: (kingdomId: number, action: DiploAction) => void;
let onGoto: (x: number, y: number) => void;
let onAttack: (kingdomId: number) => void;
export let diploOpen = false;

export function initDiplo(opts: {
  panel: HTMLElement;
  list: HTMLElement;
  getSim: () => Sim | null;
  onAction: (kingdomId: number, action: DiploAction) => void;
  onGoto: (x: number, y: number) => void;
  onAttack: (kingdomId: number) => void;
}): void {
  panel = opts.panel;
  list = opts.list;
  getSim = opts.getSim;
  onAction = opts.onAction;
  onGoto = opts.onGoto;
  onAttack = opts.onAttack;
}

export function openDiploPanel(): void {
  diploOpen = true;
  panel.classList.add('show');
  refreshDiploPanel();
}

export function closeDiploPanel(): void {
  diploOpen = false;
  panel.classList.remove('show');
}

export function refreshDiploPanel(): void {
  if (!diploOpen) return;
  const sim = getSim();
  if (!sim) return;
  const ks = sim.kingdoms.kingdoms;
  if (!ks.length) {
    list.innerHTML = '<div class="dnote">Bilinen krallık kalmadı.</div>';
    return;
  }

  let html = `<div class="dnote">👑 İtibarın: <b>${Math.round(sim.player.reputation)}</b> · Gücün: <b>${sim.playerPower()}</b></div>`;
  for (const k of ks) {
    const pers = PERSONALITIES[k.persKey];
    const st = statusLabel(k);
    const relPct = Math.round((k.relation + 100) / 2); // -100..100 → 0..100
    html += `<div class="dcard">`
      + `<div class="dhead"><span class="dic">${pers.icon}</span>`
      + `<b>${k.name}</b>`
      + `<span class="dstat" style="color:${st.c}">${st.t}</span></div>`
      + `<div class="dsub">${pers.name} — ${pers.desc} · Güç: ${k.power}${k.spied ? ` · 👥${k.pop} · ⚔️${Math.round(k.army)}` : ''}</div>`
      + `<div class="dbar"><div class="dfill" style="width:${relPct}%;background:${st.c}"></div></div>`
      + `<div class="dacts">`;
    html += `<button data-a="gift" data-id="${k.id}">🎁 Hediye (🪙50)</button>`;
    if (k.status === 'war') {
      html += `<button data-a="truce" data-id="${k.id}">🕊️ Ateşkes iste</button>`;
    } else {
      if (!k.tradeDeal) html += `<button data-a="trade" data-id="${k.id}">💰 Ticaret</button>`;
      if (k.status !== 'ally') html += `<button data-a="ally" data-id="${k.id}">🤝 İttifak</button>`;
      else html += `<button data-a="breakAlly" data-id="${k.id}">💔 İttifakı boz</button>`;
    }
    html += `<button data-a="spy" data-id="${k.id}">🕵️ Casus (🪙${sim.tech.spyCost()})</button>`;
    html += `<button data-a="tribute" data-id="${k.id}">💰 Haraç iste</button>`;
    if (k.status !== 'war') html += `<button class="danger" data-a="war" data-id="${k.id}">⚔️ Savaş ilan et</button>`;
    const armySize = sim.player.units.spear + sim.player.units.archer + sim.player.units.cav;
    if (armySize > 0) html += `<button class="danger" data-a="attack" data-id="${k.id}">⚔️ Saldır (${armySize})</button>`;
    html += `<button data-a="goto" data-id="${k.id}">🎯 Göster</button>`;
    html += `</div></div>`;
  }
  list.innerHTML = html;

  list.querySelectorAll<HTMLButtonElement>('[data-a]').forEach(btn => {
    btn.onclick = () => {
      const id = parseInt(btn.dataset.id!, 10);
      const a = btn.dataset.a!;
      const s = getSim();
      if (!s) return;
      if (a === 'goto') {
        const k = s.kingdoms.byId(id);
        if (k) onGoto(k.cx, k.cy);
        return;
      }
      if (a === 'attack') {
        onAttack(id);
        refreshDiploPanel();
        return;
      }
      onAction(id, a as DiploAction);
      refreshDiploPanel();
    };
  });
}
