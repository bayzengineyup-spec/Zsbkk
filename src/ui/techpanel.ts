/* ============================================================
   TEKNOLOJİ PANELİ — prototipin paneli, komut sistemine bağlı.
   ============================================================ */
import type { Sim } from '../core/sim';
import { TECHS, TECH_BRANCH, type TechBranch, type TechId } from '../data/techs';
import { costStr, type ResKey } from '../data/buildings';

let panel: HTMLElement;
let list: HTMLElement;
let getSim: () => Sim | null;
let onResearch: (id: TechId) => void;
export let techOpen = false;

export function initTechPanel(opts: {
  panel: HTMLElement;
  list: HTMLElement;
  getSim: () => Sim | null;
  onResearch: (id: TechId) => void;
}): void {
  panel = opts.panel;
  list = opts.list;
  getSim = opts.getSim;
  onResearch = opts.onResearch;
}

export function openTechPanel(): void {
  techOpen = true;
  panel.classList.add('show');
  refreshTechPanel();
}

export function closeTechPanel(): void {
  techOpen = false;
  panel.classList.remove('show');
}

export function refreshTechPanel(): void {
  if (!techOpen) return;
  const sim = getSim();
  if (!sim) return;
  const hasAcademy = sim.player.buildings.some(b => b.type === 'academy');

  let html = `<div class="dnote">📜 Bilgi: <b>${Math.floor(sim.player.res.know)}</b>`
    + (hasAcademy ? '' : ' <span style="color:var(--danger)">— Akademi kurmalısın</span>')
    + '</div>';

  for (const br of Object.keys(TECH_BRANCH) as TechBranch[]) {
    html += `<div class="techbr">${TECH_BRANCH[br]}</div><div class="techrow">`;
    for (const id of Object.keys(TECHS) as TechId[]) {
      const t = TECHS[id];
      if (t.br !== br) continue;
      const done = sim.tech.has(id);
      const avail = sim.tech.available(id);
      const afford = (Object.keys(t.cost) as ResKey[])
        .every(k => sim.player.res[k] >= (t.cost[k] ?? 0));
      const cls = done ? 'tdone' : avail ? (afford ? 'tok' : 'tpoor') : 'tlock';
      html += `<div class="tcard ${cls}" data-t="${id}" title="${t.desc}">`
        + `<div class="tic">${t.icon}</div><div class="tnm">${t.name}</div>`
        + `<div class="tcost">${done ? '✓ tamam' : costStr(t.cost)}</div></div>`;
    }
    html += '</div>';
  }
  list.innerHTML = html;
  list.querySelectorAll<HTMLElement>('[data-t]').forEach(el => {
    el.onclick = () => { onResearch(el.dataset.t as TechId); refreshTechPanel(); };
  });
}
