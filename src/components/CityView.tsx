import React, { useState } from "react";
import { 
  Castle, Wheat, Axe, Pickaxe, Swords, GraduationCap, 
  ArrowUp, Timer, ShieldAlert, CheckCircle, ChevronRight, Zap,
  Map, List, Compass
} from "lucide-react";
import { Building, BuildingType, Resources, TroopType, ResearchTech } from "../types";
import { playSound } from "../utils/audio";

interface CityViewProps {
  buildings: Record<BuildingType, Building>;
  resources: Resources;
  trainingQueue: {
    troopType: TroopType;
    count: number;
    timeLeft: number;
    totalDuration: number;
  } | null;
  research: Record<string, ResearchTech>;
  onUpgradeBuilding: (id: BuildingType) => void;
  onUseSpeedupBuilding: (id: BuildingType) => void;
  onTrainTroops: (troopType: TroopType, count: number) => void;
  onResearchTech: (id: string) => void;
  onUseSpeedupResearch: (id: string) => void;
}

export default function CityView({
  buildings,
  resources,
  trainingQueue,
  research,
  onUpgradeBuilding,
  onUseSpeedupBuilding,
  onTrainTroops,
  onResearchTech,
  onUseSpeedupResearch
}: CityViewProps) {
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingType | null>("townHall");
  const [trainCount, setTrainCount] = useState<number>(50);
  const [viewMode, setViewMode] = useState<"isometric" | "list">("isometric");

  // Building styling definitions and 3D emoji props
  const buildingMeta: Record<BuildingType, { 
    icon: React.ReactNode; 
    color: string; 
    bg: string; 
    border: string;
    emoji: string;
    plotX: string;
    plotY: string;
    accentBg: string;
    accentBorder: string;
  }> = {
    townHall: {
      icon: <Castle className="w-8 h-8 text-amber-500 animate-pulse" />,
      color: "text-amber-500",
      bg: "bg-amber-950/40",
      border: "border-amber-500/40",
      emoji: "🏛️", // Grand Town Hall
      plotX: "50%",
      plotY: "38%",
      accentBg: "bg-blue-950/80",
      accentBorder: "border-blue-500/40"
    },
    farm: {
      icon: <Wheat className="w-8 h-8 text-emerald-500" />,
      color: "text-emerald-500",
      bg: "bg-emerald-950/40",
      border: "border-emerald-500/30",
      emoji: "🌾", // Farm & windmill
      plotX: "22%",
      plotY: "32%",
      accentBg: "bg-emerald-950/80",
      accentBorder: "border-emerald-500/40"
    },
    lumberMill: {
      icon: <Axe className="w-8 h-8 text-lime-500" />,
      color: "text-lime-500",
      bg: "bg-lime-950/40",
      border: "border-lime-500/30",
      emoji: "🪵", // Lumber mill forest shop
      plotX: "20%",
      plotY: "68%",
      accentBg: "bg-lime-950/80",
      accentBorder: "border-lime-500/40"
    },
    goldMine: {
      icon: <Pickaxe className="w-8 h-8 text-yellow-500" />,
      color: "text-yellow-500",
      bg: "bg-yellow-950/40",
      border: "border-yellow-500/30",
      emoji: "🪙", // Gold mine cavern
      plotX: "50%",
      plotY: "72%",
      accentBg: "bg-yellow-950/80",
      accentBorder: "border-yellow-500/40"
    },
    barracks: {
      icon: <Swords className="w-8 h-8 text-rose-500" />,
      color: "text-rose-500",
      bg: "bg-rose-950/40",
      border: "border-rose-500/30",
      emoji: "⚔️", // Military barracks
      plotX: "78%",
      plotY: "32%",
      accentBg: "bg-rose-950/80",
      accentBorder: "border-rose-500/40"
    },
    academy: {
      icon: <GraduationCap className="w-8 h-8 text-cyan-500" />,
      color: "text-cyan-500",
      bg: "bg-cyan-950/40",
      border: "border-cyan-500/30",
      emoji: "🧙‍♂️", // Blue Academy tower
      plotX: "80%",
      plotY: "68%",
      accentBg: "bg-cyan-950/80",
      accentBorder: "border-cyan-500/40"
    }
  };

  const getResourceCostText = (cost: Partial<Resources>, label: string) => {
    return (
      <div className="flex flex-wrap gap-2 mt-1">
        {Object.entries(cost).map(([resName, val]) => {
          if (!val || val === 0 || resName === "speedups") return null;
          const userHas = (resources as any)[resName] || 0;
          const meetsCost = userHas >= val;
          return (
            <span 
              key={resName} 
              className={`text-[10px] px-2 py-0.5 rounded border font-mono ${
                meetsCost ? "bg-stone-900/60 text-stone-300 border-stone-800" : "bg-red-950/40 text-red-400 border-red-900/60"
              }`}
            >
              {resName === "gold" && "🪙 Altın"}
              {resName === "wood" && "🪵 Odun"}
              {resName === "food" && "🌾 Yiyecek"}
              {resName === "stone" && "🪨 Taş"}
              : <span className="font-bold">{val}</span>
            </span>
          );
        })}
      </div>
    );
  };

  const currentBuilding = selectedBuilding ? buildings[selectedBuilding] : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-1">
      {/* City Map Area */}
      <div className="lg:col-span-2 bg-stone-900/40 border border-stone-800 rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between">
        
        {/* Header with toggle */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-4 mb-4 flex-wrap gap-3">
          <div>
            <h2 className="font-display text-xl text-amber-500 flex items-center gap-2">
              <Castle className="w-6 h-6 animate-pulse" /> Şehir Yerleşkesi (City View)
            </h2>
            <p className="text-xs text-stone-400 mt-1">
              Binaları yükselterek üretimi artırın ve askeri gücünüzü seferber edin.
            </p>
          </div>

          {/* Style toggler */}
          <div className="flex gap-1 bg-stone-950 p-1 rounded-lg border border-stone-850 text-xs">
            <button
              onClick={() => { playSound("click"); setViewMode("isometric"); }}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 font-bold transition-all ${
                viewMode === "isometric" 
                  ? "bg-amber-500 text-stone-950" 
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Map className="w-3.5 h-3.5" /> 2.5D Harita
            </button>
            <button
              onClick={() => { playSound("click"); setViewMode("list"); }}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 font-bold transition-all ${
                viewMode === "list" 
                  ? "bg-amber-500 text-stone-950" 
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <List className="w-3.5 h-3.5" /> Liste
            </button>
          </div>
        </div>

        {/* Dynamic Display Area */}
        {viewMode === "isometric" ? (
          /* High Fidelity 2.5D Isometric City Map */
          <div className="relative w-full h-[400px] bg-stone-950 border border-stone-850 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
            
            {/* 3D grid field */}
            <div 
              className="absolute w-[140%] h-[140%] bg-gradient-to-tr from-emerald-950/20 via-stone-900/30 to-emerald-900/10 rounded-full"
              style={{
                transform: "rotateX(55deg) rotateZ(-45deg)",
                boxShadow: "inset 0 0 80px rgba(0,0,0,0.8)"
              }}
            >
              {/* Isometric roads connecting fields */}
              <svg className="absolute inset-0 pointer-events-none w-full h-full z-0 opacity-40">
                {/* Town hall central road stars */}
                <line x1="50%" y1="38%" x2="22%" y2="32%" stroke="#78716c" strokeWidth="3" strokeDasharray="3,3" />
                <line x1="50%" y1="38%" x2="78%" y2="32%" stroke="#78716c" strokeWidth="3" strokeDasharray="3,3" />
                <line x1="50%" y1="38%" x2="50%" y2="72%" stroke="#78716c" strokeWidth="3" strokeDasharray="3,3" />
                <line x1="22%" y1="32%" x2="20%" y2="68%" stroke="#78716c" strokeWidth="2.5" />
                <line x1="78%" y1="32%" x2="80%" y2="68%" stroke="#78716c" strokeWidth="2.5" />
                <line x1="50%" y1="72%" x2="20%" y2="68%" stroke="#78716c" strokeWidth="2.5" />
                <line x1="50%" y1="72%" x2="80%" y2="68%" stroke="#78716c" strokeWidth="2.5" />
              </svg>

              {/* Grid texture lines */}
              <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 pointer-events-none opacity-5">
                {Array.from({ length: 100 }).map((_, i) => (
                  <div key={i} className="border border-emerald-500" />
                ))}
              </div>

              {/* Natural trees icons flat on floor */}
              <div className="absolute top-[15%] left-[45%] text-lg opacity-25">🌳</div>
              <div className="absolute top-[48%] left-[22%] text-lg opacity-25">🌳</div>
              <div className="absolute top-[55%] left-[75%] text-lg opacity-25">🌲</div>
              <div className="absolute top-[82%] left-[35%] text-lg opacity-25">🌳</div>

              {/* 3D billboard building plots */}
              {Object.values(buildings).map((b) => {
                const meta = buildingMeta[b.id];
                const isSelected = selectedBuilding === b.id;
                const isUpgrading = b.upgradeTimeLeft !== null;

                return (
                  <div
                    key={b.id}
                    className="absolute"
                    style={{
                      left: meta.plotX,
                      top: meta.plotY,
                      transform: "translate(-50%, -50%)"
                    }}
                  >
                    {/* Shadow flat on grass floor */}
                    <div className="absolute w-14 h-7 bg-black/65 rounded-full blur-[3px] -translate-x-1/2 -translate-y-1/2 scale-x-[1.4]" />

                    {/* Counter rotated upright standing cardboard card */}
                    <button
                      id={`btn-city-bldg-${b.id}`}
                      onClick={() => {
                        playSound("click");
                        setSelectedBuilding(b.id);
                      }}
                      style={{
                        transform: "rotateZ(45deg) rotateX(-55deg) translateY(-14px)",
                        transformOrigin: "bottom center"
                      }}
                      className={`relative flex flex-col items-center group focus:outline-none transition-all duration-300 ${
                        isSelected ? "scale-110" : "hover:scale-105"
                      }`}
                    >
                      {/* Stylized Building Graphics representation */}
                      <div className={`p-3 rounded-2xl border-2 flex flex-col items-center text-center shadow-2xl relative ${
                        isSelected 
                          ? "bg-amber-950/90 border-amber-500 text-amber-200 ring-4 ring-amber-500/20" 
                          : "bg-stone-900/90 border-stone-800 text-stone-300 group-hover:border-stone-700"
                      }`}>
                        
                        {/* Dynamic custom 3D building visual decoration */}
                        <div className="text-4xl filter drop-shadow-[0_8px_4px_rgba(0,0,0,0.55)] mb-1 relative">
                          {b.id === "townHall" && "🏰"}
                          {b.id === "farm" && "🌾"}
                          {b.id === "lumberMill" && "🪵"}
                          {b.id === "goldMine" && "💎"}
                          {b.id === "barracks" && "🛡️"}
                          {b.id === "academy" && "🔮"}

                          {/* Level badge embedded inside graphic */}
                          <span className="absolute -top-1 -right-1 text-[8px] font-mono px-1 rounded bg-stone-950 border border-stone-800 font-bold text-amber-400">
                            L{b.level}
                          </span>
                        </div>

                        {/* Building name label */}
                        <span className="text-[10px] font-bold tracking-tight mt-1 whitespace-nowrap block">
                          {b.name}
                        </span>

                        {/* Upgrade progress overlays */}
                        {isUpgrading && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-stone-950 font-mono text-[8px] px-1.5 py-0.5 rounded-full font-bold shadow-lg animate-bounce flex items-center gap-0.5 whitespace-nowrap border border-white/20">
                            <Timer className="w-2.5 h-2.5 animate-spin" /> {b.upgradeTimeLeft}s
                          </div>
                        )}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Float prompt HUD overlay */}
            <div className="absolute bottom-4 left-4 bg-stone-950/80 px-3 py-1.5 rounded-lg border border-stone-850 flex items-center gap-1.5 pointer-events-none">
              <Compass className="w-3.5 h-3.5 text-amber-500 animate-spin" />
              <span className="text-[10px] text-stone-400 font-medium">Binaları yönetmek ve seviyelerini yükseltmek için üzerlerine tıklayın.</span>
            </div>
          </div>
        ) : (
          /* Simplified List View Grid for accessibility */
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.values(buildings).map((b) => {
              const isUpgrading = b.upgradeTimeLeft !== null;
              const meta = buildingMeta[b.id];
              const isSelected = selectedBuilding === b.id;

              return (
                <button
                  key={b.id}
                  id={`btn-city-bldg-list-${b.id}`}
                  onClick={() => {
                    playSound("click");
                    setSelectedBuilding(b.id);
                  }}
                  className={`relative group text-left p-4 rounded-xl border transition-all duration-300 flex flex-col justify-between h-36 ${
                    meta.bg
                  } ${
                    isSelected 
                      ? "border-amber-500 ring-2 ring-amber-500/20" 
                      : "border-stone-800 hover:border-stone-700"
                  } shadow-lg`}
                >
                  <span className="absolute top-3 right-3 text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-950/80 text-stone-400 font-bold border border-stone-850">
                    Lvl {b.level}
                  </span>

                  <div className="mb-2">
                    <div className="p-2 rounded-lg bg-stone-950/85 w-fit mb-2 group-hover:scale-110 transition-transform">
                      {meta.icon}
                    </div>
                    <h3 className="font-display text-xs text-stone-200 group-hover:text-amber-400 transition-colors">
                      {b.name}
                    </h3>
                  </div>

                  <div>
                    {isUpgrading ? (
                      <div className="w-full">
                        <div className="flex items-center justify-between text-[9px] text-amber-400 mb-0.5">
                          <span className="flex items-center gap-0.5"><Timer className="w-2.5 h-2.5 animate-spin" /> Yükseliyor</span>
                          <span>{b.upgradeTimeLeft}s</span>
                        </div>
                        <div className="w-full bg-stone-950 h-1 rounded-full overflow-hidden">
                          <div 
                            className="bg-amber-500 h-full"
                            style={{ width: `${Math.max(10, ((b.upgradeDuration - (b.upgradeTimeLeft || 0)) / b.upgradeDuration) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-stone-500 flex items-center gap-0.5 group-hover:text-stone-400">
                        Yönet / Geliştir <ChevronRight className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Global Training Queue Info */}
        {trainingQueue && (
          <div className="mt-6 p-4 bg-rose-950/20 border border-rose-900/30 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-950/40 rounded-lg">
                <Swords className="w-5 h-5 text-rose-500 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">Asker Eğitimi Devam Ediyor</h4>
                <p className="text-xs text-stone-300 mt-0.5">
                  {trainingQueue.troopType === "infantry" && "⚔️ Piyade"}
                  {trainingQueue.troopType === "cavalry" && "🐴 Süvari"}
                  {trainingQueue.troopType === "archers" && "🏹 Okçu"}
                  : <span className="font-mono font-bold text-stone-100">{trainingQueue.count}</span> asker yetiştiriliyor.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-stone-300 font-bold bg-stone-950 px-2 py-1 rounded border border-stone-850">
                {trainingQueue.timeLeft}s kaldı
              </span>
              <div className="w-24 bg-stone-950 h-2 rounded-full overflow-hidden hidden md:block">
                <div 
                  className="bg-rose-500 h-full"
                  style={{ width: `${((trainingQueue.totalDuration - trainingQueue.timeLeft) / trainingQueue.totalDuration) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Building Inspector / Actions Panel */}
      <div className="bg-stone-900/40 border border-stone-800 rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between">
        {currentBuilding ? (
          <div className="h-full flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center gap-4 border-b border-stone-800 pb-4 mb-4">
                <div className={`p-3 rounded-xl bg-stone-950/80 border ${buildingMeta[currentBuilding.id].border}`}>
                  {buildingMeta[currentBuilding.id].icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-base text-stone-100">{currentBuilding.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold font-mono">
                      Lvl {currentBuilding.level}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">{currentBuilding.description}</p>
                </div>
              </div>

              {/* Stats & Passive Generation Info */}
              <div className="mb-6 bg-stone-950/50 p-3 rounded-lg border border-stone-800">
                <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Bina İstatistikleri</h4>
                {currentBuilding.id === "townHall" && (
                  <div className="text-xs text-stone-300 space-y-1">
                    <p>• Maksimum Seviye Sınırı: <span className="font-bold text-amber-400">Seviye {currentBuilding.level}</span></p>
                    <p>• Ordu Kapasitesi Bonusu: <span className="font-bold text-emerald-400">+{currentBuilding.level * 150} Asker</span></p>
                  </div>
                )}
                {currentBuilding.id === "farm" && (
                  <p className="text-xs text-stone-300">• Yiyecek Üretim Hızı: <span className="font-bold text-emerald-400">+{currentBuilding.level * 10}/sn</span></p>
                )}
                {currentBuilding.id === "lumberMill" && (
                  <p className="text-xs text-stone-300">• Odun Üretim Hızı: <span className="font-bold text-emerald-400">+{currentBuilding.level * 8}/sn</span></p>
                )}
                {currentBuilding.id === "goldMine" && (
                  <p className="text-xs text-stone-300">• Altın Üretim Hızı: <span className="font-bold text-emerald-400">+{currentBuilding.level * 4}/sn</span></p>
                )}
                {currentBuilding.id === "barracks" && (
                  <p className="text-xs text-stone-300">• Asker Eğitim Limiti: <span className="font-bold text-emerald-400">Seviye başına +100 asker</span></p>
                )}
                {currentBuilding.id === "academy" && (
                  <p className="text-xs text-stone-300">• Araştırma Hızı Artışı: <span className="font-bold text-emerald-400">+{currentBuilding.level * 5}%</span></p>
                )}
              </div>

              {/* Custom Action (Barracks Training / Academy Researching) */}
              {currentBuilding.id === "barracks" && (
                <div className="mb-6 p-4 bg-rose-950/10 border border-rose-900/20 rounded-xl">
                  <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                    <Swords className="w-3.5 h-3.5" /> Asker Eğit (Training Camp)
                  </h4>
                  <div className="space-y-4">
                    {/* Troop Selection */}
                    <div className="grid grid-cols-3 gap-2">
                      {(["infantry", "cavalry", "archers"] as TroopType[]).map((t) => {
                        const costPerTroop = t === "infantry" ? { food: 4, wood: 2 } : t === "cavalry" ? { food: 5, gold: 3 } : { wood: 5, gold: 2 };
                        const name = t === "infantry" ? "⚔️ Piyade" : t === "cavalry" ? "🐴 Süvari" : "🏹 Okçu";
                        const isAffordable = resources.food >= costPerTroop.food * trainCount && 
                          resources.wood >= (costPerTroop.wood || 0) * trainCount && 
                          resources.gold >= (costPerTroop.gold || 0) * trainCount;

                        return (
                          <button
                            key={t}
                            id={`btn-train-${t}`}
                            disabled={!!trainingQueue}
                            onClick={() => {
                              if (isAffordable) {
                                playSound("recruit");
                                onTrainTroops(t, trainCount);
                              }
                            }}
                            className={`p-2 rounded border text-center transition-all ${
                              trainingQueue 
                                ? "bg-stone-900/20 text-stone-600 border-stone-800 cursor-not-allowed"
                                : isAffordable
                                ? "bg-rose-950/30 border-rose-800/40 text-rose-300 hover:bg-rose-950/60"
                                : "bg-stone-900/60 border-stone-800/50 text-stone-500 cursor-not-allowed"
                            }`}
                          >
                            <span className="text-[10px] font-bold block">{name}</span>
                            <span className="text-[8px] text-stone-400 block font-mono">Cost: {t === "infantry" ? "4🌾 2🪵" : t === "cavalry" ? "5🌾 3🪙" : "5🪵 2🪙"}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Count slider */}
                    <div>
                      <div className="flex justify-between text-xs text-stone-400 mb-1">
                        <span>Eğitilecek Miktar:</span>
                        <span className="font-mono font-bold text-stone-200">{trainCount}</span>
                      </div>
                      <input 
                        type="range" 
                        min="10" 
                        max={currentBuilding.level * 100} 
                        step="10"
                        value={trainCount} 
                        onChange={(e) => setTrainCount(Number(e.target.value))}
                        className="w-full accent-rose-500 h-1 bg-stone-950 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-stone-500 font-mono mt-1">
                        <span>10</span>
                        <span>Maks: {currentBuilding.level * 100}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentBuilding.id === "academy" && (
                <div className="mb-6 p-4 bg-cyan-950/10 border border-cyan-900/20 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5" /> Akademi Araştırmaları
                  </h4>
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                    {Object.values(research).map((tech) => {
                      const meetsCost = Object.entries(tech.cost).every(([resName, val]) => (resources as any)[resName] >= val);
                      const isResearching = tech.timeLeft !== null;
                      
                      return (
                        <div key={tech.id} className="p-2.5 rounded bg-stone-950/60 border border-stone-800 flex flex-col justify-between">
                          <div className="flex justify-between items-start mb-1">
                            <div>
                              <h5 className="text-xs font-bold text-stone-200">{tech.name}</h5>
                              <span className="text-[9px] text-cyan-400 font-mono">Sev {tech.level}/{tech.maxLevel} ({tech.effect})</span>
                            </div>
                            {isResearching ? (
                              <span className="text-[10px] text-amber-400 flex items-center gap-1 font-mono"><Timer className="w-3 h-3 animate-spin" /> {tech.timeLeft}s</span>
                            ) : (
                              tech.level < tech.maxLevel && (
                                <button
                                  id={`btn-research-${tech.id}`}
                                  disabled={!meetsCost}
                                  onClick={() => {
                                    playSound("upgrade");
                                    onResearchTech(tech.id);
                                  }}
                                  className={`text-[10px] px-2 py-0.5 rounded font-bold border transition ${
                                    meetsCost 
                                      ? "bg-cyan-950 text-cyan-300 border-cyan-800 hover:bg-cyan-900" 
                                      : "bg-stone-900 text-stone-500 border-stone-800 cursor-not-allowed"
                                  }`}
                                >
                                  Araştır
                                </button>
                              )
                            )}
                          </div>
                          {!isResearching && tech.level < tech.maxLevel && (
                            <div className="mt-1 border-t border-stone-800/40 pt-1">
                              {getResourceCostText(tech.cost, "Maliyet")}
                            </div>
                          )}
                          {isResearching && (
                            <div className="flex items-center gap-2 mt-2">
                              <div className="w-full bg-stone-950 h-1 rounded overflow-hidden">
                                <div className="bg-cyan-500 h-full" style={{ width: `${((tech.duration - (tech.timeLeft || 0)) / tech.duration) * 100}%` }} />
                              </div>
                              <button
                                onClick={() => onUseSpeedupResearch(tech.id)}
                                disabled={resources.speedups <= 0}
                                className={`text-[9px] px-1.5 py-0.5 rounded flex items-center gap-0.5 font-bold ${
                                  resources.speedups > 0 
                                    ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30" 
                                    : "bg-stone-900 text-stone-600 border border-stone-800 cursor-not-allowed"
                                  }`}
                              >
                                <Zap className="w-2.5 h-2.5" /> Hızlandır
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Upgrade Options */}
            <div className="border-t border-stone-800/80 pt-4 mt-auto">
              {currentBuilding.upgradeTimeLeft !== null ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-amber-400">
                    <span className="flex items-center gap-1 font-bold">
                      <Timer className="w-4 h-4 animate-spin" /> Yükseltme Devam Ediyor
                    </span>
                    <span className="font-mono font-bold text-sm">{currentBuilding.upgradeTimeLeft}s kaldı</span>
                  </div>
                  
                  {/* Speedup Button */}
                  <button
                    id={`btn-speedup-${currentBuilding.id}`}
                    disabled={resources.speedups <= 0}
                    onClick={() => {
                      playSound("click");
                      onUseSpeedupBuilding(currentBuilding.id);
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-display text-sm font-bold border transition ${
                      resources.speedups > 0
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                        : "bg-stone-900 text-stone-600 border-stone-800 cursor-not-allowed"
                    }`}
                  >
                    <Zap className="w-4 h-4 text-amber-400" />
                    Hızlandırma Kullan (Mevcut: {resources.speedups} dk)
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Geliştirme Maliyeti (Lvl {currentBuilding.level + 1})</h4>
                    {getResourceCostText(currentBuilding.upgradeCost, "Gerekli")}
                    <div className="flex items-center gap-1.5 text-[10px] text-stone-400 mt-2">
                      <Timer className="w-3.5 h-3.5" /> Yükseltme Süresi: <span className="font-mono text-stone-200 font-bold">{currentBuilding.upgradeDuration}s</span>
                    </div>
                  </div>

                  {/* Trigger Upgrade Button */}
                  {(() => {
                    const meetsCost = Object.entries(currentBuilding.upgradeCost).every(([resName, val]) => (resources as any)[resName] >= val);
                    return (
                      <button
                        id={`btn-upgrade-bldg-${currentBuilding.id}`}
                        disabled={!meetsCost}
                        onClick={() => {
                          playSound("upgrade");
                          onUpgradeBuilding(currentBuilding.id);
                        }}
                        className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-display text-sm font-bold border transition-all duration-300 ${
                          meetsCost
                            ? "bg-amber-500 text-stone-950 border-amber-400 hover:bg-amber-400 shadow-lg shadow-amber-500/10"
                            : "bg-stone-900 text-stone-500 border-stone-800/80 cursor-not-allowed"
                        }`}
                      >
                        <ArrowUp className="w-4 h-4" />
                        {meetsCost ? "BİNAYI SEVİYE ATLAT" : "YETERSİZ KAYNAK"}
                      </button>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-stone-500">
            <Castle className="w-16 h-16 text-stone-700 mb-4 animate-bounce" />
            <p className="font-display font-medium text-stone-400">Herhangi bir Bina Seçilmedi</p>
            <p className="text-xs mt-1">Yükseltmelerini, asker üretimlerini veya teknoloji araştırmalarını yönetmek için şehir yerleşkesindeki binalardan birine tıklayın.</p>
          </div>
        )}
      </div>
    </div>
  );
}
