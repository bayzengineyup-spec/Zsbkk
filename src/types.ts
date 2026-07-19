export type ResourceType = "gold" | "wood" | "food" | "stone";

export interface Resources {
  gold: number;
  wood: number;
  food: number;
  stone: number;
  speedups: number; // in minutes
}

export type BuildingType =
  | "townHall"
  | "farm"
  | "lumberMill"
  | "goldMine"
  | "barracks"
  | "academy";

export interface Building {
  id: BuildingType;
  name: string;
  level: number;
  upgradeCost: Resources;
  upgradeDuration: number; // in seconds
  upgradeTimeLeft: number | null; // null if not upgrading
  description: string;
}

export interface Troops {
  infantry: number;
  cavalry: number;
  archers: number;
}

export type TroopType = "infantry" | "cavalry" | "archers";

export interface Commander {
  id: string;
  name: string;
  level: number;
  exp: number;
  maxExp: number;
  role: "Piyade Uzmanı" | "Süvari Uzmanı" | "Okçu Uzmanı" | "Toplayıcı";
  roleType: "infantry" | "cavalry" | "archers" | "gathering";
  activeSkill: {
    name: string;
    description: string;
    damage: number;
    heal: number;
  };
  unlocked: boolean;
  avatar: string; // Lucide icon name or emoji
  color: string; // Tailwind color class for background/border
  speedBonus: number; // multi-factor
  gatherBonus: number; // multi-factor
  combatBonus: number; // multi-factor
}

export type WorldItemType =
  | "barbarian"
  | "node_gold"
  | "node_wood"
  | "node_food"
  | "node_stone"
  | "rival";

export interface WorldMapItem {
  id: string;
  type: WorldItemType;
  name: string;
  level: number;
  x: number; // percentage coordinate 0-100
  y: number; // percentage coordinate 0-100
  resourcesLeft?: number;
  maxResources?: number;
  health?: number;
  maxHealth?: number;
}

export type ArmyStatus = "marching" | "gathering" | "fighting" | "returning" | "idle";

export interface Army {
  id: string;
  commanderId: string;
  troops: Troops;
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  status: ArmyStatus;
  targetId: string | null; // world map item id
  progress: number; // 0 to 1
  marchingDirection: "to_target" | "returning";
  gatheredResources?: {
    type: ResourceType;
    amount: number;
  };
  battleLog?: string[];
  totalPower: number;
}

export type QuestTargetType =
  | "upgrade_building"
  | "train_troops"
  | "defeat_barbarians"
  | "gather_resources";

export interface Quest {
  id: string;
  title: string;
  description: string;
  targetType: QuestTargetType;
  targetId?: string; // building type, troop type, etc.
  targetValue: number;
  currentValue: number;
  rewarded: boolean;
  rewards: Partial<Resources>;
}

export interface ResearchTech {
  id: string;
  name: string;
  level: number;
  maxLevel: number;
  cost: Resources;
  duration: number; // in seconds
  timeLeft: number | null; // null if not researching
  description: string;
  effect: string;
}

export interface GameState {
  resources: Resources;
  buildings: Record<BuildingType, Building>;
  troops: Troops;
  trainingQueue: {
    troopType: TroopType;
    count: number;
    timeLeft: number;
    totalDuration: number;
  } | null;
  research: Record<string, ResearchTech>;
  commanders: Commander[];
  worldItems: WorldMapItem[];
  armies: Army[];
  quests: Quest[];
  playerPower: number;
  playerName: string;
  currentScreen: "city" | "world";
}
