/* ============================================================
   KOMUTLAR — UI simülasyonu ASLA doğrudan değiştirmez;
   her değişiklik bir Command olarak girer (docs/01-MIMARI).
   Bu, determinizmin ve ileride çok oyunculunun (lockstep) temelidir:
   kayıt/replay = tohum + komut listesi.
   ============================================================ */
import type { BuildingType } from '../data/buildings';
import type { DiploAction } from './kingdoms';
import type { UnitKey } from '../data/units';
import type { TechId } from '../data/techs';

export type Command =
  | { kind: 'place'; building: BuildingType; x: number; y: number }
  | { kind: 'assign'; x: number; y: number; delta: 1 | -1 }
  | { kind: 'upgrade'; x: number; y: number }
  | { kind: 'demolish'; x: number; y: number }
  | { kind: 'extinguish'; x: number; y: number }
  | { kind: 'diplo'; kingdomId: number; action: DiploAction }
  | { kind: 'train'; unit: UnitKey }
  | { kind: 'attack'; kingdomId: number }
  | { kind: 'research'; techId: TechId }
  | { kind: 'recruitCommander' };
