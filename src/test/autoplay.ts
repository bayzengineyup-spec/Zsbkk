/* ============================================================
   OTOMATİK OYUNCU (denge turu) — oyunu YALNIZ komutlarla oynar,
   hile yapmaz. Basit ama makul strateji: yiyecek → odun/taş →
   evler → depo/zincir → akademi/kışla → ordu → en zayıf krallığa
   saldırı. Amaç: ekonomi→ordu→fetih eğrisini ölçmek.
   ============================================================ */
import type { Sim } from '../core/sim';
import { BUILDINGS, type BuildingType } from '../data/buildings';
import { TECHS, type TechId } from '../data/techs';
import { compTotal } from '../data/units';

export interface BalanceReport {
  seed: number;
  minutes: number;
  /** dakikalar (sim zamanı) — null: hiç ulaşılamadı */
  tFarmReady: number | null;
  tBread: number | null;
  tArmy20: number | null;
  tFirstAttack: number | null;
  tFirstConquest: number | null;
  starved: number;
  raids: number;
  fires: number;
  attacks: number;
  endPop: number;
  endArmy: number;
  endFood: number;
  kingdomsLeft: number;
  gameOver: string | null;
  debug?: string;
}

export function autoplay(s: Sim, minutes: number, seed: number): BalanceReport {
  const rep: BalanceReport = {
    seed, minutes,
    tFarmReady: null, tBread: null, tArmy20: null,
    tFirstAttack: null, tFirstConquest: null,
    starved: 0, raids: 0, fires: 0, attacks: 0,
    endPop: 0, endArmy: 0, endFood: 0, kingdomsLeft: 0, gameOver: null,
    debug: '',
  };
  const min = () => Math.round((s.time.t / 60) * 10) / 10;
  const c = s.villageCenter();

  const findSpot = (type: BuildingType): { x: number; y: number } | null => {
    for (let r = 1; r <= 12; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          if (s.canPlaceOn(type, c.x + dx, c.y + dy)) return { x: c.x + dx, y: c.y + dy };
        }
      }
    }
    return null;
  };
  const count = (t: BuildingType): number =>
    s.player.buildings.filter(b => b.type === t).length;
  const sites = (): number =>
    s.player.buildings.filter(b => b.buildLeft !== undefined && !b.upgrading).length;
  const tryBuild = (t: BuildingType): boolean => {
    if (!s.canAfford(BUILDINGS[t].cost)) return false;
    const p2 = findSpot(t);
    return p2 ? s.applyCommand({ kind: 'place', building: t, x: p2.x, y: p2.y }) : false;
  };

  const ticksTotal = minutes * 600; // 0.1 sn adım
  for (let i = 0; i < ticksTotal; i++) {
    s.tick(0.1);
    if (s.gameOver) break;
    for (const ev of s.drainEvents()) {
      if (ev.msg.includes('açlıktan öldü')) rep.starved++;
      if (ev.msg.includes('BARBAR')) rep.raids++;
      if (ev.msg.includes('YANGIN') || ev.msg.includes('ateşe verildi')) rep.fires++;
      if (ev.msg.includes('yenildi!') && rep.tFirstConquest === null) rep.tFirstConquest = min();
    }
    if (i % 20 !== 0) continue; // karar: 2 sn'de bir
    const p = s.player;

    // yangın söndür
    if (p.idle > 0) {
      const burning = p.buildings.find(b => b.burning);
      if (burning) s.applyCommand({ kind: 'extinguish', x: burning.x, y: burning.y });
    }

    // inşaat önceliği: SIRALI istek listesi — koşulu tutan ilk BAŞARILI
    // inşaatta durur; yer/kaynak bulunamazsa sıradakine geçer (kilitlenmez)
    if (sites() === 0) {
      const wants: Array<[boolean, BuildingType]> = [
        [count('center') < 1, 'center'], // felaket sigortası
        [count('farm') < 1, 'farm'],
        [count('woodcutter') < 1, 'woodcutter'],
        [count('farm') < 2, 'farm'],
        [count('hunter') < 1 && count('farm') < 1, 'hunter'], // tarlasız harita yedeği
        [count('woodcutter') < 2, 'woodcutter'],
        [count('quarry') < 1, 'quarry'],
        [p.popCap - p.pop <= 1 && count('house') < 8 && p.res.wood > 60, 'house'],
        [count('woodcutter') < 3 && p.res.wood > 60, 'woodcutter'],
        [count('storehouse') < 1 && p.res.wood > 110, 'storehouse'],
        [count('farm') < 3 && p.res.food < p.pop * 14 && p.res.wood > 60, 'farm'],
        [count('barracks') < 1 && p.res.wood > 130 && p.res.stone > 60, 'barracks'],
        [count('lumbermill') < 1 && p.res.wood > 140, 'lumbermill'],
        [count('mill') < 1 && p.res.plank > 15, 'mill'],
        [count('bakery') < 1 && p.res.plank > 15, 'bakery'],
        [count('farm') < 4 && p.res.food < p.pop * 8 && p.res.wood > 80, 'farm'],
        [count('academy') < 1 && p.res.wood > 220 && p.res.stone > 130, 'academy'],
        [count('quarry') < 2 && p.res.wood > 220, 'quarry'],
        [count('mine') < 1 && p.res.wood > 280 && p.res.stone > 120, 'mine'],
        [count('wall') < 3 && p.res.stone > 300, 'wall'],
        [count('house') < 12 && p.popCap - p.pop <= 2 && p.res.wood > 120, 'house'],
      ];
      for (const [cond, t] of wants) {
        if (cond && tryBuild(t)) break;
      }
    }

    // İŞÇİ YÖNETİMİ — gerçek oyuncu gibi:
    // bıçkıhane odunu keresteye çevirir; kereste yeterliyse işçiyi ÇEK
    for (const b of p.buildings) {
      if (b.type !== 'lumbermill' || b.buildLeft !== undefined) continue;
      if (p.res.plank > 90 && b.workers > 0) {
        s.applyCommand({ kind: 'assign', x: b.x, y: b.y, delta: -1 });
      }
    }
    // boştakileri üretime KATMANLI dağıt (küçük köyde 1, büyükte 2 yedek):
    // 1) her oduncuya en az 1 işçi (odun geliri kesilmesin — kilit önleyici)
    // 2) tarlalar dolsun (yiyecek)  3) kalan her şey
    const hold = p.pop > 8 ? 2 : 1;
    const assignTo = (b: { x: number; y: number }): boolean =>
      s.applyCommand({ kind: 'assign', x: b.x, y: b.y, delta: 1 });
    if (p.idle > hold) {
      for (const b of p.buildings) {
        if (p.idle <= hold) break;
        if (b.type === 'woodcutter' && b.buildLeft === undefined && b.workers < 1) assignTo(b);
      }
      const ordered = [...p.buildings].sort((a, b2) =>
        (a.type === 'farm' ? 0 : 1) - (b2.type === 'farm' ? 0 : 1));
      for (const b of ordered) {
        if (p.idle <= hold) break;
        const def = BUILDINGS[b.type];
        if (def.maxWorkers <= 0 || b.buildLeft !== undefined) continue;
        // kereste bolsa bıçkıhaneye yeni işçi verme
        if (b.type === 'lumbermill' && p.res.plank > 60) continue;
        if (b.workers < def.maxWorkers) assignTo(b);
      }
    }

    // araştırma (30 sn'de bir, uygun olmayanlar sessizce reddedilir)
    if (i % 300 === 0 && count('academy') > 0) {
      for (const id of Object.keys(TECHS) as TechId[]) {
        if (!s.tech.has(id)) s.applyCommand({ kind: 'research', techId: id });
      }
    }

    // asker eğit (yiyecek güvenliyse — akın sonrası kıtlıkta durur)
    if (count('barracks') > 0 && p.idle > 2 && p.res.food > 400) {
      s.applyCommand({ kind: 'train', unit: i % 60 === 0 ? 'archer' : 'spear' });
    }

    // kilometre taşı: ordu 20'ye ulaştı (saldırıdan ÖNCE ölç)
    if (rep.tArmy20 === null && compTotal(p.units) >= 20) rep.tArmy20 = min();

    // saldırı: ordu >= 20 → en zayıf krallığa
    if (compTotal(p.units) >= 20 && s.military.armies.length === 0 && s.kingdoms.kingdoms.length) {
      const ks = s.kingdoms.kingdoms.slice()
        .sort((a, b) => (a.army + a.tiles.size) - (b.army + b.tiles.size));
      if (s.applyCommand({ kind: 'attack', kingdomId: ks[0].id, tactic: 'dengeli' })) {
        rep.attacks++;
        if (rep.tFirstAttack === null) rep.tFirstAttack = min();
      }
    }

    // kilometre taşları
    if (rep.tFarmReady === null
      && s.player.buildings.some(b => b.type === 'farm' && b.buildLeft === undefined)) {
      rep.tFarmReady = min();
    }
    // zincir "kuruldu" = fırın çalışır durumda ve işçili (ekmek stoğu
    // anında yendiği için stok ölçümü yanıltıcı — denge davranışı)
    if (rep.tBread === null
      && s.player.buildings.some(b => b.type === 'bakery' && b.buildLeft === undefined && b.workers > 0)) {
      rep.tBread = min();
    }
  }

  rep.endPop = s.player.pop;
  rep.endArmy = compTotal(s.player.units);
  rep.endFood = Math.round(s.player.res.food);
  rep.kingdomsLeft = s.kingdoms.kingdoms.length;
  rep.gameOver = s.gameOver ? (s.gameOver.won ? 'ZAFER' : 'YENİLGİ') : null;
  // bina dökümü + kaynak özeti (teşhis)
  const bc = new Map<string, number>();
  for (const b of s.player.buildings) bc.set(b.type, (bc.get(b.type) ?? 0) + 1);
  rep.debug = [...bc].map(([t, n]) => `${t}:${n}`).join(' ')
    + ` | 🪵${Math.round(s.player.res.wood)} 🪨${Math.round(s.player.res.stone)}`
    + ` 🪙${Math.round(s.player.res.gold)} 🪚${Math.round(s.player.res.plank)}`
    + ` boşta:${s.player.idle}`;
  return rep;
}
