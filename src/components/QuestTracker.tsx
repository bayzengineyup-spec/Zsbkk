import React from "react";
import { CheckCircle2, Circle, Gift, Award, Swords, ArrowUpCircle } from "lucide-react";
import { Quest, Resources } from "../types";
import { playSound } from "../utils/audio";

interface QuestTrackerProps {
  quests: Quest[];
  onClaimReward: (questId: string) => void;
}

export default function QuestTracker({ quests, onClaimReward }: QuestTrackerProps) {
  
  const getQuestIcon = (type: string) => {
    switch (type) {
      case "upgrade_building": return <ArrowUpCircle className="w-5 h-5 text-amber-500" />;
      case "train_troops": return <Swords className="w-5 h-5 text-rose-500" />;
      case "defeat_barbarians": return <Award className="w-5 h-5 text-red-500" />;
      default: return <Gift className="w-5 h-5 text-emerald-500" />;
    }
  };

  const getRewardBadgeText = (rewards: Partial<Resources>) => {
    return Object.entries(rewards).map(([res, val]) => {
      if (!val) return null;
      return (
        <span key={res} className="text-[10px] bg-stone-950 px-2 py-0.5 rounded border border-stone-850 font-bold font-mono text-stone-300">
          {res === "gold" && "🪙 Altın"}
          {res === "wood" && "🪵 Odun"}
          {res === "food" && "🌾 Yiyecek"}
          {res === "stone" && "🪨 Taş"}
          {res === "speedups" && "⚡ Hızlandırma"}
          : +{val}
        </span>
      );
    });
  };

  const activeQuests = quests.filter(q => !q.rewarded);
  const completedQuestsCount = quests.filter(q => q.currentValue >= q.targetValue && !q.rewarded).length;

  return (
    <div className="bg-stone-900/40 border border-stone-800 rounded-2xl p-6 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-stone-800 pb-4 mb-4">
        <div>
          <h3 className="font-display font-bold text-base text-stone-200 flex items-center gap-2">
            🏆 Görevler ve Yol Haritası
          </h3>
          <p className="text-xs text-stone-400 mt-0.5">Hedefleri tamamlayarak imparatorluk sandıklarından ödüller kazanın.</p>
        </div>
        {completedQuestsCount > 0 && (
          <span className="text-[10px] bg-emerald-500 text-stone-950 font-bold px-2 py-0.5 rounded-full animate-bounce">
            {completedQuestsCount} Hazır Ödül!
          </span>
        )}
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
        {activeQuests.length > 0 ? (
          activeQuests.map((q) => {
            const isCompleted = q.currentValue >= q.targetValue;
            const progressPercent = Math.min(100, (q.currentValue / q.targetValue) * 100);

            return (
              <div 
                key={q.id}
                className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                  isCompleted 
                    ? "bg-emerald-950/20 border-emerald-900/40" 
                    : "bg-stone-950/40 border-stone-850"
                }`}
              >
                {/* Left Part: Description & Progress */}
                <div className="flex gap-3 items-start flex-1">
                  <div className="p-2 bg-stone-900/80 rounded-lg shrink-0 mt-0.5">
                    {getQuestIcon(q.targetType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-xs font-bold leading-tight ${isCompleted ? "text-emerald-400" : "text-stone-200"}`}>
                      {q.title}
                    </h4>
                    <p className="text-[10px] text-stone-400 mt-0.5 leading-relaxed">{q.description}</p>
                    
                    {/* Progress Bar */}
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 bg-stone-950 h-1 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${isCompleted ? "bg-emerald-500" : "bg-amber-500"}`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-mono font-bold text-stone-300 shrink-0">
                        {q.currentValue}/{q.targetValue}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Part: Rewards & Claims */}
                <div className="flex flex-col md:items-end justify-between gap-2 border-t md:border-t-0 border-stone-800/60 pt-3 md:pt-0 shrink-0">
                  <div className="flex flex-wrap gap-1 md:justify-end">
                    {getRewardBadgeText(q.rewards)}
                  </div>
                  
                  {isCompleted ? (
                    <button
                      id={`btn-claim-quest-${q.id}`}
                      onClick={() => {
                        playSound("complete");
                        onClaimReward(q.id);
                      }}
                      className="text-xs px-4 py-1.5 bg-emerald-500 text-stone-950 font-bold rounded-lg hover:bg-emerald-400 transition shadow shadow-emerald-500/10 flex items-center gap-1 self-start md:self-auto"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> ÖDÜLÜ AL
                    </button>
                  ) : (
                    <span className="text-[10px] text-stone-500 flex items-center gap-1 font-bold md:mr-1">
                      <Circle className="w-3 h-3" /> Devam Ediyor
                    </span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-stone-500">
            <CheckCircle2 className="w-12 h-12 text-emerald-500/30 mx-auto mb-2 animate-pulse" />
            <p className="text-xs">Tüm krallık görevleri başarıyla tamamlandı! Şanınız dilden dile yayılıyor.</p>
          </div>
        )}
      </div>
    </div>
  );
}
