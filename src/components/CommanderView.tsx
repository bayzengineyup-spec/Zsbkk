import React from "react";
import { 
  User, Shield, Swords, Sparkles, Star, Zap, Award, Check
} from "lucide-react";
import { Commander, Resources } from "../types";
import { playSound } from "../utils/audio";

interface CommanderViewProps {
  commanders: Commander[];
  resources: Resources;
  onUnlockCommander: (id: string, costGold: number) => void;
  onUpgradeCommander: (id: string, costGold: number) => void;
}

export default function CommanderView({
  commanders,
  resources,
  onUnlockCommander,
  onUpgradeCommander
}: CommanderViewProps) {

  const getRoleIcon = (roleType: string) => {
    switch (roleType) {
      case "infantry": return <Shield className="w-3.5 h-3.5 text-blue-400" />;
      case "cavalry": return <Zap className="w-3.5 h-3.5 text-orange-400" />;
      case "archers": return <Swords className="w-3.5 h-3.5 text-red-400" />;
      case "gathering": return <Star className="w-3.5 h-3.5 text-yellow-400" />;
      default: return <User className="w-3.5 h-3.5 text-stone-400" />;
    }
  };

  const getUnlockCost = (id: string) => {
    if (id === "joan") return 500;
    if (id === "caesar") return 1000;
    if (id === "cleo") return 1500;
    return 0;
  };

  return (
    <div className="bg-stone-900/40 border border-stone-800 rounded-2xl p-6 backdrop-blur-md">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-stone-800 pb-4 mb-6 gap-2">
        <div>
          <h2 className="font-display text-xl text-amber-500 flex items-center gap-2">
            <Award className="w-6 h-6" /> Krallık Komutanları (Heroes)
          </h2>
          <p className="text-sm text-stone-400">
            Komutanlarınızı toplayın, seviyelerini yükseltin ve ordularınızı fethe göndermek için görevlendirin.
          </p>
        </div>
        <div className="text-xs bg-stone-950 px-3 py-1.5 rounded-lg border border-stone-800 text-stone-400 font-mono">
          Kasa Altını: <span className="text-yellow-400 font-bold">{resources.gold}🪙</span>
        </div>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {commanders.map((comm) => {
          const unlockCost = getUnlockCost(comm.id);
          const upgradeCost = comm.level * 100; // cost to level up: Lvl * 100 gold
          const canAffordUnlock = resources.gold >= unlockCost;
          const canAffordUpgrade = resources.gold >= upgradeCost;
          
          return (
            <div 
              key={comm.id}
              className={`p-5 rounded-xl border flex flex-col justify-between transition-all ${
                comm.unlocked 
                  ? "bg-stone-950/70 border-stone-800" 
                  : "bg-stone-950/30 border-stone-900/80 opacity-70"
              }`}
            >
              {/* Upper Section */}
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex gap-3">
                    {/* Visual Avatar frame */}
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl shadow ${comm.color} border border-white/10 shrink-0`}>
                      {comm.avatar}
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-sm text-stone-200 flex items-center gap-1.5">
                        {comm.name}
                        {comm.unlocked && (
                          <span className="text-[10px] font-mono px-1.5 py-0.25 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full font-bold">
                            Sev {comm.level}
                          </span>
                        )}
                      </h3>
                      {/* Specialty Tag */}
                      <span className="inline-flex items-center gap-1 text-[10px] text-stone-400 font-medium bg-stone-900/60 px-2 py-0.5 rounded border border-stone-800 mt-1">
                        {getRoleIcon(comm.roleType)}
                        {comm.role}
                      </span>
                    </div>
                  </div>

                  {!comm.unlocked && (
                    <span className="text-[10px] font-bold text-red-400 bg-red-950/30 px-2 py-1 rounded border border-red-900/40">
                      KİLİTLİ
                    </span>
                  )}
                </div>

                {/* Stat Modifiers */}
                {comm.unlocked ? (
                  <div className="grid grid-cols-3 gap-2 bg-stone-950/80 p-2.5 rounded-lg border border-stone-900 text-[10px] text-stone-400 font-mono mb-4">
                    <div>
                      Hız Bonusu: <span className="text-amber-400 font-bold">+{comm.speedBonus}%</span>
                    </div>
                    <div>
                      Toplama: <span className="text-emerald-400 font-bold">+{comm.gatherBonus}%</span>
                    </div>
                    <div>
                      Savaş Gücü: <span className="text-red-400 font-bold">+{comm.combatBonus}%</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-stone-500 italic mb-4">
                    Bu efsanevi kahraman krallığınıza hizmet etmek için altın parşömeniyle çağrılmayı bekliyor.
                  </p>
                )}

                {/* Active Skill */}
                <div className="p-3 bg-stone-900/40 rounded-lg border border-stone-850 mb-4">
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-500 mb-1">
                    <Zap className="w-3.5 h-3.5" /> Özel Yetenek: {comm.activeSkill.name}
                  </div>
                  <p className="text-[10px] text-stone-400 leading-relaxed">
                    {comm.activeSkill.description}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="border-t border-stone-900 pt-3 mt-auto">
                {comm.unlocked ? (
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] text-stone-500">
                      Sonraki Seviye Maliyeti: <span className="text-yellow-400 font-bold font-mono">{upgradeCost} Altın</span>
                    </div>
                    <button
                      disabled={!canAffordUpgrade}
                      onClick={() => {
                        playSound("recruit");
                        onUpgradeCommander(comm.id, upgradeCost);
                      }}
                      className={`text-xs px-4 py-1.5 rounded-lg font-bold border transition ${
                        canAffordUpgrade 
                          ? "bg-amber-500 text-stone-950 border-amber-400 hover:bg-amber-400" 
                          : "bg-stone-900 text-stone-600 border-stone-800 cursor-not-allowed"
                      }`}
                    >
                      Eğit (Lvl Up)
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] text-stone-500">
                      Çağırma Bedeli: <span className="text-yellow-400 font-bold font-mono">{unlockCost} Altın</span>
                    </div>
                    <button
                      disabled={!canAffordUnlock}
                      onClick={() => {
                        playSound("complete");
                        onUnlockCommander(comm.id, unlockCost);
                      }}
                      className={`text-xs px-4 py-1.5 rounded-lg font-bold border transition ${
                        canAffordUnlock 
                          ? "bg-amber-500 text-stone-950 border-amber-400 hover:bg-amber-400" 
                          : "bg-stone-900 text-stone-600 border-stone-800 cursor-not-allowed"
                      }`}
                    >
                      Komutanı Çağır
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
