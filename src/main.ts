/* ============================================================
   ÖNYÜKLEME + OYUN DÖNGÜSÜ (M2 — Köy Kurma)
   Katman kuralı: core hiçbir DOM bilmez; render core'u okur;
   UI komut üretir → sim uygular (docs/01-MIMARI).
   ============================================================ */
import { World } from './core/world';
import { Sim } from './core/sim';
import { BIOMES } from './data/biomes';
import { BUILDINGS, costStr, upgradeCost, upgradeTime, type BuildingType } from './data/buildings';
import { Camera, type Viewport } from './render/camera';
import { buildTileSprites, buildTreeSprites, buildTintMap, buildResourceIcons } from './render/tiles';
import { buildBuildingSprites, buildCapitalSprite } from './render/buildings';
import { drawScene, TerrainCache, type Frame, type Ghost, type RenderStats, type TileSel } from './render/scene';
import { MiniMap } from './render/minimap';
import { TouchInput } from './ui/input';
import { initToasts, toast } from './ui/toast';
import {
  initPersist, saveNow, restoreGame, clearSave, exportSave, importSave,
  saveMeta, setActiveSlot, SLOT_COUNT,
} from './ui/persist';
import { applyOfflineProgress } from './core/offline';
import { RES_ICONS } from './data/buildings';
import {
  sfx, sndResume, updateMusic, loadSoundPrefs, soundOn, toggleSound,
  getMusicVol, getSfxVol, setMusicVol, setSfxVol,
} from './ui/sound';
import { Tut, initTutorial, resetTutorial, updateTutorial } from './ui/tutorial';
import { timeOfDayLabel, dayLight } from './render/daynight';
import {
  initDiplo, openDiploPanel, closeDiploPanel, refreshDiploPanel, diploOpen,
} from './ui/diplo';
import {
  initTechPanel, openTechPanel, closeTechPanel, refreshTechPanel, techOpen,
} from './ui/techpanel';
import { UNITS, UNIT_KEYS, compTotal, compLabel, type UnitComp, type UnitKey } from './data/units';
import { TACTICS, RAM_COST, type Tactic } from './core/military';
import { CMD_TRAITS } from './data/techs';
import { applyTheme } from './ui/theme';

applyTheme(); // parşömen/ahşap arayüz dokuları (kozmetik)

function el<T extends HTMLElement>(id: string): T {
  const e = document.getElementById(id);
  if (!e) throw new Error(`#${id} bulunamadı`);
  return e as T;
}

// ---------- tuval + görüş alanı ----------
const cv = el<HTMLCanvasElement>('cv');
const ctx = cv.getContext('2d')!;
const mm = el<HTMLCanvasElement>('minimap');
const mmx = mm.getContext('2d')!;

const view: Viewport = { w: 0, h: 0, dpr: 1 };

function resize(): void {
  view.dpr = Math.min(window.devicePixelRatio || 1, 2);
  view.w = Math.floor(innerWidth * view.dpr);
  view.h = Math.floor(innerHeight * view.dpr);
  cv.width = view.w; cv.height = view.h;
  cv.style.width = `${innerWidth}px`;
  cv.style.height = `${innerHeight}px`;
}
window.addEventListener('resize', () => { resize(); if (world) cam.clamp(world.W, world.H); });
window.addEventListener('orientationchange', () => {
  setTimeout(() => { resize(); if (world) cam.clamp(world.W, world.H); }, 120);
});
resize();

// ---------- durum ----------
const cam = new Camera(view);
const tileSprites = buildTileSprites();
const bSpritesDay = buildBuildingSprites(false);
const bSpritesNight = buildBuildingSprites(true); // pencereler ışıklı
const capDay = buildCapitalSprite(false);
const capNight = buildCapitalSprite(true);
const treeSprites = buildTreeSprites();
const resIcons = buildResourceIcons();
const terrain = new TerrainCache();
let tintMap: Float32Array | null = null; // dünya kurulunca üretilir
let world: World | null = null;
let sim: Sim | null = null;
// geliştirici konsolu için erişim (duman testleri de kullanır)
Object.defineProperty(window, '__game', {
  get: () => ({
    sim, world,
    save: () => { if (sim) saveNow(sim, { tut: { ...Tut } }); },
  }),
});
let minimap: MiniMap | null = null;
let sel: TileSel | null = null;
let ghost: Ghost | null = null;
let armySel: number | null = null; // haritada seçili oyuncu ordusu (Faz 4)
const stats: RenderStats = { tiles: 0, sprites: 0 };

initToasts(el('toasts'));

// ---------- ipucu ----------
const hintEl = el<HTMLElement>('hint');
function hint(msg: string | null): void {
  if (msg) { hintEl.textContent = msg; hintEl.classList.add('show'); }
  else hintEl.classList.remove('show');
}

// ---------- HUD ----------
function refreshHUD(): void {
  if (!sim) return;
  const p = sim.player;
  el('r-food').textContent = String(Math.floor(p.res.food));
  el('r-wood').textContent = String(Math.floor(p.res.wood));
  el('r-stone').textContent = String(Math.floor(p.res.stone));
  el('r-gold').textContent = String(Math.floor(p.res.gold));
  el('r-plank').textContent = String(Math.floor(p.res.plank));
  el('r-bread').textContent = String(Math.floor(p.res.bread));
  el('r-know').textContent = String(Math.floor(p.res.know));
  el('r-pop').textContent = `${p.pop}/${p.popCap}`;
  el('r-army').textContent = String(compTotal(p.units));
  el('r-happy').textContent = `%${Math.round(p.happy)}`;
  const s = sim.currentSeason();
  el('r-season').textContent =
    `${s.icon} ${s.name} · ${sim.time.year}. yıl · ${timeOfDayLabel(sim.time.t)}`;
  // aktif etkiler (veba, sert kış, altın çağ…)
  el('efxbar').innerHTML = sim.events.activeEffects
    .map(e => `<div class="efx">${e.icon} <b>${e.name}</b> · ${Math.ceil(e.timer)}sn</div>`)
    .join('');
  refreshDiploPanel();
  refreshTechPanel();
}

// ---------- karo bilgi kartı ----------
const tileinfo = el<HTMLElement>('tileinfo');

function hideInfo(): void {
  sel = null;
  armySel = null;
  tileinfo.classList.remove('show');
}

/** Seçili ordunun bilgi kartı (hareket ettikçe periyodik tazelenir). */
function refreshArmyInfo(): void {
  if (!sim || armySel === null) return;
  const a = sim.military.armies.find(x => x.id === armySel && x.owner === 'player');
  if (!a) { hideInfo(); return; } // ordu vardı, savaş/dönüş bitti
  const act = el<HTMLElement>('ti-act');
  const T = TACTICS[a.tactic ?? 'dengeli'];
  const fighting = (a.fighting ?? 0) > 0;
  const targetName = a.returning
    ? 'köye dönüyor'
    : (typeof a.targetK === 'number'
        ? (sim.kingdoms.byId(a.targetK)?.name ?? '—')
        : '—');
  const eta = Math.ceil(Math.hypot(a.tx - a.x, a.ty - a.y) / 3.5);
  el('ti-name').textContent = `⚔️ Ordun · ${a.size} asker${fighting ? ' · ÇARPIŞIYOR!' : ''}`;
  el('ti-l1').textContent = `Birlik: ${compLabel(a.comp)}`;
  el('ti-l2').textContent = fighting
    ? `⚔️ ${targetName} ile meydan savaşında!`
    : `Hedef: ${targetName} · ~${eta}sn`;
  const cmd = a.cmdId !== null ? sim.military.commanders.find(c => c.id === a.cmdId) : null;
  el('ti-l3').textContent =
    `${T.icon} ${T.name}${a.ram ? ' · 🐏 koçbaşı' : ''}${cmd ? ` · ⭐${cmd.name} sv${cmd.level}` : ''}`;
  act.innerHTML = '';
  act.style.display = 'flex';
  if (!a.returning && !fighting) {
    const rc = document.createElement('button');
    rc.textContent = '↩ Geri Çağır';
    rc.onclick = () => {
      sim!.applyCommand({ kind: 'recallArmy', armyId: a.id });
      haptic(15);
      refreshArmyInfo();
    };
    act.append(rc);
  }
  tileinfo.classList.add('show');
}

function refreshTileInfo(): void {
  if (!world || !sel || !world.inBounds(sel.gx, sel.gy)) { tileinfo.classList.remove('show'); return; }
  const { gx, gy } = sel;
  const i = world.idx(gx, gy);
  const act = el<HTMLElement>('ti-act');
  const b = sim?.buildingAt(gx, gy) ?? null;

  if (b && sim) {
    const def = BUILDINGS[b.type];
    // ---- şantiye görünümü (ilk inşa) ----
    if (b.buildLeft !== undefined && !b.upgrading) {
      const pct = Math.round((1 - b.buildLeft / (b.buildTotal ?? 1)) * 100);
      el('ti-name').textContent = `🏗️ ${def.name} · inşa ediliyor`;
      el('ti-l1').textContent = `İlerleme: %${pct} · kalan ~${Math.ceil(b.buildLeft)}sn`;
      el('ti-l2').textContent = `Şantiye işçisi: ${b.builders ?? 0} (boşta köylüler hızlandırır)`;
      el('ti-l3').textContent = '';
      act.innerHTML = '';
      act.style.display = 'flex';
      const cancel = document.createElement('button');
      cancel.className = 'danger';
      cancel.textContent = '✖ İptal (%70 iade)';
      cancel.onclick = () => { sim!.applyCommand({ kind: 'demolish', x: gx, y: gy }); hideInfo(); refreshHUD(); };
      act.append(cancel);
      tileinfo.classList.add('show');
      return;
    }
    const upgradingTxt = b.upgrading && b.buildLeft !== undefined
      ? ` · ⬆ %${Math.round((1 - b.buildLeft / (b.buildTotal ?? 1)) * 100)}`
      : '';
    el('ti-name').textContent = `${def.icon} ${def.name} · sv ${b.level}${upgradingTxt}${b.burning ? ' 🔥' : ''}`;
    el('ti-l1').textContent = def.input
      ? `Zincir: ${costStr(def.input)}/sn → ${costStr(def.prod ?? {})}/sn (işçi başına)`
      : def.desc;
    el('ti-l2').textContent = def.maxWorkers
      ? `İşçi: ${b.workers}/${def.maxWorkers} · Boşta: ${sim.player.idle}`
      : '';
    el('ti-l3').textContent = b.burning ? `Sağlamlık: ${Math.max(0, Math.round(b.hp ?? 100))}/100` : '';
    act.innerHTML = '';
    act.style.display = 'flex';

    if (b.burning) {
      const ext = document.createElement('button');
      ext.textContent = '🪣 Söndür';
      ext.disabled = sim.player.idle <= 0;
      ext.onclick = () => { sim!.applyCommand({ kind: 'extinguish', x: gx, y: gy }); refreshTileInfo(); };
      act.append(ext);
    }
    if (def.maxWorkers > 0) {
      const minus = document.createElement('button');
      minus.textContent = '− işçi';
      minus.disabled = b.workers <= 0;
      minus.onclick = () => { sim!.applyCommand({ kind: 'assign', x: gx, y: gy, delta: -1 }); refreshTileInfo(); refreshHUD(); };
      const plus = document.createElement('button');
      plus.textContent = '+ işçi';
      plus.disabled = sim.player.idle <= 0 || b.workers >= def.maxWorkers;
      plus.onclick = () => { sim!.applyCommand({ kind: 'assign', x: gx, y: gy, delta: 1 }); refreshTileInfo(); refreshHUD(); };
      act.append(minus, plus);
    }
    if (b.type === 'barracks') {
      // asker eğitimi (süreli kuyruk) + komutanlar
      el('ti-l2').textContent = `Ordu: ${compLabel(sim.player.units)} · Boşta: ${sim.player.idle}`;
      const q = b.queue ?? [];
      if (q.length) {
        const head = q[0];
        el('ti-l1').textContent =
          `Eğitim: ${UNITS[head.unit].icon} %${Math.round((1 - head.left / head.total) * 100)}`
          + ` · kuyruk: ${q.map(j => UNITS[j.unit].icon).join('')} (${q.length}/5)`;
      }
      for (const u of UNIT_KEYS) {
        const btn = document.createElement('button');
        btn.textContent = `${UNITS[u].icon} ${costStr(UNITS[u].cost)} ⏳${UNITS[u].time}sn`;
        btn.title = `${UNITS[u].name} — ${UNITS[u].desc}`;
        btn.disabled = sim.player.idle <= 0 || !sim.canAfford(UNITS[u].cost) || q.length >= 5;
        btn.onclick = () => { sim!.applyCommand({ kind: 'train', unit: u }); refreshTileInfo(); refreshHUD(); };
        act.append(btn);
      }
      const cmds = sim.military.commanders;
      if (cmds.length < 5) {
        const rc = document.createElement('button');
        rc.textContent = `⭐ Komutan (🪙120 🍞80)`;
        rc.disabled = !sim.canAfford({ gold: 120, food: 80 });
        rc.onclick = () => { sim!.applyCommand({ kind: 'recruitCommander' }); refreshTileInfo(); refreshHUD(); };
        act.append(rc);
      }
      if (cmds.length) {
        el('ti-l3').textContent = cmds
          .map(c => `${CMD_TRAITS[c.trait].icon}${c.name} sv${c.level}${c.captured ? '⛓' : c.busy ? '⚔️' : ''}`)
          .join(' · ');
      }
    }
    // ---- yükseltme (tüm binalar süreli) ----
    if (b.buildLeft === undefined) {
      let upCost = null, upTime = 0;
      if (b.type === 'center') {
        const ups = BUILDINGS.center.upgrade!;
        if (b.level - 1 < ups.length) { upCost = ups[b.level - 1].cost; upTime = ups[b.level - 1].time; }
      } else if (b.level < def.maxLevel) {
        upCost = upgradeCost(def, b.level + 1);
        upTime = upgradeTime(def, b.level + 1);
      }
      if (upCost) {
        const up = document.createElement('button');
        up.textContent = `⬆ Yükselt (${costStr(upCost)}) ⏳${upTime}sn`;
        up.disabled = !sim.canAfford(upCost);
        up.onclick = () => { sim!.applyCommand({ kind: 'upgrade', x: gx, y: gy }); refreshTileInfo(); refreshHUD(); };
        act.append(up);
      }
    }
    if (b.type !== 'center') {
      const dem = document.createElement('button');
      dem.className = 'danger';
      dem.textContent = '🗑 Yık';
      dem.onclick = () => { sim!.applyCommand({ kind: 'demolish', x: gx, y: gy }); hideInfo(); refreshHUD(); };
      act.append(dem);
    }
  } else {
    el('ti-name').textContent = BIOMES[world.tiles[i]].name;
    el('ti-l1').textContent = `Konum: ${gx}, ${gy}`;
    el('ti-l2').textContent = `Yükseklik: ${world.height[i].toFixed(2)}`;
    el('ti-l3').textContent = `Kaynak: ${world.res[i] ?? '—'}`;
    el<HTMLElement>('ti-act').style.display = 'none';
  }
  tileinfo.classList.add('show');
}

// ---------- inşa paneli ----------
const buildpanel = el<HTMLElement>('buildpanel');
const bBuild = el<HTMLElement>('b-build');

function openBuildPanel(): void {
  if (!sim) return;
  const grid = el<HTMLElement>('bgrid');
  grid.innerHTML = '';
  for (const type of Object.keys(BUILDINGS) as BuildingType[]) {
    const def = BUILDINGS[type];
    if (def.unique && sim.player.buildings.some(x => x.type === type)) continue;
    // merkez yoksa önce merkez
    if (!sim.player.hasCenter && type !== 'center') continue;
    const afford = sim.canAfford(def.cost);
    const card = document.createElement('div');
    card.className = 'bcard' + (afford ? '' : ' poor');
    card.innerHTML = `<div class="bic">${def.icon}</div>`
      + `<div class="bnm">${def.name}</div>`
      + `<div class="bcost">${costStr(def.cost)} · ⏳${def.buildTime}sn</div>`;
    card.title = def.desc;
    card.onclick = () => {
      if (!sim!.canAfford(def.cost)) { toast('Yeterli kaynak yok.', 'bad'); return; }
      enterPlace(type);
      closeBuildPanel();
    };
    grid.appendChild(card);
  }
  buildpanel.classList.add('show');
  bBuild.classList.add('on');
}
function closeBuildPanel(): void {
  buildpanel.classList.remove('show');
  bBuild.classList.remove('on');
}

// ---------- yerleştirme modu ----------
const placebar = el<HTMLElement>('placebar');

function enterPlace(type: BuildingType): void {
  if (!world) return;
  hideInfo();
  // hayalet: ekran ortasındaki karo
  const c = cam.screenToWorld(innerWidth / 2, innerHeight / 2);
  const gx = Math.max(0, Math.min(world.W - 1, c.gx));
  const gy = Math.max(0, Math.min(world.H - 1, c.gy));
  ghost = { type, gx, gy, valid: false };
  updateGhostValidity();
  el('pb-name').textContent = `${BUILDINGS[type].icon} ${BUILDINGS[type].name}`;
  placebar.classList.add('show');
  hint('Yer seçmek için haritaya dokun');
}

function updateGhostValidity(): void {
  if (!ghost || !sim) return;
  const def = BUILDINGS[ghost.type];
  const placeOk = sim.canPlaceOn(ghost.type, ghost.gx, ghost.gy);
  const afford = sim.canAfford(def.cost);
  ghost.valid = placeOk && afford;
  const status = el<HTMLElement>('pb-status');
  const ok = el<HTMLButtonElement>('pb-ok');
  if (!placeOk) status.textContent = 'buraya kurulamaz';
  else if (!afford) status.textContent = 'kaynak yetersiz';
  else status.textContent = 'hazır';
  ok.disabled = !ghost.valid;
}

function confirmPlace(): void {
  if (!ghost || !sim) return;
  const wasCenter = ghost.type === 'center';
  const okPlaced = sim.applyCommand({ kind: 'place', building: ghost.type, x: ghost.gx, y: ghost.gy });
  if (okPlaced) {
    cancelPlace();
    if (wasCenter) hint(null);
    refreshHUD();
    saveNow(sim, { tut: { ...Tut } }); // önemli eylem sonrası anında kayıt
  } else {
    updateGhostValidity();
  }
}

function cancelPlace(): void {
  ghost = null;
  placebar.classList.remove('show');
  hint(null);
}

el<HTMLButtonElement>('pb-ok').onclick = confirmPlace;
el<HTMLButtonElement>('pb-cancel').onclick = () => {
  const wasCenter = ghost?.type === 'center';
  cancelPlace();
  // merkez hâlâ yoksa yerleştirme şart — ipucunu koru
  if (wasCenter && sim && !sim.player.hasCenter) {
    hint('Köy kurmak için önce Köy Meydanı gerekli — İnşa menüsünden seç');
  }
};

// ---------- ordu gönderme paneli (Faz 4) ----------
const armypanel = el<HTMLElement>('armypanel');
let apKingdom: number | null = null;
const apComp: UnitComp = { spear: 0, archer: 0, cav: 0 };
let apTactic: Tactic = 'dengeli';
let apRam = false; // koçbaşı (Faz 4 M3)

function closeArmyPanel(): void {
  armypanel.classList.remove('show');
  apKingdom = null;
}

function renderArmyPanel(): void {
  if (!sim || apKingdom === null) return;
  const k = sim.kingdoms.byId(apKingdom);
  if (!k) { closeArmyPanel(); return; }
  el('ap-title').textContent = `⚔️ ${k.name} · Ordu Gönder`;
  const rows = el<HTMLElement>('ap-rows');
  rows.innerHTML = '';
  const units = sim.player.units;
  for (const u of UNIT_KEYS) {
    const have = units[u];
    const row = document.createElement('div');
    row.className = 'aprow';
    const nm = document.createElement('div');
    nm.className = 'apnm';
    nm.innerHTML = `${UNITS[u].icon} ${UNITS[u].name} <small>(eldeki: ${have})</small>`;
    const minus = document.createElement('button');
    minus.textContent = '−';
    minus.disabled = apComp[u] <= 0;
    minus.onclick = () => { apComp[u] = Math.max(0, apComp[u] - 1); renderArmyPanel(); };
    const val = document.createElement('div');
    val.className = 'apval';
    val.textContent = String(apComp[u]);
    const plus = document.createElement('button');
    plus.textContent = '+';
    plus.disabled = apComp[u] >= have;
    plus.onclick = () => { apComp[u] = Math.min(have, apComp[u] + 1); renderArmyPanel(); };
    const all = document.createElement('button');
    all.textContent = apComp[u] >= have ? '0' : 'hepsi';
    all.onclick = () => { apComp[u] = apComp[u] >= have ? 0 : have; renderArmyPanel(); };
    row.append(nm, minus, val, plus, all);
    rows.appendChild(row);
  }
  const tacts = el<HTMLElement>('ap-tactics');
  tacts.innerHTML = '';
  for (const t of Object.keys(TACTICS) as Tactic[]) {
    const b = document.createElement('button');
    b.className = apTactic === t ? 'on' : '';
    b.textContent = `${TACTICS[t].icon} ${TACTICS[t].name}`;
    b.onclick = () => { apTactic = t; renderArmyPanel(); };
    tacts.appendChild(b);
  }
  // koçbaşı: sur savunmasını yarıya indirir (tek kullanımlık)
  const extra = el<HTMLElement>('ap-extra');
  extra.innerHTML = '';
  const ramBtn = document.createElement('button');
  const ramOk = sim.canAfford(RAM_COST);
  if (apRam && !ramOk) apRam = false;
  ramBtn.className = apRam ? 'on' : '';
  ramBtn.textContent = `🐏 Koçbaşı (${costStr(RAM_COST)}) — surları yarıya indirir`;
  ramBtn.disabled = !ramOk && !apRam;
  ramBtn.onclick = () => { apRam = !apRam; renderArmyPanel(); };
  extra.appendChild(ramBtn);
  el('ap-desc').textContent = apRam
    ? `${TACTICS[apTactic].desc} · 🐏 surların etkisi yarıya iner`
    : TACTICS[apTactic].desc;
  const total = compTotal(apComp);
  const go = el<HTMLButtonElement>('ap-go');
  go.textContent = total > 0 ? `⚔️ Saldır (${total})` : '⚔️ Saldır';
  go.disabled = total <= 0;
}

function openArmyPanel(kingdomId: number): void {
  if (!sim) return;
  cancelPlace(); closeBuildPanel(); hideInfo();
  apKingdom = kingdomId;
  apRam = false;
  // varsayılan: tüm ordu seçili
  apComp.spear = sim.player.units.spear;
  apComp.archer = sim.player.units.archer;
  apComp.cav = sim.player.units.cav;
  renderArmyPanel();
  armypanel.classList.add('show');
}

el<HTMLButtonElement>('ap-cancel').onclick = closeArmyPanel;
el<HTMLButtonElement>('ap-go').onclick = () => {
  if (!sim || apKingdom === null) return;
  const ok = sim.applyCommand({
    kind: 'attack', kingdomId: apKingdom,
    comp: { ...apComp }, tactic: apTactic, ram: apRam,
  });
  if (ok) { haptic(25); closeArmyPanel(); refreshHUD(); }
};

// ---------- ses ----------
loadSoundPrefs();
window.addEventListener('pointerdown', () => sndResume(), { once: true });

/** Sim bildirimlerinden ses efekti çıkar (kaba eşleme — M5). */
function sfxForToast(msg: string, kind: string): void {
  if (msg.includes('kuruldu') || msg.includes('yıkıldı')) sfx('build');
  else if (msg.includes('eğitildi')) sfx('train');
  else if (msg.includes('YANGIN') || msg.includes('sıçradı') || msg.includes('kül oldu')) sfx('fire');
  else if (msg.includes('DEPREM')) sfx('quake');
  else if (msg.includes('doğdu')) sfx('birth');
  else if (msg.includes('öldü') || msg.includes('can aldı')) sfx('death');
  else if (msg.includes('altın') && kind === 'good') sfx('coin');
  else if (msg.includes('AKINI') || msg.includes('saldırı ordusu') || msg.includes('üzerine yürüyor')) sfx('horn');
  else if (msg.includes('yenildi') || msg.includes('bozguna') || msg.includes('püskürttün') || msg.includes('Baskın') || msg.includes('savaşa tutuştu') || msg.includes('savaş başladı')) sfx('battle');
  else if (msg.includes('araştırıldı')) sfx('research');
  else if (msg.includes('seviye')) sfx('levelup');
  else if (kind === 'bad') sfx('error');
}

// ---------- öğretici ----------
initTutorial({
  box: el('tutbox'),
  onStepDone: (title, allDone) => {
    if (allDone) { toast('🎓 Öğretici tamamlandı! Artık krallığın senin.', 'good'); sfx('victory'); }
    else { toast(`✓ ${title} tamam!`, 'good'); sfx('levelup'); }
  },
});

// ---------- girdi ----------
function haptic(ms: number): void {
  try { navigator.vibrate?.(ms || 12); } catch { /* desteklenmiyor */ }
}

const input = new TouchInput(cv, cam, view, () => world, {
  haptic,
  onSelect(clientX, clientY) {
    if (!world) return;
    const g = cam.screenToWorld(clientX, clientY);
    if (!world.inBounds(g.gx, g.gy)) { if (!ghost) hideInfo(); return; }
    if (ghost) {
      // yerleştirme modunda: hayaleti taşı
      ghost.gx = g.gx; ghost.gy = g.gy;
      updateGhostValidity();
    } else {
      // önce ordu vuruşu: dokunulan karodaki oyuncu ordusu seçilir (Faz 4)
      const hitArmy = sim?.military.armies.find(a =>
        a.owner === 'player'
        && Math.abs(a.x - 0.5 - g.gx) < 0.9
        && Math.abs(a.y - 0.5 - g.gy) < 0.9);
      if (hitArmy) {
        sel = null;
        armySel = hitArmy.id;
        refreshArmyInfo();
        return;
      }
      armySel = null;
      sel = { gx: g.gx, gy: g.gy };
      refreshTileInfo();
    }
  },
});

// mini haritaya dokun → oraya odaklan
mm.addEventListener('pointerdown', (e) => {
  if (!world) return;
  const r = mm.getBoundingClientRect();
  const gx = Math.floor(((e.clientX - r.left) / r.width) * world.W);
  const gy = Math.floor(((e.clientY - r.top) / r.height) * world.H);
  cam.focusOn(
    Math.max(0, Math.min(world.W - 1, gx)),
    Math.max(0, Math.min(world.H - 1, gy)),
    world,
  );
  haptic(10);
});

// ---------- alt şerit ----------
const bDiplo = el<HTMLElement>('b-diplo');

function closeDiplo(): void {
  closeDiploPanel();
  bDiplo.classList.remove('on');
}

const bTech = el<HTMLElement>('b-tech');

function closeTech(): void {
  closeTechPanel();
  bTech.classList.remove('on');
}

el('b-explore').onclick = () => { cancelPlace(); closeBuildPanel(); closeDiplo(); closeTech(); closeArmyPanel(); };
bBuild.onclick = () => {
  if (buildpanel.classList.contains('show')) closeBuildPanel();
  else { cancelPlace(); closeDiplo(); closeTech(); openBuildPanel(); }
};
bDiplo.onclick = () => {
  if (diploOpen) closeDiplo();
  else {
    cancelPlace(); closeBuildPanel(); closeTech();
    openDiploPanel(); bDiplo.classList.add('on');
  }
};
bTech.onclick = () => {
  if (techOpen) closeTech();
  else {
    cancelPlace(); closeBuildPanel(); closeDiplo();
    openTechPanel(); bTech.classList.add('on');
  }
};
el('b-center').onclick = () => {
  if (!world || !sim) return;
  const c = sim.villageCenter();
  cam.focusOn(c.x, c.y, world);
  haptic(10);
};
// ---------- menü paneli ----------
const menupanel = el<HTMLElement>('menupanel');
const bMenu = el<HTMLElement>('b-menu');

function closeMenu(): void {
  menupanel.classList.remove('show');
  bMenu.classList.remove('on');
}

function refreshMenu(): void {
  el('m-sound').textContent = soundOn() ? '🔊 Ses: Açık' : '🔇 Ses: Kapalı';
  el<HTMLInputElement>('m-music').value = String(Math.round(getMusicVol() * 100));
  el<HTMLInputElement>('m-sfx').value = String(Math.round(getSfxVol() * 100));
}

bMenu.onclick = () => {
  if (menupanel.classList.contains('show')) closeMenu();
  else {
    cancelPlace(); closeBuildPanel(); closeDiplo(); closeTech(); closeArmyPanel();
    refreshMenu();
    menupanel.classList.add('show');
    bMenu.classList.add('on');
  }
};

el('m-sound').onclick = () => { toggleSound(!soundOn()); refreshMenu(); };
el<HTMLInputElement>('m-music').oninput = (e) => {
  setMusicVol(parseInt((e.target as HTMLInputElement).value, 10) / 100);
};
el<HTMLInputElement>('m-sfx').oninput = (e) => {
  setSfxVol(parseInt((e.target as HTMLInputElement).value, 10) / 100);
  sfx('click');
};
el('m-export').onclick = () => {
  if (sim) saveNow(sim, { tut: { ...Tut } }); // en güncel durumu yaz
  const json = exportSave();
  if (!json) { toast('Dışa aktarılacak kayıt yok.', 'bad'); return; }
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'kralliklar-cagi-kayit.json';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('💾 Kayıt indirildi.', 'good');
};
el('m-import').onclick = () => el<HTMLInputElement>('fileinput').click();
el<HTMLInputElement>('fileinput').onchange = (e) => {
  const input = e.target as HTMLInputElement;
  const f = input.files?.[0];
  input.value = '';
  if (!f) return;
  void f.text().then(txt => {
    if (importSave(txt)) {
      toast('📂 Kayıt yüklendi, oyun açılıyor…', 'good');
      closeMenu();
      continueGame();
    } else {
      toast('Geçersiz veya eski sürüm kayıt dosyası.', 'bad');
    }
  });
};
el('m-new').onclick = () => {
  if (sim && !sim.gameOver) saveNow(sim, { tut: { ...Tut } }); // mevcut oyunu kaybetme
  closeMenu();
  el('boot').style.display = 'flex';
  renderSlots();
  world = null; sim = null; minimap = null;
  cancelPlace(); closeBuildPanel(); closeDiplo(); closeTech(); closeArmyPanel(); hideInfo();
};

// diplomasi paneli bağlantısı
initDiplo({
  panel: el('diplopanel'),
  list: el('diplolist'),
  getSim: () => sim,
  onAction: (kingdomId, action) => {
    if (!sim) return;
    sim.applyCommand({ kind: 'diplo', kingdomId, action });
    haptic(12);
    refreshHUD();
  },
  onGoto: (x, y) => {
    if (!world) return;
    cam.focusOn(x, y, world);
    closeDiplo();
    haptic(10);
  },
  onAttack: (kingdomId) => {
    if (!sim) return;
    closeDiplo();
    openArmyPanel(kingdomId); // birim seçici + taktik (Faz 4)
    haptic(15);
  },
});

// teknoloji paneli bağlantısı
initTechPanel({
  panel: el('techpanel'),
  list: el('techlist'),
  getSim: () => sim,
  onResearch: (id) => {
    if (!sim) return;
    sim.applyCommand({ kind: 'research', techId: id });
    haptic(15);
    refreshHUD();
  },
});

// ---------- son ekran ----------
let endShown = false;

function showEndScreen(): void {
  if (!sim?.gameOver || endShown) return;
  endShown = true;
  const g = sim.gameOver;
  el('end-title').textContent = g.won ? '🏆 ZAFER' : '💀 YENİLGİ';
  el('end-title').style.color = g.won ? 'var(--gold)' : 'var(--danger)';
  el('end-msg').textContent = g.msg;
  el('end-stats').innerHTML =
    `<div>Hayatta kalınan süre: <b>${g.stats.minutes} dk</b></div>`
    + `<div>Ulaşılan yıl: <b>${g.stats.year}</b></div>`
    + `<div>Nüfus: <b>${g.stats.pop}</b></div>`
    + `<div>Bina: <b>${g.stats.buildings}</b></div>`
    + `<div>İtibar: <b>${g.stats.reputation}</b></div>`
    + `<div>Kalan rakip krallık: <b>${g.stats.kingdomsLeft}</b></div>`;
  el('endscreen').classList.add('show');
  clearSave(); // biten oyunun kaydı tutulmaz
}

el<HTMLButtonElement>('end-again').onclick = () => {
  el('endscreen').classList.remove('show');
  endShown = false;
  world = null; sim = null; minimap = null;
  cancelPlace(); closeBuildPanel(); closeDiplo(); closeTech(); closeArmyPanel(); hideInfo();
  el('boot').style.display = 'flex';
  renderSlots();
};

// ---------- dünya kurulumu ----------
function finishSetup(focusX: number, focusY: number): void {
  if (!world || !sim) return;
  tintMap = buildTintMap(world); // kozmetik çayır ton yamaları
  terrain.invalidate(); // yeni dünya → arazi ön-belleği tazelenir
  minimap = new MiniMap(world);
  sel = null; ghost = null;
  hideInfo();
  el('opt-seed').textContent = String(world.seed);
  cam.zoom = 1.1;
  cam.x = 0; cam.y = 0;
  cam.focusOn(focusX, focusY, world);
  el('boot').style.display = 'none';
  el<HTMLElement>('loadmsg').style.display = 'none';
  refreshHUD();
}

function startGame(size: number): void {
  el<HTMLElement>('loadmsg').style.display = 'block';
  setTimeout(() => {
    const seed = (Math.random() * 1e9) | 0; // yalnız tohum üretimi — sim dışı
    world = new World(size, size, seed);
    sim = new Sim(world);
    // rakip krallıklar (boyuta göre) + başlangıç vadisi
    const kc = size <= 192 ? (size <= 128 ? 6 : 6) : size <= 256 ? 9 : 13;
    sim.kingdoms.spawn(kc);
    sim.wildlife.spawn();
    const spot = sim.pickStartRegion();
    sim.revealStartArea(spot.x, spot.y, 25);
    resetTutorial();
    finishSetup(spot.x, spot.y);
    // ilk görev: köy meydanı yerleştir (hayalet başlangıç vadisinde)
    enterPlace('center');
    if (ghost) {
      (ghost as Ghost).gx = spot.x;
      (ghost as Ghost).gy = spot.y;
      updateGhostValidity();
    }
    hint('Köy meydanını kurmak için bir yer seç');
  }, 30);
}

function continueGame(): void {
  el<HTMLElement>('loadmsg').style.display = 'block';
  setTimeout(() => {
    const r = restoreGame();
    if (!r) {
      toast('Kayıt okunamadı — yeni oyun başlat.', 'bad');
      el<HTMLElement>('loadmsg').style.display = 'none';
      return;
    }
    world = r.world;
    sim = r.sim;
    resetTutorial(r.ui.tut);
    // çevrimdışı ilerleme: sen yokken köy kaba üretim yaptı
    const rep = applyOfflineProgress(sim, r.elapsedSec);
    const c = sim.villageCenter();
    finishSetup(c.x, c.y);
    // meydan hiç YOKSA yerleştirme iste (şantiye halindeki meydan sayılır!)
    const centerExists = sim.player.buildings.some(b => b.type === 'center');
    if (!centerExists) {
      enterPlace('center');
      hint('Köy meydanını kurmak için bir yer seç');
    } else if (rep) {
      // hemen yeni damgayla kaydet — yenileme çifte ilerleme vermesin
      saveNow(sim, { tut: { ...Tut } });
      const parts = rep.gains.map(([k, v]) => `${RES_ICONS[k]}+${v}`).join(' ');
      toast(
        `⏰ Sen yokken (${fmtDur(rep.seconds)}): ${parts || 'üretim yok'}`
        + (rep.eaten > 0 ? ` · halk ${rep.eaten}🍞 yedi` : ''),
        'good',
      );
      refreshHUD();
    } else {
      toast('▶ Kaldığın yerden devam ediyorsun.', 'good');
    }
  }, 30);
}

// ---------- kayıt slotları (boot ekranı) ----------
function fmtDur(secs: number): string {
  const m = Math.round(secs / 60);
  if (m < 60) return `${m}dk`;
  return `${Math.floor(m / 60)}sa ${m % 60}dk`;
}

function fmtAgo(ms: number | null): string {
  if (!ms) return '';
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return 'az önce';
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} saat önce`;
  return `${Math.floor(h / 24)} gün önce`;
}

function renderSlots(): void {
  const wrap = el<HTMLElement>('slots');
  wrap.innerHTML = '';
  for (let i = 0; i < SLOT_COUNT; i++) {
    const m = saveMeta(i);
    const card = document.createElement('div');
    card.className = 'slotcard' + (m ? '' : ' empty');
    const info = document.createElement('div');
    info.className = 'sl-info';
    if (m) {
      info.innerHTML = `<div class="sl-t">📜 Kayıt ${i + 1}</div>`
        + `<div class="sl-d">${m.year}. yıl · 👥 ${m.pop} · ${m.W}×${m.H}`
        + (m.savedAt ? ` · ${fmtAgo(m.savedAt)}` : '') + '</div>';
      const cont = document.createElement('button');
      cont.className = 'primary';
      cont.textContent = '▶ Devam';
      cont.onclick = () => { setActiveSlot(i); continueGame(); };
      const del = document.createElement('button');
      del.className = 'danger';
      del.textContent = '🗑';
      del.title = 'Kaydı sil';
      del.onclick = () => {
        if (confirm(`Kayıt ${i + 1} silinsin mi? (${m.year}. yıl, ${m.pop} nüfus)`)) {
          clearSave(i);
          renderSlots();
        }
      };
      card.append(info, cont, del);
    } else {
      info.innerHTML = `<div class="sl-t">Boş Kayıt ${i + 1}</div>`
        + '<div class="sl-d">Yeni bir krallık kur</div>';
      const nw = document.createElement('button');
      nw.className = 'primary';
      nw.textContent = '🌍 Yeni Dünya';
      nw.onclick = () => {
        setActiveSlot(i);
        startGame(parseInt(el<HTMLSelectElement>('opt-size').value, 10));
      };
      card.append(info, nw);
    }
    wrap.appendChild(card);
  }
}

/* depo hazır olunca slotları göster (IndexedDB açılışı asenkron) */
void initPersist().then(renderSlots);

// ---------- otomatik kayıt ----------
// aralıklı + uygulama arka plana geçince (docs/10-KAYIT); biten oyun kaydedilmez
setInterval(() => { if (sim && !sim.gameOver) saveNow(sim, { tut: { ...Tut } }); }, 20000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && sim && !sim.gameOver) saveNow(sim, { tut: { ...Tut } });
});
window.addEventListener('pagehide', () => { if (sim && !sim.gameOver) saveNow(sim, { tut: { ...Tut } }); });

// ---------- döngü ----------
const SIM_HZ = 10, SIM_STEP = 1 / SIM_HZ;
let simAcc = 0;
let lastT = 0;
let fpsFrames = 0, fpsAcc = 0, hudAcc = 0, renderT = 0;

function loop(t: number): void {
  if (!lastT) lastT = t;
  let dt = (t - lastT) / 1000;
  lastT = t;
  if (!isFinite(dt) || dt < 0) dt = 0;
  if (dt > 0.25) dt = 0.25;
  renderT += dt;

  let alpha = 1;
  if (sim && world && minimap) {
    // sabit zaman adımı — determinizmin şartı
    simAcc += dt;
    let guard = 0;
    while (simAcc >= SIM_STEP && guard < 5) { sim.tick(SIM_STEP); simAcc -= SIM_STEP; guard++; }
    if (guard >= 5) simAcc = 0;
    alpha = Math.max(0, Math.min(1, simAcc / SIM_STEP));

    // sim olaylarını bildirim + sese çevir
    for (const ev of sim.drainEvents()) {
      toast(ev.msg, ev.kind);
      sfxForToast(ev.msg, ev.kind);
    }
    updateMusic(sim);

    input.applyMomentum(dt);
    if (ghost) updateGhostValidity();

    const night = dayLight(sim.time.t) < 0.35;
    const frame: Frame = {
      ctx, world, cam, view,
      tileSprites,
      bSprites: night ? bSpritesNight : bSpritesDay,
      treeSprites,
      capSprite: night ? capNight : capDay,
      tintMap, resIcons, terrain, armySel,
      sim, sel, ghost, alpha, t: renderT, stats,
    };
    drawScene(frame);
    minimap.draw(mmx, cam, view, sim, dt);

    hudAcc += dt;
    if (hudAcc >= 0.25) {
      hudAcc = 0;
      refreshHUD();
      updateTutorial(sim);
      if (armySel !== null) refreshArmyInfo(); // ordu kartı canlı kalsın
    }

    if (sim.gameOver) showEndScreen();
  }

  fpsFrames++; fpsAcc += dt;
  if (fpsAcc >= 0.5) {
    el('hud-fps').textContent = `${Math.round(fpsFrames / fpsAcc)} fps`;
    fpsFrames = 0; fpsAcc = 0;
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ---------- PWA: service worker (yalnız üretim derlemesinde) ----------
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .catch(() => { /* SW yoksa da oyun normal çalışır */ });
  });
}
