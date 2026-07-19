import React, { useState, useEffect, useRef } from "react";
import { 
  Castle, Compass, Award, Users, BookOpen, Scroll, HelpCircle, 
  Coins, Axe, Wheat, Mountain, Zap, RefreshCw, Volume2, Shield
} from "lucide-react";
import { 
  GameState, BuildingType, TroopType, Resources, WorldMapItem, Army, Troops, Quest, ResearchTech 
} from "./types";
import { playSound } from "./utils/audio";
import CityView from "./components/CityView";
import WorldMap from "./components/WorldMap";
import CommanderView from "./components/CommanderView";
import QuestTracker from "./components/QuestTracker";
import AdvisorModal from "./components/AdvisorModal";

// Initial game constants
const INITIAL_RESOURCES: Resources = {
  gold: 1500,
  wood: 1500,
  food: 1500,
  stone: 800,
  speedups: 15 // minutes
};

const INITIAL_BUILDINGS = (): Record<BuildingType, any> => ({
  townHall: {
    id: "townHall",
    name: "Belediye Binası (Town Hall)",
    level: 1,
    upgradeCost: { gold: 300, wood: 400, food: 200, stone: 100, speedups: 0 },
    upgradeDuration: 15,
    upgradeTimeLeft: null,
    description: "Krallığın idari merkezi. Geliştirilmesi diğer binaların seviye sınırını kaldırır."
  },
  farm: {
    id: "farm",
    name: "Buğday Çiftliği (Farm)",
    level: 1,
    upgradeCost: { gold: 100, wood: 150, food: 0, stone: 50, speedups: 0 },
    upgradeDuration: 8,
    upgradeTimeLeft: null,
    description: "Askerlerinizi beslemek ve eğitmek için gerekli yiyeceği üretir."
  },
  lumberMill: {
    id: "lumberMill",
    name: "Odun Deposu (Lumber Mill)",
    level: 1,
    upgradeCost: { gold: 120, wood: 0, food: 150, stone: 60, speedups: 0 },
    upgradeDuration: 10,
    upgradeTimeLeft: null,
    description: "Binaları inşa etmek ve okçuları donatmak için odun üretir."
  },
  goldMine: {
    id: "goldMine",
    name: "Altın Ocağı (Gold Mine)",
    level: 1,
    upgradeCost: { gold: 0, wood: 200, food: 100, stone: 150, speedups: 0 },
    upgradeDuration: 12,
    upgradeTimeLeft: null,
    description: "Komutan yetiştirmek, süvariler satın almak ve araştırmalar yapmak için altın üretir."
  },
  barracks: {
    id: "barracks",
    name: "Askeri Kışla (Barracks)",
    level: 1,
    upgradeCost: { gold: 200, wood: 250, food: 250, stone: 100, speedups: 0 },
    upgradeDuration: 18,
    upgradeTimeLeft: null,
    description: "Ordunuz için güçlü Piyadeler, Süvariler ve Okçular eğitir."
  },
  academy: {
    id: "academy",
    name: "Araştırma Akademisi (Academy)",
    level: 1,
    upgradeCost: { gold: 400, wood: 300, food: 200, stone: 200, speedups: 0 },
    upgradeDuration: 20,
    upgradeTimeLeft: null,
    description: "Krallığın toplama hızını ve ordu saldırı/savunma güçlerini artıran araştırmalar yapar."
  }
});

const INITIAL_COMMANDERS = (): any[] => [
  {
    id: "suntzu",
    name: "Sun Tzu",
    level: 1,
    exp: 0,
    maxExp: 100,
    role: "Piyade Uzmanı",
    roleType: "infantry",
    activeSkill: {
      name: "Savaş Sanatı",
      description: "Düşman ordusuna %25 ek saldırı gücüyle vurur ve alan hasarı verir.",
      damage: 40,
      heal: 0
    },
    unlocked: true,
    avatar: "⚔️",
    color: "bg-red-600",
    speedBonus: 10,
    gatherBonus: 5,
    combatBonus: 20
  },
  {
    id: "joan",
    name: "Joan of Arc",
    level: 1,
    exp: 0,
    maxExp: 100,
    role: "Toplayıcı",
    roleType: "gathering",
    activeSkill: {
      name: "İlahi Koruma",
      description: "Ordudaki yaralı askerleri iyileştirir ve toplama hızını %15 artırır.",
      damage: 0,
      heal: 30
    },
    unlocked: false,
    avatar: "🌸",
    color: "bg-cyan-600",
    speedBonus: 8,
    gatherBonus: 25,
    combatBonus: 5
  },
  {
    id: "caesar",
    name: "Julius Caesar",
    level: 1,
    exp: 0,
    maxExp: 100,
    role: "Süvari Uzmanı",
    roleType: "cavalry",
    activeSkill: {
      name: "İmparatorluk Hücumu",
      description: "Süvarilerin hücum hasarını ve ordu hızını geçici olarak %30 artırır.",
      damage: 50,
      heal: 0
    },
    unlocked: false,
    avatar: "🦁",
    color: "bg-amber-600",
    speedBonus: 25,
    gatherBonus: 5,
    combatBonus: 25
  },
  {
    id: "cleo",
    name: "Cleopatra",
    level: 1,
    exp: 0,
    maxExp: 100,
    role: "Toplayıcı",
    roleType: "gathering",
    activeSkill: {
      name: "Nil'in Bereketi",
      description: "Tüm kaynak toplama hızlarını %40 artırır ve taşıma kapasitesini büyütür.",
      damage: 10,
      heal: 10
    },
    unlocked: false,
    avatar: "👑",
    color: "bg-emerald-600",
    speedBonus: 5,
    gatherBonus: 40,
    combatBonus: 5
  }
];

const INITIAL_WORLD_ITEMS = (): WorldMapItem[] => [
  { id: "node_gold_1", type: "node_gold", name: "Zengin Altın Ocağı", level: 1, x: 25, y: 30, resourcesLeft: 1000, maxResources: 1000 },
  { id: "node_gold_2", type: "node_gold", name: "Zengin Altın Ocağı", level: 2, x: 75, y: 80, resourcesLeft: 2000, maxResources: 2000 },
  { id: "node_wood_1", type: "node_wood", name: "Balta Girmemiş Orman", level: 1, x: 15, y: 70, resourcesLeft: 1500, maxResources: 1500 },
  { id: "node_wood_2", type: "node_wood", name: "Kızılçam Ormanı", level: 2, x: 80, y: 25, resourcesLeft: 3000, maxResources: 3000 },
  { id: "node_food_1", type: "node_food", name: "Geniş Arpa Tarlası", level: 1, x: 45, y: 15, resourcesLeft: 2000, maxResources: 2000 },
  { id: "node_food_2", type: "node_food", name: "Geniş Arpa Tarlası", level: 2, x: 30, y: 85, resourcesLeft: 4000, maxResources: 4000 },
  { id: "node_stone_1", type: "node_stone", name: "Mermer Taş Ocağı", level: 1, x: 60, y: 35, resourcesLeft: 1000, maxResources: 1000 },
  { id: "node_stone_2", type: "node_stone", name: "Granit Taş Ocağı", level: 2, x: 90, y: 65, resourcesLeft: 2500, maxResources: 2500 },
  { id: "barb_1", type: "barbarian", name: "Haydut Kampı", level: 1, x: 35, y: 45, health: 500, maxHealth: 500 },
  { id: "barb_2", type: "barbarian", name: "Asi Generaller", level: 2, x: 65, y: 60, health: 1200, maxHealth: 1200 },
  { id: "barb_3", type: "barbarian", name: "Kızıl Ejder İni", level: 3, x: 10, y: 10, health: 3000, maxHealth: 3000 },
  { id: "rival_1", type: "rival", name: "Bizans Kalesi", level: 1, x: 85, y: 10, health: 5000, maxHealth: 5000 },
  { id: "rival_2", type: "rival", name: "Norman Hisarı", level: 2, x: 5, y: 90, health: 8000, maxHealth: 8000 }
];

const INITIAL_QUESTS = (): Quest[] => [
  { id: "q1", title: "Merkezi Yönetim", description: "Belediye Binasını (Town Hall) Seviye 2 yapın.", targetType: "upgrade_building", targetId: "townHall", targetValue: 2, currentValue: 1, rewarded: false, rewards: { gold: 300, wood: 300, food: 300, speedups: 2 } },
  { id: "q2", title: "Askeri Güçlenme", description: "En az 100 Süvari eğitin.", targetType: "train_troops", targetId: "cavalry", targetValue: 100, currentValue: 50, rewarded: false, rewards: { gold: 200, food: 500, stone: 100, speedups: 1 } },
  { id: "q3", title: "Barbar Fatihi", description: "Haritadaki 1 adet Barbar Kampını bozguna uğratın.", targetType: "defeat_barbarians", targetValue: 1, currentValue: 0, rewarded: false, rewards: { gold: 500, speedups: 5 } },
  { id: "q4", title: "Lojistik Destek", description: "Haritadan toplamda 800 Odun toplayın.", targetType: "gather_resources", targetId: "wood", targetValue: 800, currentValue: 0, rewarded: false, rewards: { food: 400, stone: 200 } },
  { id: "q5", title: "Bilgi Işığı", description: "Araştırma Akademisini Seviye 2 yapın.", targetType: "upgrade_building", targetId: "academy", targetValue: 2, currentValue: 1, rewarded: false, rewards: { gold: 400, wood: 400, stone: 300, speedups: 3 } }
];

const INITIAL_RESEARCH = (): Record<string, ResearchTech> => ({
  combat_boost: {
    id: "combat_boost",
    name: "Metal İşleme (Attack)",
    level: 1,
    maxLevel: 5,
    cost: { gold: 300, wood: 200, food: 100, stone: 100, speedups: 0 },
    duration: 30,
    timeLeft: null,
    description: "Silah kalitesini artırarak tüm askerlerinize %10 saldırı gücü kazandırır.",
    effect: "+10% Saldırı"
  },
  speed_boost: {
    id: "speed_boost",
    name: "Yol İnşaatı (March Speed)",
    level: 1,
    maxLevel: 5,
    cost: { gold: 250, wood: 300, food: 150, stone: 50, speedups: 0 },
    duration: 25,
    timeLeft: null,
    description: "Haritadaki askeri yürüyüş hızını %15 artırır.",
    effect: "+15% Yürüyüş Hızı"
  },
  gather_boost: {
    id: "gather_boost",
    name: "Gelişmiş Tarım (Gather Rate)",
    level: 1,
    maxLevel: 5,
    cost: { gold: 200, wood: 200, food: 300, stone: 100, speedups: 0 },
    duration: 20,
    timeLeft: null,
    description: "Haritadaki kaynak toplama hızını %20 artırır.",
    effect: "+20% Toplama Hızı"
  }
});

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [subTab, setSubTab] = useState<"binalar" | "komutanlar" | "gorevler">("binalar");
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
  const [battleLogs, setBattleLogs] = useState<string[]>([]);
  const stateRef = useRef<GameState | null>(null);

  // Initialize and load from local storage
  useEffect(() => {
    const saved = localStorage.getItem("kingdoms_rise_2d_save_v2");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setGameState(parsed);
        stateRef.current = parsed;
        return;
      } catch (e) {
        console.warn("Could not parse saved state. Initializing fresh.");
      }
    }

    const freshState: GameState = {
      resources: INITIAL_RESOURCES,
      buildings: INITIAL_BUILDINGS(),
      troops: { infantry: 120, cavalry: 50, archers: 30 },
      trainingQueue: null,
      research: INITIAL_RESEARCH(),
      commanders: INITIAL_COMMANDERS(),
      worldItems: INITIAL_WORLD_ITEMS(),
      armies: [],
      quests: INITIAL_QUESTS(),
      playerPower: 4500,
      playerName: "Eşsiz Kral",
      currentScreen: "world"
    };
    setGameState(freshState);
    stateRef.current = freshState;
  }, []);

  // Save state helper
  const saveState = (newState: GameState) => {
    setGameState(newState);
    stateRef.current = newState;
    localStorage.setItem("kingdoms_rise_2d_save_v2", JSON.stringify(newState));
  };

  // Reset Game
  const handleResetGame = () => {
    if (window.confirm("Krallığı sıfırlamak istediğinize emin misiniz? Tüm ilerlemeniz silinecektir!")) {
      playSound("defeat");
      localStorage.removeItem("kingdoms_rise_2d_save_v2");
      const freshState: GameState = {
        resources: INITIAL_RESOURCES,
        buildings: INITIAL_BUILDINGS(),
        troops: { infantry: 120, cavalry: 50, archers: 30 },
        trainingQueue: null,
        research: INITIAL_RESEARCH(),
        commanders: INITIAL_COMMANDERS(),
        worldItems: INITIAL_WORLD_ITEMS(),
        armies: [],
        quests: INITIAL_QUESTS(),
        playerPower: 4500,
        playerName: "Eşsiz Kral",
        currentScreen: "world"
      };
      saveState(freshState);
      setBattleLogs([]);
    }
  };

  // Calculate power formula
  const recalculatePower = (state: GameState): number => {
    const bldgsPower = Object.values(state.buildings).reduce((acc, b) => acc + (b.level * 200), 0);
    const troopsPower = (state.troops.infantry + state.troops.cavalry + state.troops.archers) * 3;
    const commsPower = state.commanders.filter(c => c.unlocked).reduce((acc, c) => acc + (c.level * 1000), 0);
    const researchPower = Object.values(state.research).reduce((acc, r) => acc + (r.level * 150), 0);
    return bldgsPower + troopsPower + commsPower + researchPower;
  };

  // Main real-time tick loop (every 1 second)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!stateRef.current) return;
      let state = { ...stateRef.current };
      let changed = false;

      // 1. Resource Generation from buildings
      const farmLvl = state.buildings.farm.level;
      const lumberLvl = state.buildings.lumberMill.level;
      const goldLvl = state.buildings.goldMine.level;
      const stoneLvl = state.buildings.townHall.level; // stone grows from Town Hall level

      state.resources = {
        ...state.resources,
        food: state.resources.food + Math.floor((farmLvl * 3 + 2) / 2), // slower per-second scale
        wood: state.resources.wood + Math.floor((lumberLvl * 2.5 + 2) / 2),
        gold: state.resources.gold + Math.floor((goldLvl * 1.5 + 1) / 2),
        stone: state.resources.stone + Math.floor((stoneLvl * 0.8 + 0.5) / 2),
        speedups: state.resources.speedups
      };
      changed = true;

      // 2. Upgrading Buildings
      let buildingCompleted = false;
      state.buildings = Object.keys(state.buildings).reduce((acc, key) => {
        const b = { ...state.buildings[key as BuildingType] };
        if (b.upgradeTimeLeft !== null) {
          b.upgradeTimeLeft -= 1;
          if (b.upgradeTimeLeft <= 0) {
            b.level += 1;
            b.upgradeTimeLeft = null;
            buildingCompleted = true;
            
            // Progress building upgrade quests
            state.quests = state.quests.map((q) => {
              if (q.targetType === "upgrade_building" && q.targetId === b.id) {
                return { ...q, currentValue: Math.max(q.currentValue, b.level) };
              }
              return q;
            });
          }
        }
        acc[key as BuildingType] = b;
        return acc;
      }, {} as Record<BuildingType, any>);

      if (buildingCompleted) {
        playSound("complete");
      }

      // 3. Training Troops
      if (state.trainingQueue) {
        let q = { ...state.trainingQueue };
        q.timeLeft -= 1;
        if (q.timeLeft <= 0) {
          // Finished!
          state.troops = {
            ...state.troops,
            [q.troopType]: state.troops[q.troopType] + q.count
          };
          
          // Progress troop quests
          state.quests = state.quests.map((qst) => {
            if (qst.targetType === "train_troops" && qst.targetId === q.troopType) {
              return { ...qst, currentValue: state.troops[q.troopType] };
            }
            return qst;
          });

          state.trainingQueue = null;
          playSound("complete");
        } else {
          state.trainingQueue = q;
        }
      }

      // 4. Tech Researching
      let researchCompleted = false;
      state.research = Object.keys(state.research).reduce((acc, rId) => {
        const r = { ...state.research[rId] };
        if (r.timeLeft !== null) {
          r.timeLeft -= 1;
          if (r.timeLeft <= 0) {
            r.level += 1;
            r.timeLeft = null;
            researchCompleted = true;
          }
        }
        acc[rId] = r;
        return acc;
      }, {} as Record<string, ResearchTech>);

      if (researchCompleted) {
        playSound("complete");
      }

      // 5. Armies movement & activities
      if (state.armies.length > 0) {
        let updatedArmies: Army[] = [];
        
        for (let army of state.armies) {
          let updatedArmy = { ...army };
          const comm = state.commanders.find(c => c.id === army.commanderId);
          
          // Speed values based on research + commander + troop composition
          const marchSpeedMultiplier = 1 + ((state.research.speed_boost.level * 0.15) + ((comm?.speedBonus || 0) * 0.01));
          const stepSize = 0.05 * marchSpeedMultiplier; // base step size percentage distance

          if (updatedArmy.status === "marching") {
            updatedArmy.progress += stepSize;
            
            // Interpolate coordinates
            updatedArmy.x = updatedArmy.startX + (updatedArmy.targetX - updatedArmy.startX) * Math.min(1, updatedArmy.progress);
            updatedArmy.y = updatedArmy.startY + (updatedArmy.targetY - updatedArmy.startY) * Math.min(1, updatedArmy.progress);

            if (updatedArmy.progress >= 1) {
              // Arrived!
              updatedArmy.progress = 0;
              
              if (updatedArmy.marchingDirection === "to_target") {
                const targetNode = state.worldItems.find(w => w.id === updatedArmy.targetId);
                
                if (targetNode) {
                  if (targetNode.type.startsWith("node_")) {
                    updatedArmy.status = "gathering";
                    updatedArmy.gatheredResources = {
                      type: targetNode.type.replace("node_", "") as any,
                      amount: 0
                    };
                  } else {
                    // Barbarian camp or Rival City
                    updatedArmy.status = "fighting";
                    updatedArmy.battleLog = [`⚔️ ${comm?.name} komutasındaki ordu ${targetNode.name} ile savaşa girdi!`];
                  }
                } else {
                  // Fallback return if target disappeared
                  updatedArmy.marchingDirection = "returning";
                  updatedArmy.startX = updatedArmy.x;
                  updatedArmy.startY = updatedArmy.y;
                  updatedArmy.targetX = 50;
                  updatedArmy.targetY = 50;
                }
              } else {
                // Arrived back home!
                // Unload resources
                if (updatedArmy.gatheredResources) {
                  const t = updatedArmy.gatheredResources.type;
                  const amt = updatedArmy.gatheredResources.amount;
                  state.resources = {
                    ...state.resources,
                    [t]: state.resources[t] + amt
                  };
                  
                  // Progress wood/gold gathering quests
                  state.quests = state.quests.map((qst) => {
                    if (qst.targetType === "gather_resources" && qst.targetId === t) {
                      return { ...qst, currentValue: qst.currentValue + amt };
                    }
                    return qst;
                  });

                  setBattleLogs(prev => [`🪵 Sefer Başarılı: Komutan ${comm?.name} şehre ${amt} adet ${t === "wood" ? "Odun" : t === "gold" ? "Altın" : t === "food" ? "Yiyecek" : "Taş"} getirdi!`, ...prev]);
                }

                // Return troops to pool
                state.troops = {
                  infantry: state.troops.infantry + updatedArmy.troops.infantry,
                  cavalry: state.troops.cavalry + updatedArmy.troops.cavalry,
                  archers: state.troops.archers + updatedArmy.troops.archers
                };

                // Gain commander experience
                state.commanders = state.commanders.map((c) => {
                  if (c.id === updatedArmy.commanderId) {
                    const newExp = c.exp + 25;
                    const maxExp = c.maxExp;
                    if (newExp >= maxExp) {
                      return { ...c, level: c.level + 1, exp: newExp - maxExp, maxExp: Math.floor(maxExp * 1.5) };
                    }
                    return { ...c, exp: newExp };
                  }
                  return c;
                });

                playSound("complete");
                continue; // delete this army by omitting from updated list
              }
            } else {
              // Play march rustle occasionally
              if (Math.random() < 0.2) {
                playSound("march");
              }
            }
            updatedArmies.push(updatedArmy);
          } else if (updatedArmy.status === "gathering") {
            const targetNodeIndex = state.worldItems.findIndex(w => w.id === updatedArmy.targetId);
            const targetNode = state.worldItems[targetNodeIndex];

            if (targetNode && targetNode.resourcesLeft !== undefined && targetNode.resourcesLeft > 0) {
              // Gathering speed variables
              const gatherBonus = 1 + ((state.research.gather_boost.level * 0.20) + ((comm?.gatherBonus || 0) * 0.01));
              const gatherRate = Math.floor(5 * gatherBonus); // base gather speed
              const finalGathered = Math.min(gatherRate, targetNode.resourcesLeft);
              
              // Max capacity of troop loads (15 carrying capacity per troop)
              const totalTroops = updatedArmy.troops.infantry + updatedArmy.troops.cavalry + updatedArmy.troops.archers;
              const maxLoad = totalTroops * 15;
              const currentLoad = updatedArmy.gatheredResources?.amount || 0;

              if (currentLoad < maxLoad) {
                // Gather more
                updatedArmy.gatheredResources = {
                  type: updatedArmy.gatheredResources!.type,
                  amount: currentLoad + finalGathered
                };
                
                // Deduct from node
                const updatedItems = [...state.worldItems];
                updatedItems[targetNodeIndex] = {
                  ...targetNode,
                  resourcesLeft: targetNode.resourcesLeft - finalGathered
                };
                state.worldItems = updatedItems;
              } else {
                // Load is full! Return home
                updatedArmy.status = "marching";
                updatedArmy.marchingDirection = "returning";
                updatedArmy.progress = 0;
                updatedArmy.startX = updatedArmy.x;
                updatedArmy.startY = updatedArmy.y;
                updatedArmy.targetX = 50;
                updatedArmy.targetY = 50;
              }
            } else {
              // Node depleted or vanished! Return
              updatedArmy.status = "marching";
              updatedArmy.marchingDirection = "returning";
              updatedArmy.progress = 0;
              updatedArmy.startX = updatedArmy.x;
              updatedArmy.startY = updatedArmy.y;
              updatedArmy.targetX = 50;
              updatedArmy.targetY = 50;
            }
            updatedArmies.push(updatedArmy);
          } else if (updatedArmy.status === "fighting") {
            // Battle tick
            const targetIndex = state.worldItems.findIndex(w => w.id === updatedArmy.targetId);
            const target = state.worldItems[targetIndex];

            if (target && target.health !== undefined && target.health > 0) {
              playSound("battle");

              // Battle logic based on active units
              // Rock-paper-scissors factors: Cavalry beats Archers, Archers beats Infantry, Infantry beats Cavalry
              // Damage computations
              const combatMultiplier = 1 + ((state.research.combat_boost.level * 0.1) + ((comm?.combatBonus || 0) * 0.01));
              
              const armyDmg = Math.floor(
                (updatedArmy.troops.infantry * 1.5 + updatedArmy.troops.cavalry * 2.5 + updatedArmy.troops.archers * 2.0) * combatMultiplier
              );
              
              const targetDmg = target.level * 80;

              // Apply damage
              const updatedHealth = Math.max(0, target.health - armyDmg);
              
              // Enemy hit back, reduce player troops proportionally
              const totalTroops = updatedArmy.troops.infantry + updatedArmy.troops.cavalry + updatedArmy.troops.archers;
              const troopLosses = Math.min(totalTroops, Math.floor(targetDmg / 8));
              
              let newTroops = { ...updatedArmy.troops };
              if (troopLosses > 0 && totalTroops > 0) {
                const ratio = troopLosses / totalTroops;
                newTroops.infantry = Math.max(0, Math.floor(newTroops.infantry * (1 - ratio)));
                newTroops.cavalry = Math.max(0, Math.floor(newTroops.cavalry * (1 - ratio)));
                newTroops.archers = Math.max(0, Math.floor(newTroops.archers * (1 - ratio)));
              }

              updatedArmy.troops = newTroops;
              const newTotalTroops = newTroops.infantry + newTroops.cavalry + newTroops.archers;

              const updatedItems = [...state.worldItems];
              updatedItems[targetIndex] = {
                ...target,
                health: updatedHealth
              };
              state.worldItems = updatedItems;

              if (newTotalTroops <= 0) {
                // Defeat! Army destroyed
                setBattleLogs(prev => [`💀 Bozgun: Komutan ${comm?.name} liderliğindeki ordumuz ${target.name} karşısında yok oldu!`, ...prev]);
                playSound("defeat");
                continue; // army deleted
              }

              if (updatedHealth <= 0) {
                // Victory! Return home with loot cargo
                playSound("victory");
                updatedArmy.status = "marching";
                updatedArmy.marchingDirection = "returning";
                updatedArmy.progress = 0;
                updatedArmy.startX = updatedArmy.x;
                updatedArmy.startY = updatedArmy.y;
                updatedArmy.targetX = 50;
                updatedArmy.targetY = 50;

                // Grant loot cargo based on target type
                if (target.type === "barbarian") {
                  updatedArmy.gatheredResources = {
                    type: "gold",
                    amount: target.level * 250
                  };
                  
                  // Progress defeat barbarian quests
                  state.quests = state.quests.map((q) => {
                    if (q.targetType === "defeat_barbarians") {
                      return { ...q, currentValue: q.currentValue + 1 };
                    }
                    return q;
                  });

                  setBattleLogs(prev => [`⚔️ Zafer! Komutan ${comm?.name} barbar kampını temizledi ve ${target.level * 250} Altın ganimet elde etti!`, ...prev]);
                } else if (target.type === "rival") {
                  updatedArmy.gatheredResources = {
                    type: "gold",
                    amount: target.level * 600
                  };
                  setBattleLogs(prev => [`🏰 Kuşatma Zaferi! Komutan ${comm?.name} düşman kalesini yıktı ve ${target.level * 600} Altın hazine yağmaladı!`, ...prev]);
                }

                // Reset target map node so they can respawn later
                updatedItems[targetIndex] = {
                  ...target,
                  health: target.maxHealth,
                  x: Math.floor(Math.random() * 80) + 10, // respawn coordinates
                  y: Math.floor(Math.random() * 80) + 10
                };
                state.worldItems = updatedItems;
              }
            } else {
              // Target already destroyed or empty, return
              updatedArmy.status = "marching";
              updatedArmy.marchingDirection = "returning";
              updatedArmy.progress = 0;
              updatedArmy.startX = updatedArmy.x;
              updatedArmy.startY = updatedArmy.y;
              updatedArmy.targetX = 50;
              updatedArmy.targetY = 50;
            }
            updatedArmies.push(updatedArmy);
          } else {
            updatedArmies.push(updatedArmy);
          }
        }
        state.armies = updatedArmies;
      }

      // Re-calculate Player Power
      state.playerPower = recalculatePower(state);

      if (changed) {
        saveState(state);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Handler: Upgrade building
  const handleUpgradeBuilding = (id: BuildingType) => {
    if (!gameState) return;
    const b = gameState.buildings[id];
    
    // Check cost
    const canAfford = Object.entries(b.upgradeCost).every(([res, val]) => (gameState.resources as any)[res] >= val);
    if (!canAfford) return;

    // Deduct cost and set timer
    const updatedResources = { ...gameState.resources };
    Object.entries(b.upgradeCost).forEach(([res, val]) => {
      const numVal = Number(val) || 0;
      (updatedResources as any)[res] -= numVal;
    });

    const updatedBuildings = { ...gameState.buildings };
    updatedBuildings[id] = {
      ...b,
      upgradeTimeLeft: b.upgradeDuration
    };

    const newState = {
      ...gameState,
      resources: updatedResources,
      buildings: updatedBuildings
    };
    saveState(newState);
  };

  // Handler: Speedup building upgrade (reduces timer by 5 minutes instantly per speedup)
  const handleUseSpeedupBuilding = (id: BuildingType) => {
    if (!gameState || gameState.resources.speedups <= 0) return;
    const b = gameState.buildings[id];
    if (b.upgradeTimeLeft === null) return;

    // Deduct 1 speedup, speed up by up to 5 minutes (300 seconds)
    const updatedResources = {
      ...gameState.resources,
      speedups: gameState.resources.speedups - 1
    };

    const updatedBuildings = { ...gameState.buildings };
    const secondsToDeduct = 300;
    const newTimeLeft = Math.max(0, b.upgradeTimeLeft - secondsToDeduct);

    updatedBuildings[id] = {
      ...b,
      upgradeTimeLeft: newTimeLeft > 0 ? newTimeLeft : 0
    };

    const newState = {
      ...gameState,
      resources: updatedResources,
      buildings: updatedBuildings
    };
    saveState(newState);
  };

  // Handler: Train troops
  const handleTrainTroops = (troopType: TroopType, count: number) => {
    if (!gameState || gameState.trainingQueue) return;
    
    // Compute costs
    const costPerTroop = troopType === "infantry" ? { food: 4, wood: 2 } : troopType === "cavalry" ? { food: 5, gold: 3 } : { wood: 5, gold: 2 };
    const foodCost = (costPerTroop.food || 0) * count;
    const woodCost = (costPerTroop.wood || 0) * count;
    const goldCost = (costPerTroop.gold || 0) * count;

    if (gameState.resources.food < foodCost || gameState.resources.wood < woodCost || gameState.resources.gold < goldCost) {
      alert("Yetersiz kaynak!");
      return;
    }

    // Deduct cost and start training queue
    const updatedResources = {
      ...gameState.resources,
      food: gameState.resources.food - foodCost,
      wood: gameState.resources.wood - woodCost,
      gold: gameState.resources.gold - goldCost
    };

    const durationSeconds = Math.max(10, Math.floor(count * 0.15)); // training duration scales with count

    const newState = {
      ...gameState,
      resources: updatedResources,
      trainingQueue: {
        troopType,
        count,
        timeLeft: durationSeconds,
        totalDuration: durationSeconds
      }
    };
    saveState(newState);
  };

  // Handler: Research Tech
  const handleResearchTech = (id: string) => {
    if (!gameState) return;
    const tech = gameState.research[id];
    
    const meetsCost = Object.entries(tech.cost).every(([res, val]) => (gameState.resources as any)[res] >= val);
    if (!meetsCost) return;

    // Deduct cost
    const updatedResources = { ...gameState.resources };
    Object.entries(tech.cost).forEach(([res, val]) => {
      const numVal = Number(val) || 0;
      (updatedResources as any)[res] -= numVal;
    });

    const updatedResearch = { ...gameState.research };
    updatedResearch[id] = {
      ...tech,
      timeLeft: tech.duration
    };

    const newState = {
      ...gameState,
      resources: updatedResources,
      research: updatedResearch
    };
    saveState(newState);
  };

  // Handler: Speedup Tech Research
  const handleUseSpeedupResearch = (id: string) => {
    if (!gameState || gameState.resources.speedups <= 0) return;
    const tech = gameState.research[id];
    if (tech.timeLeft === null) return;

    const updatedResources = {
      ...gameState.resources,
      speedups: gameState.resources.speedups - 1
    };

    const updatedResearch = { ...gameState.research };
    const newTime = Math.max(0, tech.timeLeft - 300);

    updatedResearch[id] = {
      ...tech,
      timeLeft: newTime > 0 ? newTime : 0
    };

    const newState = {
      ...gameState,
      resources: updatedResources,
      research: updatedResearch
    };
    saveState(newState);
  };

  // Handler: Unlock Commander
  const handleUnlockCommander = (id: string, costGold: number) => {
    if (!gameState || gameState.resources.gold < costGold) return;

    const updatedResources = {
      ...gameState.resources,
      gold: gameState.resources.gold - costGold
    };

    const updatedCommanders = gameState.commanders.map((c) => {
      if (c.id === id) {
        return { ...c, unlocked: true };
      }
      return c;
    });

    const newState = {
      ...gameState,
      resources: updatedResources,
      commanders: updatedCommanders
    };
    saveState(newState);
  };

  // Handler: Level Up/Upgrade Commander
  const handleUpgradeCommander = (id: string, costGold: number) => {
    if (!gameState || gameState.resources.gold < costGold) return;

    const updatedResources = {
      ...gameState.resources,
      gold: gameState.resources.gold - costGold
    };

    const updatedCommanders = gameState.commanders.map((c) => {
      if (c.id === id) {
        return { 
          ...c, 
          level: c.level + 1,
          speedBonus: c.speedBonus + 2,
          gatherBonus: c.gatherBonus + 3,
          combatBonus: c.combatBonus + 5
        };
      }
      return c;
    });

    const newState = {
      ...gameState,
      resources: updatedResources,
      commanders: updatedCommanders
    };
    saveState(newState);
  };

  // Handler: Deploy army to Map
  const handleDeployArmy = (commanderId: string, troops: Troops, targetId: string, action: "gather" | "attack") => {
    if (!gameState) return;
    const targetItem = gameState.worldItems.find(w => w.id === targetId);
    if (!targetItem) return;

    // Deduct troops from player pool
    const updatedTroops = {
      infantry: gameState.troops.infantry - troops.infantry,
      cavalry: gameState.troops.cavalry - troops.cavalry,
      archers: gameState.troops.archers - troops.archers
    };

    // Calculate total army combat power
    const comm = gameState.commanders.find(c => c.id === commanderId);
    const commBonus = 1 + ((comm?.combatBonus || 0) * 0.01);
    const totalPower = Math.floor(
      (troops.infantry * 10 + troops.cavalry * 18 + troops.archers * 14) * commBonus
    );

    const newArmy: Army = {
      id: `army_${Date.now()}`,
      commanderId,
      troops,
      x: 50, // Starts at Home Castle
      y: 50,
      startX: 50,
      startY: 50,
      targetX: targetItem.x,
      targetY: targetItem.y,
      status: "marching",
      targetId,
      progress: 0,
      marchingDirection: "to_target",
      totalPower
    };

    const newState = {
      ...gameState,
      troops: updatedTroops,
      armies: [...gameState.armies, newArmy]
    };
    saveState(newState);
    
    setBattleLogs(prev => [`🚩 Sefer Başlatıldı: Komutan ${comm?.name} liderliğindeki ordu ${targetItem.name} konumuna doğru yola çıktı.`, ...prev]);
  };

  // Handler: Recall army back home instantly (converts its direction to returning from current coords)
  const handleRecallArmy = (armyId: string) => {
    if (!gameState) return;
    
    const updatedArmies = gameState.armies.map((army) => {
      if (army.id === armyId) {
        return {
          ...army,
          status: "marching" as const,
          marchingDirection: "returning" as const,
          progress: 0,
          startX: army.x,
          startY: army.y,
          targetX: 50,
          targetY: 50
        };
      }
      return army;
    });

    const newState = {
      ...gameState,
      armies: updatedArmies
    };
    saveState(newState);
  };

  // Handler: Claim Quest Reward
  const handleClaimReward = (questId: string) => {
    if (!gameState) return;
    const q = gameState.quests.find(qst => qst.id === questId);
    if (!q) return;

    const updatedResources = { ...gameState.resources };
    Object.entries(q.rewards).forEach(([res, val]) => {
      (updatedResources as any)[res] += val;
    });

    const updatedQuests = gameState.quests.map((qst) => {
      if (qst.id === questId) {
        return { ...qst, rewarded: true };
      }
      return qst;
    });

    const newState = {
      ...gameState,
      resources: updatedResources,
      quests: updatedQuests
    };
    saveState(newState);
  };

  // Handler: Advisor Custom Decision Event Impact
  const handleApplyEventEffect = (cost: Partial<Resources>, rewardText: string) => {
    if (!gameState) return;
    
    // Deduct cost and display reward in logs
    const updatedResources = { ...gameState.resources };
    Object.entries(cost).forEach(([res, val]) => {
      (updatedResources as any)[res] = Math.max(0, (gameState.resources as any)[res] - val);
    });

    // Check what the reward was, parse simple reward values like +300 Odun
    if (rewardText.includes("+300 Odun")) {
      updatedResources.wood += 300;
    }
    if (rewardText.includes("+150 Taş")) {
      updatedResources.stone += 150;
    }
    if (rewardText.includes("+100 Odun")) {
      updatedResources.wood += 100;
    }

    const newState = {
      ...gameState,
      resources: updatedResources
    };
    saveState(newState);

    setBattleLogs(prev => [`🏛️ Vezirlik Kararı Uygulandı: ${rewardText}`, ...prev]);
  };

  if (!gameState) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center text-center text-stone-400">
        <Castle className="w-16 h-16 text-amber-500 animate-spin mb-4" />
        <h1 className="font-display font-bold text-lg text-stone-200">Krallık Kuruluyor...</h1>
        <p className="text-xs text-stone-500">Lütfen bekleyin, parşömenler açılıyor.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans select-none antialiased overflow-hidden">
      
      {/* 1. WORLD MAP SCREEN */}
      {gameState.currentScreen === "world" && (
        <WorldMap
          worldItems={gameState.worldItems}
          armies={gameState.armies}
          commanders={gameState.commanders}
          availableTroops={gameState.troops}
          resources={gameState.resources}
          quests={gameState.quests}
          playerPower={gameState.playerPower}
          battleLogs={battleLogs}
          onDeployArmy={handleDeployArmy}
          onRecallArmy={handleRecallArmy}
          onEnterCity={() => {
            saveState({ ...gameState, currentScreen: "city" });
          }}
          onUnlockCommander={handleUnlockCommander}
          onUpgradeCommander={handleUpgradeCommander}
          onClaimReward={handleClaimReward}
        />
      )}

      {/* 2. CITY VIEW SCREEN */}
      {gameState.currentScreen === "city" && (
        <div className="w-screen h-screen relative overflow-y-auto bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pb-24">
          
          {/* Shared Immersive Game HUD overlay */}
          <div className="sticky top-0 left-0 w-full z-40 p-4 pointer-events-none flex flex-wrap items-start justify-between gap-4">
            {/* Player profile info pill */}
            <div className="pointer-events-auto bg-stone-950/85 border border-amber-500/30 backdrop-blur-md p-2 px-4 rounded-2xl flex items-center gap-3 shadow-xl shadow-black/40">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-xl border border-amber-400 shadow-inner">
                  👑
                </div>
                <span className="absolute -bottom-1 -right-1 bg-amber-500 text-stone-950 font-black text-[8px] px-1 rounded-full border border-stone-950">
                  L5
                </span>
              </div>
              <div>
                <h2 className="font-display font-black text-xs text-stone-100 tracking-tight flex items-center gap-1">
                  Eşsiz Kral <span className="text-[8px] text-amber-400 bg-amber-500/10 px-1 rounded font-mono border border-amber-500/20">CITY</span>
                </h2>
                <span className="text-[9px] text-stone-400 flex items-center gap-0.5">
                  🎖️ Güç: <span className="font-mono text-amber-400 font-bold">{gameState.playerPower}</span>
                </span>
              </div>
            </div>

            {/* Resources capsules */}
            <div className="pointer-events-auto bg-stone-950/80 border border-stone-800/80 backdrop-blur-md p-2 px-4 rounded-2xl flex items-center gap-4 shadow-xl shadow-black/40">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold" title="Altın">
                <span>🪙</span>
                <span className="text-yellow-400">{gameState.resources.gold}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold" title="Odun">
                <span>🪵</span>
                <span className="text-emerald-400">{gameState.resources.wood}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold" title="Yiyecek">
                <span>🌾</span>
                <span className="text-amber-400">{gameState.resources.food}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold" title="Taş">
                <span>🪨</span>
                <span className="text-stone-300">{gameState.resources.stone}</span>
              </div>
              <div className="h-3 w-px bg-stone-850" />
              <div className="flex items-center gap-1 text-xs font-mono font-bold text-amber-500" title="Yükseltme Hızlandırması">
                <span>⚡</span>
                <span>{gameState.resources.speedups} dk</span>
              </div>
            </div>
          </div>

          {/* Core CityView workspace */}
          <main className="max-w-7xl mx-auto px-4 pt-2">
            <CityView
              buildings={gameState.buildings}
              resources={gameState.resources}
              trainingQueue={gameState.trainingQueue}
              research={gameState.research}
              onUpgradeBuilding={handleUpgradeBuilding}
              onUseSpeedupBuilding={handleUseSpeedupBuilding}
              onTrainTroops={handleTrainTroops}
              onResearchTech={handleResearchTech}
              onUseSpeedupResearch={handleUseSpeedupResearch}
            />
          </main>

          {/* ROK-Style Floating Round Map Button on bottom-left */}
          <button
            id="btn-return-to-map"
            onClick={() => {
              playSound("complete");
              saveState({ ...gameState, currentScreen: "world" });
            }}
            className="fixed bottom-6 left-6 z-50 p-4 bg-gradient-to-tr from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 rounded-full border-2 border-amber-300 shadow-2xl shadow-amber-500/25 transform hover:scale-115 active:scale-95 transition-all flex items-center justify-center gap-2 group pointer-events-auto animate-bounce"
            title="Dünya Haritasına Dön"
          >
            <Compass className="w-7 h-7 text-stone-950 animate-spin" style={{ animationDuration: "12s" }} />
            <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 font-display font-black text-[11px] tracking-wider whitespace-nowrap">HARİTAYA DÖN (WORLD MAP)</span>
          </button>
        </div>
      )}
    </div>
  );
}
