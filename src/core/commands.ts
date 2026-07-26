/* ============================================================
   KOMUTLAR — UI simülasyonu ASLA doğrudan değiştirmez;
   her değişiklik bir Command olarak girer (docs/01-MIMARI).
   Bu, determinizmin ve ileride çok oyunculunun (lockstep) temelidir:
   kayıt/replay = tohum + komut listesi.
   ============================================================ */
import type { BuildingType } from '../data/buildings';

export type Command =
  | { kind: 'place'; building: BuildingType; x: number; y: number }
  | { kind: 'assign'; x: number; y: number; delta: 1 | -1 }
  | { kind: 'upgradeCenter'; x: number; y: number }
  | { kind: 'demolish'; x: number; y: number };
