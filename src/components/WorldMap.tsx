import React, { useState, useEffect, useRef } from "react";
import { 
  Castle, Skull, Coins, Axe, Wheat, Mountain, Navigation, Swords, 
  Flame, User, Compass, Info, X, ZoomIn, ZoomOut, Target, Zap, 
  RotateCcw, Scroll, Shield, Award, Sparkles, ChevronRight, Volume2
} from "lucide-react";
import { WorldMapItem, Army, Commander, Troops, ResourceType, Resources, Quest } from "../types";
import { playSound } from "../utils/audio";

interface WorldMapProps {
  worldItems: WorldMapItem[];
  armies: Army[];
  commanders: Commander[];
  availableTroops: Troops;
  resources: Resources;
  quests: Quest[];
  playerPower: number;
  battleLogs: string[];
  onDeployArmy: (
    commanderId: string, 
    troops: Troops, 
    targetId: string, 
    action: "gather" | "attack"
  ) => void;
  onRecallArmy: (armyId: string) => void;
  onEnterCity: () => void;
  onUnlockCommander: (id: string, costGold: number) => void;
  onUpgradeCommander: (id: string, costGold: number) => void;
  onClaimReward: (questId: string) => void;
}

interface TerrainTile {
  row: number;
  col: number;
  type: "grass" | "dirt" | "stone" | "water" | "sand" | "forest";
  elevation: number;
}

const TERRAIN_TILES: TerrainTile[] = (() => {
  const tiles: TerrainTile[] = [];
  const size = 40; // Detailed 40x40 Grid (1600 total blocks)
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      let type: "grass" | "dirt" | "stone" | "water" | "sand" | "forest" = "grass";
      let elevation = 1;

      // 1. Center Citadel Turf (Row 20, Col 20 is center)
      const distToCenter = Math.max(Math.abs(r - 20), Math.abs(c - 20));
      
      // 2. Winding River (Water flows through, curving using sine waves)
      const riverCol = Math.floor(16 + 8 * Math.sin(r / 5) + (r * 0.15));
      const distToRiver = c - riverCol;

      if (distToCenter <= 3) {
        // Level ground surrounding the Royal Base
        type = "grass";
        elevation = 1;
      } else if (distToRiver >= -1 && distToRiver <= 1) {
        // Stream of flowing river
        type = "water";
        elevation = 0;
      } else if (distToRiver >= -2 && distToRiver <= 2) {
        // Sand riverbanks and shores
        type = "sand";
        elevation = 1;
      } else if (r < 15 && c > 25) {
        // Tall majestic mountain peaks in North-East quadrant
        type = "stone";
        const cornerDist = (39 - c) + r;
        if (cornerDist <= 5) {
          elevation = 4; // snow peak
        } else if (cornerDist <= 11) {
          elevation = 3; // high rocky peak
        } else {
          elevation = 2; // stone ridge
        }
      } else if (r > 25 && c < 15) {
        // Ancient deep woods in South-West quadrant
        type = "forest";
        elevation = 1;
      } else {
        // Procedural variation for organic look and feel across the realm
        const noise = (r * 59 + c * 83) % 100;
        if (noise < 12) {
          type = "forest";
          elevation = 1;
        } else if (noise < 22) {
          type = "dirt";
          elevation = 1;
        } else if (noise < 25) {
          type = "stone";
          elevation = 1;
        } else {
          type = "grass";
          elevation = 1;
        }
      }

      tiles.push({ row: r, col: c, type, elevation });
    }
  }
  return tiles;
})();

const getTileStyle = (type: "grass" | "dirt" | "stone" | "water" | "sand" | "forest", elevation: number) => {
  let background = "";
  let borderRightColor = "";
  let borderBottomColor = "";

  switch (type) {
    case "water":
      background = "linear-gradient(135deg, #0288d1 0%, #01579b 100%)";
      borderRightColor = "#013970";
      borderBottomColor = "#001f4d";
      break;
    case "sand":
      background = "linear-gradient(135deg, #fdd835 0%, #f57f17 100%)";
      borderRightColor = "#b35b00";
      borderBottomColor = "#803c00";
      break;
    case "stone":
      if (elevation === 4) {
        // Snow peaks
        background = "linear-gradient(135deg, #ffffff 0%, #78909c 60%, #37474f 100%)";
        borderRightColor = "#263238";
        borderBottomColor = "#11171a";
      } else if (elevation === 3) {
        background = "linear-gradient(135deg, #b0bec5 0%, #546e7a 100%)";
        borderRightColor = "#37474f";
        borderBottomColor = "#212b30";
      } else {
        background = "linear-gradient(135deg, #78909c 0%, #455a64 100%)";
        borderRightColor = "#263238";
        borderBottomColor = "#151b1f";
      }
      break;
    case "forest":
      background = "linear-gradient(135deg, #2e7d32 0%, #0d5c11 100%)";
      borderRightColor = "#083b0a";
      borderBottomColor = "#021a03";
      break;
    case "dirt":
      background = "linear-gradient(135deg, #8d6e63 0%, #4e342e 100%)";
      borderRightColor = "#3e2723";
      borderBottomColor = "#22110e";
      break;
    case "grass":
    default:
      background = "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)";
      borderRightColor = "#1b5e20";
      borderBottomColor = "#0c3c10";
      break;
  }

  return {
    background,
    borderRight: `1.5px solid ${borderRightColor}`,
    borderBottom: `1.5px solid ${borderBottomColor}`,
    boxShadow: "inset 0.5px 0.5px 0px rgba(255, 255, 255, 0.15)",
  };
};

export default function WorldMap({
  worldItems,
  armies,
  commanders,
  availableTroops,
  resources,
  quests,
  playerPower,
  battleLogs,
  onDeployArmy,
  onRecallArmy,
  onEnterCity,
  onUnlockCommander,
  onUpgradeCommander,
  onClaimReward
}: WorldMapProps) {
  const [selectedItem, setSelectedItem] = useState<WorldMapItem | null>(null);
  const [isDeployOpen, setIsDeployOpen] = useState(false);
  const [selectedCommanderId, setSelectedCommanderId] = useState<string>("");
  
  // Troop selection for deployment
  const [deployInfantry, setDeployInfantry] = useState(0);
  const [deployCavalry, setDeployCavalry] = useState(0);
  const [deployArchers, setDeployArchers] = useState(0);

  // Overlays
  const [isQuestsOpen, setIsQuestsOpen] = useState(false);
  const [isCommandersOpen, setIsCommandersOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);

  // Zoom and Pan states for the 2.5D Camera (Optimized with direct DOM Refs)
  const [zoom, setZoom] = useState(1.1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1.1);

  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  // Sync state values with refs for accurate drag initialization
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  // Handle click on map item
  const handleItemClick = (item: WorldMapItem) => {
    playSound("click");
    setSelectedItem(item);
    setIsDeployOpen(false);
    
    setDeployInfantry(0);
    setDeployCavalry(0);
    setDeployArchers(0);
    
    const availableComm = commanders.find(c => c.unlocked && !armies.some(a => a.commanderId === c.id));
    if (availableComm) {
      setSelectedCommanderId(availableComm.id);
    } else {
      setSelectedCommanderId("");
    }
  };

  const handleOpenDeploy = () => {
    playSound("click");
    if (!selectedCommanderId) {
      alert("Yola çıkabilecek müsait bir komutanınız bulunmuyor! Önce aktif ordularınızın şehre dönmesini bekleyin veya yeni komutanlar kazanın.");
      return;
    }
    
    const comm = commanders.find(c => c.id === selectedCommanderId);
    if (comm) {
      const maxCap = comm.level * 200;
      let remaining = maxCap;
      
      const infToDeploy = Math.min(availableTroops.infantry, remaining);
      setDeployInfantry(infToDeploy);
      remaining -= infToDeploy;
      
      const cavToDeploy = Math.min(availableTroops.cavalry, remaining);
      setDeployCavalry(cavToDeploy);
      remaining -= cavToDeploy;
      
      const arcToDeploy = Math.min(availableTroops.archers, remaining);
      setDeployArchers(arcToDeploy);
    }
    
    setIsDeployOpen(true);
  };

  const handleDeployConfirm = () => {
    if (!selectedItem || !selectedCommanderId) return;
    
    const deployedTroops: Troops = {
      infantry: deployInfantry,
      cavalry: deployCavalry,
      archers: deployArchers
    };

    const totalDeployed = deployInfantry + deployCavalry + deployArchers;
    if (totalDeployed === 0) {
      alert("Ordu göndermek için en az 1 asker seçmelisiniz!");
      return;
    }

    const comm = commanders.find(c => c.id === selectedCommanderId);
    if (comm && totalDeployed > comm.level * 200) {
      alert(`Bu komutanın maksimum ordu taşıma kapasitesi ${comm.level * 200}. Lütfen ordu boyutunu azaltın.`);
      return;
    }

    const action = selectedItem.type.startsWith("node_") ? "gather" : "attack";
    
    playSound("recruit");
    onDeployArmy(selectedCommanderId, deployedTroops, selectedItem.id, action);
    
    setIsDeployOpen(false);
    setSelectedItem(null);
  };

  // Drag handlers using high-performance direct style modification
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("select") || (e.target as HTMLElement).closest("input")) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { x: panRef.current.x, y: panRef.current.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    
    const newX = panStart.current.x + dx;
    const newY = panStart.current.y + dy;
    
    panRef.current = { x: newX, y: newY };
    
    // Direct hardware-accelerated style update using translate3d
    if (mapContainerRef.current) {
      mapContainerRef.current.style.transform = `translate3d(${newX}px, ${newY}px, 0px) scale(${zoomRef.current})`;
    }
  };

  const handleMouseUpOrLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      // Only trigger single React re-render when drag is finished to synchronize state
      setPan({ x: panRef.current.x, y: panRef.current.y });
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("select") || (e.target as HTMLElement).closest("input")) return;
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      panStart.current = { x: panRef.current.x, y: panRef.current.y };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStart.current.x;
    const dy = e.touches[0].clientY - dragStart.current.y;
    
    const newX = panStart.current.x + dx;
    const newY = panStart.current.y + dy;
    
    panRef.current = { x: newX, y: newY };
    
    if (mapContainerRef.current) {
      mapContainerRef.current.style.transform = `translate3d(${newX}px, ${newY}px, 0px) scale(${zoomRef.current})`;
    }
  };

  const handleZoom = (direction: "in" | "out") => {
    playSound("click");
    setZoom(prev => {
      const nextZoom = direction === "in" ? Math.min(2.2, prev + 0.15) : Math.max(0.6, prev - 0.15);
      zoomRef.current = nextZoom;
      if (mapContainerRef.current) {
        mapContainerRef.current.style.transform = `translate3d(${panRef.current.x}px, ${panRef.current.y}px, 0px) scale(${nextZoom})`;
      }
      return nextZoom;
    });
  };

  const handleResetCamera = () => {
    playSound("click");
    zoomRef.current = 1.1;
    panRef.current = { x: 0, y: 0 };
    if (mapContainerRef.current) {
      mapContainerRef.current.style.transform = `translate3d(0px, 0px, 0px) scale(1.1)`;
    }
    setZoom(1.1);
    setPan({ x: 0, y: 0 });
  };

  const getMapItemSprite = (type: string, isSelected: boolean) => {
    const activeClass = isSelected ? "scale-110 drop-shadow-[0_0_15px_rgba(245,158,11,0.6)]" : "hover:scale-105";

    if (type === "node_gold") {
      return (
         <div className={`relative flex flex-col items-center select-none transition-transform duration-200 ${activeClass}`}>
           <div className="text-4xl filter drop-shadow-[0_8px_4px_rgba(0,0,0,0.5)]">🏔️</div>
           <div className="absolute bottom-1 -right-1 text-2xl animate-bounce">🪙</div>
           <div className="absolute top-0 text-[9px] bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 font-bold px-1 py-0.25 rounded backdrop-blur-sm -translate-y-2">ALTIN MÜHÜRÜ</div>
         </div>
      );
    }
    if (type === "node_wood") {
      return (
         <div className={`relative flex flex-col items-center select-none transition-transform duration-200 ${activeClass}`}>
           <div className="text-4xl filter drop-shadow-[0_8px_4px_rgba(0,0,0,0.5)]">🌲</div>
           <div className="absolute -bottom-1 -left-1 text-xl">🪵</div>
           <div className="absolute -bottom-1 -right-1 text-xl">🌲</div>
           <div className="absolute top-0 text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold px-1 py-0.25 rounded backdrop-blur-sm -translate-y-2">KERESTE DEPOSU</div>
         </div>
      );
    }
    if (type === "node_food") {
      return (
         <div className={`relative flex flex-col items-center select-none transition-transform duration-200 ${activeClass}`}>
           <div className="text-4xl filter drop-shadow-[0_8px_4px_rgba(0,0,0,0.5)]">🌾</div>
           <div className="absolute -bottom-1 -left-1 text-xl">🌾</div>
           <div className="absolute top-0 text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold px-1 py-0.25 rounded backdrop-blur-sm -translate-y-2">BUĞDAY REZERVİ</div>
         </div>
      );
    }
    if (type === "node_stone") {
      return (
         <div className={`relative flex flex-col items-center select-none transition-transform duration-200 ${activeClass}`}>
           <div className="text-4xl filter drop-shadow-[0_8px_4px_rgba(0,0,0,0.5)]">⛰️</div>
           <div className="absolute bottom-1 -left-1 text-lg">⛏️</div>
           <div className="absolute top-0 text-[9px] bg-stone-500/20 text-stone-300 border border-stone-500/30 font-bold px-1 py-0.25 rounded backdrop-blur-sm -translate-y-2">TAŞ OCAĞI</div>
         </div>
      );
    }
    if (type === "barbarian") {
      return (
         <div className={`relative flex flex-col items-center select-none transition-transform duration-200 ${activeClass}`}>
           <div className="text-4xl filter drop-shadow-[0_8px_4px_rgba(0,0,0,0.5)] animate-pulse">⛺</div>
           <div className="absolute -top-3 text-lg animate-bounce">💀</div>
           <div className="absolute -bottom-1 text-[8px] bg-red-600 text-stone-100 border border-red-500 font-bold px-1 rounded shadow">BARBAR KAMP {selectedItem?.id === type ? "🔥" : ""}</div>
         </div>
      );
    }
    if (type === "rival") {
      return (
         <div className={`relative flex flex-col items-center select-none transition-transform duration-200 ${activeClass}`}>
           <div className="text-5xl filter drop-shadow-[0_10px_6px_rgba(0,0,0,0.6)]">🏰</div>
           <div className="absolute -top-2 text-xl animate-pulse">😈</div>
           <div className="absolute -bottom-1 text-[8px] bg-purple-600 text-stone-100 border border-purple-500 font-bold px-1.5 rounded shadow">DÜŞMAN KALE</div>
         </div>
      );
    }
    return <div className="text-3xl">❓</div>;
  };

  const getMapItemColorClass = (type: string) => {
    if (type.startsWith("node_gold")) return "text-yellow-400 bg-yellow-950/80 border-yellow-500/40";
    if (type.startsWith("node_wood")) return "text-emerald-400 bg-emerald-950/80 border-emerald-500/40";
    if (type.startsWith("node_food")) return "text-amber-400 bg-amber-950/80 border-amber-500/40";
    if (type.startsWith("node_stone")) return "text-stone-300 bg-stone-950/80 border-stone-800";
    if (type === "barbarian") return "text-red-400 bg-red-950/80 border-red-500/40";
    if (type === "rival") return "text-purple-400 bg-purple-950/80 border-purple-500/40";
    return "text-stone-400 bg-stone-950 border-stone-800";
  };

  const activeCommander = commanders.find(c => c.id === selectedCommanderId);

  return (
    <div className="w-screen h-screen relative bg-stone-950 text-stone-100 select-none overflow-hidden font-sans">
      
      {/* 2.5D Interactive Canvas Map Area (Fills entire screen) */}
      <div 
        className="w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUpOrLeave}
      >
        {/* Pan/Zoom Controller */}
        <div 
          ref={mapContainerRef}
          className={`absolute inset-0 origin-center ${isDragging ? "" : "transition-transform duration-300 ease-out"} will-change-transform`}
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoom})`,
          }}
        >
          {/* Tilted 2.5D Isometric Floor Plane */}
          <div 
            className="absolute w-[1200%] h-[1200%] left-[-550%] top-[-550%] rounded-[300px] will-change-transform"
            style={{
              transform: "rotateX(58deg) rotateZ(-45deg)",
              transformStyle: "preserve-3d",
              boxShadow: "inset 0 0 250px rgba(0, 0, 0, 0.98)",
              background: "radial-gradient(circle at center, #143322 0%, #05120a 65%, #010402 100%)",
              backgroundImage: `
                linear-gradient(rgba(16, 185, 129, 0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(16, 185, 129, 0.02) 1px, transparent 1px)
              `,
              backgroundSize: "40px 40px",
            }}
          >
            {/* 2.5D Terrain Grid Blocks */}
            <div className="absolute inset-0 pointer-events-none will-change-transform">
              {TERRAIN_TILES.map((tile) => {
                const xPercent = (tile.col / 40) * 100;
                const yPercent = (tile.row / 40) * 100;
                const tileStyle = getTileStyle(tile.type, tile.elevation);

                return (
                  <div
                    key={`${tile.row}-${tile.col}`}
                    style={{
                      left: `${xPercent}%`,
                      top: `${yPercent}%`,
                      width: "2.53%", // slight overlap to avoid seams
                      height: "2.53%",
                      position: "absolute",
                      ...tileStyle,
                    }}
                  />
                );
              })}
            </div>

            {/* SVG overlay for genuine isometric marching lines */}
            <svg className="absolute inset-0 pointer-events-none w-full h-full z-0">
              {armies.map((army) => {
                const startX = `${army.startX}%`;
                const startY = `${army.startY}%`;
                const targetX = `${army.targetX}%`;
                const targetY = `${army.targetY}%`;
                
                const isReturning = army.marchingDirection === "returning";
                const strokeColor = isReturning ? "#8c8a87" : "#f59e0b"; // returning (gray) vs attack/gather (gold)

                return (
                  <g key={army.id}>
                    <line 
                      x1={startX} 
                      y1={startY} 
                      x2={targetX} 
                      y2={targetY} 
                      stroke={strokeColor} 
                      strokeWidth="3" 
                      strokeDasharray="8,6"
                      className="animate-[dash_35s_linear_infinite]"
                      style={{
                        filter: "drop-shadow(0px 0px 4px rgba(245, 158, 11, 0.4))"
                      }}
                    />
                    <circle cx={targetX} cy={targetY} r="10" fill="none" stroke={strokeColor} strokeWidth="2" className="animate-ping" />
                    <circle cx={targetX} cy={targetY} r="5" fill={strokeColor} opacity="0.8" />
                  </g>
                );
              })}
            </svg>

            {/* 1. HOME CASTLE (Player's base, positioned center: 50%, 50%) */}
            <div 
              className="absolute z-10"
              style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
            >
              <div className="absolute w-24 h-12 bg-black/60 rounded-full blur-[5px] -translate-x-1/2 -translate-y-1/2 scale-x-[1.6]" />
              <button
                id="btn-home-castle"
                onClick={() => {
                  playSound("click");
                  setSelectedItem({
                    id: "home_castle",
                    type: "rival",
                    name: "Kraliyet Kalesi (Sizin)",
                    level: 5,
                    x: 50,
                    y: 50,
                    health: 10000,
                    maxHealth: 10000
                  });
                }}
                style={{
                  transform: "rotateZ(45deg) rotateX(-58deg) translateY(-24px)",
                  transformOrigin: "bottom center",
                }}
                className="relative flex flex-col items-center group cursor-pointer focus:outline-none"
              >
                <div className="p-3 bg-gradient-to-b from-blue-900 to-blue-950 border-2 border-blue-400 rounded-3xl shadow-2xl text-blue-300 group-hover:scale-110 transition-all duration-300 ring-4 ring-blue-500/10">
                  <Castle className="w-12 h-12 text-blue-200 drop-shadow-[0_10px_8px_rgba(0,0,0,0.65)] animate-[pulse_4s_ease-in-out_infinite]" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-400 animate-ping border border-white/20" />
                </div>
                <span className="text-[10px] bg-blue-950/95 border border-blue-500/30 px-2.5 py-0.5 rounded-md text-blue-200 font-bold mt-2 shadow-xl whitespace-nowrap">
                  Kraliyet Kalesi (50, 50)
                </span>
              </button>
            </div>

            {/* 2. World Map Interactive Items (Mines, Barbarians, Rivals) */}
            {worldItems.map((item) => {
              const isSelected = selectedItem?.id === item.id;

              return (
                <div
                  key={item.id}
                  className="absolute z-10"
                  style={{ left: `${item.x}%`, top: `${item.y}%`, transform: "translate(-50%, -50%)" }}
                >
                  <div className="absolute w-16 h-8 bg-black/55 rounded-full blur-[4px] -translate-x-1/2 -translate-y-1/2 scale-x-[1.4]" />
                  <button
                    id={`btn-map-item-${item.id}`}
                    onClick={() => handleItemClick(item)}
                    style={{
                      transform: "rotateZ(45deg) rotateX(-58deg) translateY(-22px)",
                      transformOrigin: "bottom center",
                    }}
                    className={`relative flex flex-col items-center group transition-all duration-300 ${
                      isSelected ? "scale-110" : ""
                    }`}
                  >
                    {getMapItemSprite(item.type, isSelected)}
                    <span className={`text-[10px] px-2 py-0.5 rounded border mt-2 font-bold shadow-md transition-all whitespace-nowrap ${
                      isSelected 
                        ? "bg-amber-500 text-stone-950 border-white font-black scale-105" 
                        : "bg-stone-950/90 text-stone-300 border-stone-850 group-hover:text-amber-400"
                    }`}>
                      {item.name} Lvl {item.level}
                    </span>
                  </button>
                </div>
              );
            })}

            {/* 3. Marching Armies */}
            {armies.map((army) => {
              const comm = commanders.find(c => c.id === army.commanderId);
              const totalTroops = army.troops.infantry + army.troops.cavalry + army.troops.archers;
              const isFighting = army.status === "fighting";
              const isGathering = army.status === "gathering";

              return (
                <div
                  key={army.id}
                  className="absolute z-20 transition-all duration-1000 ease-linear"
                  style={{ left: `${army.x}%`, top: `${army.y}%`, transform: "translate(-50%, -50%)" }}
                >
                  <div className="absolute w-12 h-6 bg-black/60 rounded-full blur-[3px] -translate-x-1/2 -translate-y-1/2 scale-x-[1.3]" />
                  <div
                    style={{
                      transform: "rotateZ(45deg) rotateX(-58deg) translateY(-16px)",
                      transformOrigin: "bottom center",
                    }}
                    className="relative flex flex-col items-center animate-fadeIn"
                  >
                    <div className={`p-2 rounded-xl border bg-stone-950 shadow-2xl flex items-center gap-1.5 ${
                      isFighting 
                        ? "border-red-500 bg-red-950/80 ring-2 ring-red-500/30 animate-pulse" 
                        : isGathering 
                        ? "border-emerald-500 bg-emerald-950/80 ring-2 ring-emerald-500/30" 
                        : "border-amber-500 bg-stone-900/90"
                    }`}>
                      {isFighting ? (
                        <div className="text-xl animate-bounce">⚔️</div>
                      ) : isGathering ? (
                        <div className="text-xl animate-pulse">⛏️</div>
                      ) : (
                        <div className="text-xl animate-pulse">🚶‍♂️</div>
                      )}
                      <div className="w-6 h-6 rounded-full bg-stone-900 border border-stone-700 flex items-center justify-center text-xs shadow-inner">
                        {comm?.avatar || "👤"}
                      </div>
                    </div>
                    <span className="text-[9px] bg-stone-950/95 text-stone-200 font-mono font-bold border border-stone-800 rounded px-2 py-0.5 mt-1.5 whitespace-nowrap shadow-lg flex items-center gap-1">
                      <span className="text-amber-400">{comm?.name}:</span>
                      <span>{totalTroops} asker</span>
                      {isGathering && <span className="text-emerald-400 font-bold">({army.gatheredResources?.amount})</span>}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* FLOATING APP HUD: ROK-STYLE IMMERSIVE INTERFACE */}

      {/* 1. TOP HUD: RESOURCES BAR (Floating overlay, transparent back) */}
      <div className="absolute top-0 right-0 z-40 p-4 pointer-events-none flex justify-end">
        {/* Resources floating bar */}
        <div className="pointer-events-auto bg-stone-950/80 border border-stone-800/80 backdrop-blur-md p-2 px-4 rounded-2xl flex flex-wrap items-center gap-4 md:gap-6 shadow-xl shadow-black/40">
          <div className="flex items-center gap-2 text-xs font-mono font-bold" title="Altın">
            <span className="text-sm">🪙</span>
            <span className="text-yellow-400">{resources.gold}</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold" title="Odun">
            <span className="text-sm">🪵</span>
            <span className="text-emerald-400">{resources.wood}</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold" title="Yiyecek">
            <span className="text-sm">🌾</span>
            <span className="text-amber-400">{resources.food}</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold" title="Taş">
            <span className="text-sm">🪨</span>
            <span className="text-stone-300">{resources.stone}</span>
          </div>
          <div className="h-4 w-px bg-stone-800" />
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-500" title="Yükseltme Hızlandırması">
            <span className="text-sm">⚡</span>
            <span>{resources.speedups} dk</span>
          </div>
        </div>
      </div>

      {/* 2. SIDE HUD: LEFT COLUMN CONTROLS (Map Tools, Quests, Commanders) */}
      <div className="absolute left-4 top-4 bottom-4 z-40 pointer-events-none flex flex-col justify-between w-72">
        {/* Quick Tools and Menu Overlays triggers */}
        <div className="pointer-events-auto space-y-3">
          {/* Floating Circle Command buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => { playSound("click"); setIsQuestsOpen(true); }}
              className="p-3.5 bg-stone-950/90 hover:bg-stone-900 text-stone-200 hover:text-amber-400 rounded-full border border-stone-800 shadow-xl transition-all hover:scale-110 flex items-center justify-center"
              title="Aktif Görevler"
            >
              <Award className="w-5 h-5" />
            </button>
            <button
              onClick={() => { playSound("click"); setIsCommandersOpen(true); }}
              className="p-3.5 bg-stone-950/90 hover:bg-stone-900 text-stone-200 hover:text-amber-400 rounded-full border border-stone-800 shadow-xl transition-all hover:scale-110 flex items-center justify-center"
              title="Komutanlar"
            >
              <User className="w-5 h-5" />
            </button>
            <button
              onClick={() => { playSound("click"); setIsLogsOpen(true); }}
              className="p-3.5 bg-stone-950/90 hover:bg-stone-900 text-stone-200 hover:text-amber-400 rounded-full border border-stone-800 shadow-xl transition-all hover:scale-110 flex items-center justify-center relative"
              title="Savaş Günlükleri"
            >
              <Scroll className="w-5 h-5" />
              {battleLogs.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border border-stone-950 animate-pulse" />
              )}
            </button>
          </div>
        </div>

        {/* Active Marching Armies Overlay Card */}
        {armies.length > 0 && (
          <div className="pointer-events-auto bg-stone-950/85 border border-stone-800/80 backdrop-blur-md p-4 rounded-2xl shadow-2xl max-h-60 overflow-y-auto space-y-2.5">
            <h3 className="text-xs font-display font-black text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 animate-pulse" /> Aktif Ordular ({armies.length})
            </h3>
            <div className="space-y-2">
              {armies.map((army) => {
                const comm = commanders.find(c => c.id === army.commanderId);
                const isReturning = army.marchingDirection === "returning";
                return (
                  <div key={army.id} className="p-2.5 bg-stone-900/40 rounded-xl border border-stone-800 flex items-center justify-between text-xs gap-3">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-stone-200">{comm?.avatar} {comm?.name}</span>
                        <span className={`text-[8px] px-1.5 py-0.25 rounded-full font-bold uppercase ${
                          army.status === "fighting" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                          army.status === "gathering" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                          "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}>
                          {army.status === "marching" ? (isReturning ? "Geri Dönüş" : "Seferde") : ""}
                          {army.status === "gathering" ? "Toplama" : ""}
                          {army.status === "fighting" ? "Savaşta" : ""}
                        </span>
                      </div>
                      <p className="text-[9px] text-stone-500 mt-0.5">Askerler: {army.troops.infantry + army.troops.cavalry + army.troops.archers}</p>
                    </div>
                    <button
                      onClick={() => { playSound("click"); onRecallArmy(army.id); }}
                      className="text-[9px] px-2 py-1 bg-stone-950 hover:bg-stone-900 hover:text-red-400 text-stone-400 rounded-lg border border-stone-800 transition font-black"
                    >
                      GERİ ÇAĞIR
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. RIGHT HUD: SELECTION DETAILS / CIRCULAR COMMAND WHEEL OVERLAY */}
      <div className="absolute right-4 top-24 bottom-4 z-40 pointer-events-none flex flex-col justify-between w-80">
        {/* Navigation Camera controls (Floating nicely) */}
        <div className="pointer-events-auto bg-stone-950/85 p-2 rounded-xl border border-stone-850 shadow-xl backdrop-blur-md flex gap-1.5 self-end mt-2">
          <button 
            onClick={() => handleZoom("in")} 
            className="p-1.5 hover:bg-stone-900 rounded-lg text-stone-300 hover:text-amber-400 transition" 
            title="Yakınlaştır"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button 
            onClick={() => handleZoom("out")} 
            className="p-1.5 hover:bg-stone-900 rounded-lg text-stone-300 hover:text-amber-400 transition" 
            title="Uzaklaştır"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button 
            onClick={handleResetCamera} 
            className="p-1.5 hover:bg-stone-900 rounded-lg text-stone-300 hover:text-amber-400 transition" 
            title="Kamerayı Sıfırla"
          >
            <Target className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Map Item inspector Card */}
        {selectedItem && (
          <div className="pointer-events-auto bg-stone-950/85 border border-amber-500/30 backdrop-blur-md p-5 rounded-2xl shadow-2xl flex flex-col justify-between mt-auto">
            {/* Upper Info Header */}
            <div className="border-b border-stone-800 pb-3 mb-3.5">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-display font-black text-sm text-stone-100 flex items-center gap-1.5">
                    {selectedItem.id === "home_castle" ? "🏰 Kaleniz" : selectedItem.name}
                  </h3>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full border uppercase font-bold mt-1.5 inline-block ${getMapItemColorClass(selectedItem.type)}`}>
                    Seviye {selectedItem.level} {selectedItem.type.startsWith("node_") ? "Kaynak Deposu" : selectedItem.type === "barbarian" ? "Barbar Kampı" : "Şehir"}
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="text-stone-500 hover:text-stone-300 transition p-1.5 bg-stone-900 rounded-full border border-stone-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Dynamic stats description */}
              <div className="mt-3.5 text-xs text-stone-300 leading-relaxed bg-stone-900/40 p-3 rounded-xl border border-stone-850/80">
                {selectedItem.id === "home_castle" && (
                  <p>Burası krallığınızın kalbi. Binaları yönetmek ve seviye sınırlarını artırmak için Şehir Yerleşkesi'ne geçin.</p>
                )}
                {selectedItem.type.startsWith("node_") && (
                  <div>
                    <p>Zengin kaynak yatağı! Sefer başlatarak kaynakları toplayıp şehrinize taşıyın.</p>
                    <p className="mt-2 text-[11px] text-stone-400">• Maks Kapasite: <span className="text-amber-400 font-bold font-mono">{selectedItem.maxResources}</span></p>
                    <p className="text-[11px] text-stone-400">• Kalan Rezerv: <span className="text-emerald-400 font-bold font-mono">{selectedItem.resourcesLeft}</span></p>
                  </div>
                )}
                {selectedItem.type === "barbarian" && (
                  <div>
                    <p>Köylere saldıran barbar çeteleri! Onları yenerek Komutan EXP'si ve kıymetli hazineler kazanın.</p>
                    <p className="mt-2 text-[11px] text-stone-400">• Tahmini Güç: <span className="text-red-400 font-bold font-mono">{selectedItem.level * 1800}</span></p>
                  </div>
                )}
                {selectedItem.type === "rival" && selectedItem.id !== "home_castle" && (
                  <div>
                    <p>Normandiya Krallığı'na ait zengin bir düşman şehri! Kuşatarak hazinelerini yağmalayın.</p>
                    <p className="mt-2 text-[11px] text-stone-400">• Savunma Gücü: <span className="text-purple-400 font-bold font-mono">{selectedItem.level * 4200}</span></p>
                  </div>
                )}
              </div>
            </div>

            {/* ROK-Style Commands (Enter City for castle, Deploy for resources/enemies) */}
            <div>
              {selectedItem.id === "home_castle" ? (
                <button
                  onClick={() => {
                    playSound("complete");
                    onEnterCity();
                  }}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-stone-950 font-display font-black text-xs tracking-wider rounded-xl hover:from-blue-400 hover:to-blue-500 shadow-lg shadow-blue-500/10 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Castle className="w-4 h-4 text-stone-950" />
                  ŞEHRE GİRİŞ YAP
                </button>
              ) : !isDeployOpen ? (
                <button
                  onClick={handleOpenDeploy}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-display font-black text-xs tracking-wider rounded-xl hover:from-amber-400 hover:to-amber-500 shadow-lg shadow-amber-500/10 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Navigation className="w-4 h-4 text-stone-950" />
                  {selectedItem.type.startsWith("node_") ? "TOPLAMA SEFERİ BAŞLAT" : "SALDIR / KUŞATMA PLANI"}
                </button>
              ) : (
                <div className="space-y-4 pt-1">
                  <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1">🛡️ Ordu Kurulumu</h4>
                  
                  {/* Select commander */}
                  <div>
                    <label className="text-[10px] text-stone-400 block mb-1">Sefer Komutanı:</label>
                    <select
                      value={selectedCommanderId}
                      onChange={(e) => {
                        playSound("click");
                        setSelectedCommanderId(e.target.value);
                      }}
                      className="w-full p-2.5 bg-stone-900 border border-stone-850 rounded-xl text-xs text-stone-200 font-bold outline-none focus:border-amber-500/50"
                    >
                      {commanders.filter(c => c.unlocked && !armies.some(a => a.commanderId === c.id)).map((comm) => (
                        <option key={comm.id} value={comm.id}>
                          {comm.avatar} {comm.name} (Sev {comm.level} - {comm.role})
                        </option>
                      ))}
                    </select>
                    {activeCommander && (
                      <p className="text-[10px] text-stone-500 mt-1">
                        Kapasite: <span className="font-bold text-amber-400 font-mono">{activeCommander.level * 200}</span> asker.
                      </p>
                    )}
                  </div>

                  {/* Sliders */}
                  <div className="space-y-2 bg-stone-900/60 p-3 rounded-xl border border-stone-850 text-[11px] font-bold text-stone-300">
                    <div>
                      <div className="flex justify-between">
                        <span>⚔️ Piyade ({availableTroops.infantry}):</span>
                        <span className="text-amber-400 font-mono">{deployInfantry}</span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max={availableTroops.infantry}
                        value={deployInfantry}
                        onChange={(e) => setDeployInfantry(Number(e.target.value))}
                        className="w-full accent-amber-500 h-1 bg-stone-950 rounded-lg appearance-none cursor-pointer mt-1"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between">
                        <span>🐴 Süvari ({availableTroops.cavalry}):</span>
                        <span className="text-amber-400 font-mono">{deployCavalry}</span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max={availableTroops.cavalry}
                        value={deployCavalry}
                        onChange={(e) => setDeployCavalry(Number(e.target.value))}
                        className="w-full accent-amber-500 h-1 bg-stone-950 rounded-lg appearance-none cursor-pointer mt-1"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between">
                        <span>🏹 Okçu ({availableTroops.archers}):</span>
                        <span className="text-amber-400 font-mono">{deployArchers}</span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max={availableTroops.archers}
                        value={deployArchers}
                        onChange={(e) => setDeployArchers(Number(e.target.value))}
                        className="w-full accent-amber-500 h-1 bg-stone-950 rounded-lg appearance-none cursor-pointer mt-1"
                      />
                    </div>

                    {activeCommander && (
                      <div className="border-t border-stone-800 pt-2 flex justify-between text-[11px]">
                        <span>Toplam Ordu:</span>
                        <span className={`font-bold font-mono ${
                          (deployInfantry + deployCavalry + deployArchers) > activeCommander.level * 200 
                            ? "text-red-400" 
                            : "text-amber-400"
                        }`}>
                          {deployInfantry + deployCavalry + deployArchers} / {activeCommander.level * 200}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsDeployOpen(false)}
                      className="w-1/3 py-2.5 bg-stone-900 hover:bg-stone-800 border border-stone-850 text-stone-400 hover:text-stone-200 text-xs font-black rounded-xl transition-all"
                    >
                      Vazgeç
                    </button>
                    <button
                      onClick={handleDeployConfirm}
                      className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-display font-black text-xs tracking-wider rounded-xl hover:from-amber-400 hover:to-amber-500 transition shadow"
                    >
                      ORDUYU ÇIKAR
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* OVERLAY POPUPS (COMMUNITY MENUS IN FLOATING DIALOGS ON THE CENTER) */}

      {/* 1. GÖREVLER (QUESTS) OVERLAY DIALOG */}
      {isQuestsOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-stone-900 border-2 border-stone-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-fadeIn">
            {/* Header */}
            <div className="bg-gradient-to-b from-stone-850 to-stone-900 p-5 px-6 border-b border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
                  <Award className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <h3 className="font-display font-black text-base text-stone-100">Kraliyet Görevleri</h3>
                  <p className="text-[10px] text-stone-500">Görevleri tamamlayarak kıymetli kaynak paketleri kazanın.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsQuestsOpen(false)}
                className="text-stone-400 hover:text-stone-200 p-2 bg-stone-950 rounded-full border border-stone-850 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable list */}
            <div className="p-6 overflow-y-auto space-y-3.5 flex-1 max-h-[50vh]">
              {quests.map((q) => {
                const isCompleted = q.currentValue >= q.targetValue;
                return (
                  <div key={q.id} className="p-4 bg-stone-950 border border-stone-850 rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-stone-200">{q.title}</h4>
                      <p className="text-[10px] text-stone-500 mt-0.5 leading-relaxed">{q.description}</p>
                      
                      {/* Progress bar */}
                      <div className="flex items-center gap-2.5 mt-2.5">
                        <div className="w-full bg-stone-900 h-1.5 rounded-full overflow-hidden border border-stone-850">
                          <div 
                            className={`h-full transition-all duration-500 ${isCompleted ? "bg-emerald-500" : "bg-amber-500"}`}
                            style={{ width: `${Math.min(100, (q.currentValue / q.targetValue) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-mono font-bold text-stone-400 whitespace-nowrap">
                          {q.currentValue} / {q.targetValue}
                        </span>
                      </div>
                    </div>

                    <div>
                      {q.rewarded ? (
                        <span className="text-[10px] text-stone-600 font-bold bg-stone-900 border border-stone-850 px-2.5 py-1.5 rounded-xl block text-center">TAMAMLANDI</span>
                      ) : isCompleted ? (
                        <button
                          onClick={() => { playSound("complete"); onClaimReward(q.id); }}
                          className="px-3.5 py-2 bg-emerald-500 text-stone-950 font-black text-[10px] rounded-xl hover:bg-emerald-400 transition shadow-md whitespace-nowrap"
                        >
                          ÖDÜLÜ AL 🎁
                        </button>
                      ) : (
                        <span className="text-[9px] text-amber-500 font-bold bg-amber-500/5 border border-amber-500/10 px-2.5 py-1.5 rounded-xl block text-center whitespace-nowrap">DEVAM EDİYOR</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2. KOMUTANLAR (COMMANDERS) OVERLAY DIALOG */}
      {isCommandersOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-stone-900 border-2 border-stone-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-fadeIn">
            {/* Header */}
            <div className="bg-gradient-to-b from-stone-850 to-stone-900 p-5 px-6 border-b border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-black text-base text-stone-100">Kraliyet Komutanları</h3>
                  <p className="text-[10px] text-stone-500">Müttefik generalleri çağırın ve onlara seviye atlatın.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCommandersOpen(false)}
                className="text-stone-400 hover:text-stone-200 p-2 bg-stone-950 rounded-full border border-stone-850 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable list */}
            <div className="p-6 overflow-y-auto space-y-3.5 flex-1 max-h-[50vh]">
              {commanders.map((comm) => {
                const cost = comm.level * 250;
                const canAfford = resources.gold >= cost;

                return (
                  <div key={comm.id} className="p-4 bg-stone-950 border border-stone-850 rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border border-stone-800 shadow-inner ${comm.color}`}>
                        {comm.avatar}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-stone-100 flex items-center gap-1.5">
                          {comm.name} 
                          <span className="text-[8px] bg-amber-500/15 border border-amber-500/25 text-amber-400 font-bold px-1 rounded">Sev {comm.level}</span>
                        </h4>
                        <p className="text-[9px] text-stone-400 mt-0.5">{comm.role}</p>
                        <p className="text-[9px] text-stone-500 mt-1">Savaş Bonusu: <span className="font-bold text-amber-400">+{comm.combatBonus}%</span> | Hız: <span className="font-bold text-blue-400">+{comm.speedBonus}%</span></p>
                      </div>
                    </div>

                    <div>
                      {comm.unlocked ? (
                        <button
                          disabled={!canAfford}
                          onClick={() => { playSound("upgrade"); onUpgradeCommander(comm.id, cost); }}
                          className={`px-3 py-1.5 rounded-xl font-bold text-[10px] border transition ${
                            canAfford 
                              ? "bg-amber-500 text-stone-950 border-amber-400 hover:bg-amber-400" 
                              : "bg-stone-900 text-stone-500 border-stone-850 cursor-not-allowed"
                          }`}
                        >
                          Seviye Atla ({cost} 🪙)
                        </button>
                      ) : (
                        <button
                          disabled={resources.gold < 1500}
                          onClick={() => { playSound("recruit"); onUnlockCommander(comm.id, 1500); }}
                          className={`px-3 py-1.5 rounded-xl font-bold text-[10px] border transition ${
                            resources.gold >= 1500 
                              ? "bg-gradient-to-r from-blue-500 to-blue-600 text-stone-950 border-blue-400 hover:from-blue-400 hover:to-blue-500" 
                              : "bg-stone-900 text-stone-500 border-stone-850 cursor-not-allowed"
                          }`}
                        >
                          Kilidi Aç (1500 🪙)
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. BATTLE LOGS OVERLAY DIALOG */}
      {isLogsOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-stone-900 border-2 border-stone-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-fadeIn">
            {/* Header */}
            <div className="bg-gradient-to-b from-stone-850 to-stone-900 p-5 px-6 border-b border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
                  <Scroll className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-display font-black text-base text-stone-100">Kraliyet Günlükleri</h3>
                  <p className="text-[10px] text-stone-500">Son askeri harekatlar, fetihler ve toplama raporları.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsLogsOpen(false)}
                className="text-stone-400 hover:text-stone-200 p-2 bg-stone-950 rounded-full border border-stone-850 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable list */}
            <div className="p-6 overflow-y-auto space-y-2 flex-1 max-h-[50vh]">
              {battleLogs.length > 0 ? (
                battleLogs.map((log, i) => (
                  <div key={i} className="p-3 bg-stone-950 border border-stone-850/80 rounded-xl text-xs text-stone-300 leading-relaxed font-mono">
                    {log}
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-stone-500 text-xs italic">
                  Henüz bir askeri sefer veya savaş gerçekleşmedi. Haritadaki hedefleri seçerek ordularınızı gönderin!
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
