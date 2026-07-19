import React, { useState, useEffect } from "react";
import { 
  Sparkles, Scroll, Coins, Wheat, Axe, Pickaxe, Swords, Shield,
  MessageSquare, Hourglass, ArrowRight, X, Compass, CheckCircle, Flame
} from "lucide-react";
import { GameState, Resources } from "../types";
import { playSound } from "../utils/audio";

interface AdvisorModalProps {
  gameState: GameState;
  onApplyEventEffect: (cost: Partial<Resources>, rewardText: string) => void;
  onClose: () => void;
}

interface AdviceData {
  greeting: string;
  recommendations: string[];
  motivation: string;
}

interface EventOption {
  text: string;
  cost: { gold: number; wood: number; food: number; stone: number };
  reward: string;
  effectText: string;
}

interface EventData {
  title: string;
  description: string;
  options: EventOption[];
}

export default function AdvisorModal({
  gameState,
  onApplyEventEffect,
  onClose
}: AdvisorModalProps) {
  const [activeTab, setActiveTab] = useState<"advice" | "event">("advice");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [advice, setAdvice] = useState<AdviceData | null>(null);
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [eventOutcomeText, setEventOutcomeText] = useState<string | null>(null);

  const loadingPhrases = [
    "Vezir krallık raporlarını inceliyor...",
    "Ulaklar sınır boylarından haber getiriyor...",
    "Hazine dairesi altın ve gümüş hesaplamaları yapıyor...",
    "Kütüphanedeki parşömenler taranıyor...",
    "Büyük strateji haritası hazırlanıyor..."
  ];

  // Rotate loading phrases while waiting
  useEffect(() => {
    if (isLoading) {
      setLoadingMessage(loadingPhrases[0]);
      const interval = setInterval(() => {
        const randomPhrase = loadingPhrases[Math.floor(Math.random() * loadingPhrases.length)];
        setLoadingMessage(randomPhrase);
      }, 2200);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  const fetchAdvice = async () => {
    setIsLoading(true);
    try {
      const simplifiedState = {
        gold: gameState.resources.gold,
        wood: gameState.resources.wood,
        food: gameState.resources.food,
        stone: gameState.resources.stone,
        townHallLevel: gameState.buildings.townHall.level,
        barracksLevel: gameState.buildings.barracks.level,
        farmLevel: gameState.buildings.farm.level,
        lumberMillLevel: gameState.buildings.lumberMill.level,
        goldMineLevel: gameState.buildings.goldMine.level,
        troops: gameState.troops,
        commanders: gameState.commanders.filter(c => c.unlocked).map(c => ({ name: c.name, level: c.level, role: c.role })),
        quests: gameState.quests.filter(q => !q.rewarded)
      };

      const response = await fetch("/api/gemini/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: simplifiedState, queryType: "advice" })
      });

      if (!response.ok) throw new Error("API call failed");
      const data = await response.json();
      setAdvice(data);
    } catch (err) {
      console.error(err);
      // Fallback
      setAdvice({
        greeting: "Saygıdeğer Efendim, krallığımızın geleceği sizin yüce kararlarınıza bağlıdır!",
        recommendations: [
          "Odun üretimini desteklemek için Odun Deposu seviyesini artırın.",
          "Komutanlarınızı haritadaki zengin maden yataklarına göndererek altın stoğumuzu büyütün.",
          "Belediye Binasını geliştirerek yeni inşaatların önünü açın."
        ],
        motivation: "Adınız fatihlerle anılsın, kılıcınız her daim keskin olsun!"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEvent = async () => {
    setIsLoading(true);
    setSelectedOptionIndex(null);
    setEventOutcomeText(null);
    try {
      const simplifiedState = {
        gold: gameState.resources.gold,
        wood: gameState.resources.wood,
        food: gameState.resources.food,
        stone: gameState.resources.stone,
        townHallLevel: gameState.buildings.townHall.level,
        barracksLevel: gameState.buildings.barracks.level,
        farmLevel: gameState.buildings.farm.level,
        lumberMillLevel: gameState.buildings.lumberMill.level,
        goldMineLevel: gameState.buildings.goldMine.level,
        troops: gameState.troops,
        commanders: gameState.commanders.filter(c => c.unlocked).map(c => ({ name: c.name, level: c.level, role: c.role }))
      };

      const response = await fetch("/api/gemini/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: simplifiedState, queryType: "event" })
      });

      if (!response.ok) throw new Error("API call failed");
      const data = await response.json();
      setEventData(data);
    } catch (err) {
      console.error(err);
      // Fallback event
      setEventData({
        title: "Göçebe Kervanı Yaklaşıyor",
        description: "Sınır kapılarımıza zengin kumaşlar ve egzotik baharatlar taşıyan bir göçebe kervanı yanaştı. Kervan reisi bize indirimli ticaret teklif ediyor, ya da onları orduya katmaya zorlayabiliriz.",
        options: [
          {
            text: "Dostane Ticaret Yap",
            cost: { gold: 150, wood: 0, food: 0, stone: 0 },
            reward: "Karşılığında kervan bize odun ve taş bağışlıyor! (+300 Odun, +150 Taş)",
            effectText: "150 Altın harcar, 300 Odun ve 150 Taş kazandırır."
          },
          {
            text: "Kervanı Sınır Dışı Et",
            cost: { gold: 0, wood: 0, food: 0, stone: 0 },
            reward: "Kervan huzursuzca gidiyor. Herhangi bir kazanç veya kayıp yok.",
            effectText: "Hiçbir şey harcamazsınız."
          }
        ]
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "advice" && !advice) {
      fetchAdvice();
    } else if (activeTab === "event" && !eventData) {
      fetchEvent();
    }
  }, [activeTab]);

  const handleSelectOption = (index: number) => {
    if (!eventData) return;
    playSound("click");
    setSelectedOptionIndex(index);
    const option = eventData.options[index];

    // Verify if player can afford cost
    const canAfford = Object.entries(option.cost).every(([res, val]) => (gameState.resources as any)[res] >= val);
    
    if (!canAfford) {
      alert("Bu seçeneği seçmek için krallık kasasında yeterli kaynak bulunmuyor!");
      setSelectedOptionIndex(null);
      return;
    }

    setEventOutcomeText(option.reward);
  };

  const handleApplyEvent = () => {
    if (!eventData || selectedOptionIndex === null) return;
    playSound("complete");
    const option = eventData.options[selectedOptionIndex];
    onApplyEventEffect(option.cost, option.reward);
    setEventData(null);
    setSelectedOptionIndex(null);
    setEventOutcomeText(null);
    fetchEvent(); // reload another event
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-800 bg-stone-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/30">
              <Scroll className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-stone-100 flex items-center gap-1.5">
                Vezir & Askeri Danışman <Sparkles className="w-4 h-4 text-amber-500" />
              </h2>
              <p className="text-xs text-stone-400">Yapay Zeka destekli İmparatorluk Odası</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 bg-stone-950/60 hover:bg-stone-950 rounded-full border border-stone-800 text-stone-400 hover:text-stone-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-stone-950 border-b border-stone-800">
          <button
            onClick={() => { playSound("click"); setActiveTab("advice"); }}
            className={`flex-1 py-3 text-center text-sm font-bold border-b-2 transition ${
              activeTab === "advice" 
                ? "border-amber-500 text-amber-400 bg-stone-900/40" 
                : "border-transparent text-stone-500 hover:text-stone-300"
            }`}
          >
            📋 Stratejik Rapor (Öneriler)
          </button>
          <button
            onClick={() => { playSound("click"); setActiveTab("event"); }}
            className={`flex-1 py-3 text-center text-sm font-bold border-b-2 transition ${
              activeTab === "event" 
                ? "border-amber-500 text-amber-400 bg-stone-900/40" 
                : "border-transparent text-stone-500 hover:text-stone-300"
            }`}
          >
            🏛️ Krallık Kararları (Olaylar)
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
              <Hourglass className="w-12 h-12 text-amber-500 animate-[spin_4s_linear_infinite]" />
              <p className="font-display font-medium text-stone-300 animate-pulse">{loadingMessage}</p>
              <p className="text-xs text-stone-500">Gemini krallık verilerini inceliyor...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: Advice */}
              {activeTab === "advice" && advice && (
                <div className="space-y-6">
                  {/* Greeting banner */}
                  <div className="p-4 bg-amber-950/20 border border-amber-900/30 rounded-xl relative overflow-hidden flex gap-4 items-start">
                    <div className="text-3xl select-none shrink-0 mt-1">👳‍♂️</div>
                    <div>
                      <h4 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">Vezirin Karşılaması</h4>
                      <p className="text-sm text-stone-200 italic leading-relaxed">
                        &ldquo;{advice.greeting}&rdquo;
                      </p>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">Altın Tavsiyeler ve Hedefler</h4>
                    <div className="space-y-2.5">
                      {advice.recommendations.map((rec, i) => (
                        <div key={i} className="p-3 bg-stone-950/60 border border-stone-800/80 rounded-xl flex gap-3 items-start hover:border-stone-700 transition">
                          <span className="w-5 h-5 rounded bg-amber-500/10 text-amber-400 flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <p className="text-xs text-stone-300 leading-relaxed">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Motivation */}
                  <div className="border-t border-stone-800/60 pt-4 flex items-center justify-between text-xs text-stone-400">
                    <span className="italic font-display text-amber-500/80 font-bold">&ldquo;{advice.motivation}&rdquo;</span>
                    <button 
                      onClick={fetchAdvice}
                      className="text-xs px-3 py-1.5 bg-stone-950 hover:bg-stone-800 rounded border border-stone-800 text-stone-300 font-bold transition flex items-center gap-1"
                    >
                      🔄 Raporu Güncelle
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: Custom Decision Event */}
              {activeTab === "event" && eventData && (
                <div className="space-y-5">
                  {/* Event Story */}
                  <div className="space-y-2">
                    <h3 className="font-display text-base font-bold text-amber-400">{eventData.title}</h3>
                    <p className="text-xs text-stone-300 leading-relaxed bg-stone-950/60 p-4 border border-stone-800/60 rounded-xl italic">
                      &ldquo;{eventData.description}&rdquo;
                    </p>
                  </div>

                  {/* Options List */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">Kararınızı Seçin:</h4>
                    {eventData.options.map((opt, i) => {
                      const isSelected = selectedOptionIndex === i;
                      // Check cost
                      const meetsCost = Object.entries(opt.cost).every(([res, val]) => (gameState.resources as any)[res] >= val);

                      return (
                        <button
                          key={i}
                          disabled={eventOutcomeText !== null}
                          onClick={() => handleSelectOption(i)}
                          className={`w-full text-left p-4 rounded-xl border transition-all ${
                            isSelected 
                              ? "bg-amber-950/30 border-amber-500/80 ring-2 ring-amber-500/20" 
                              : "bg-stone-950/40 border-stone-850 hover:border-stone-800"
                          } ${!meetsCost ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <span className="font-display font-bold text-xs text-stone-200">
                              {i === 0 ? "A" : "B"}. {opt.text}
                            </span>
                            {isSelected && <span className="text-[10px] bg-amber-500 text-stone-950 font-bold px-1.5 py-0.25 rounded">Seçildi</span>}
                          </div>

                          <div className="text-[10px] text-stone-400 flex flex-wrap gap-x-4 gap-y-1">
                            <span className="flex items-center gap-0.5">
                              💰 Maliyet: 
                              {Object.entries(opt.cost).filter(([_, val]) => (val as number) > 0).map(([res, val]) => (
                                <span key={res} className="font-bold text-stone-300 ml-0.5">{val as number}{res === "gold" ? "🪙" : res === "wood" ? "🪵" : res === "food" ? "🌾" : "🪨"}</span>
                              ))}
                              {Object.values(opt.cost).every(v => (v as number) <= 0) && <span className="font-bold text-emerald-400 ml-0.5">Ücretsiz</span>}
                            </span>
                            <span className="text-amber-400">• Etki: {opt.effectText}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Decision Outcome reveal */}
                  {eventOutcomeText && (
                    <div className="p-4 bg-emerald-950/20 border border-emerald-900/30 rounded-xl space-y-3 animate-fadeIn">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                        <CheckCircle className="w-4 h-4" /> Kararın Sonuçları
                      </div>
                      <p className="text-xs text-stone-300 leading-relaxed font-sans">{eventOutcomeText}</p>
                      
                      <button
                        onClick={handleApplyEvent}
                        className="w-full py-2 bg-emerald-500 text-stone-950 rounded-lg text-xs font-bold hover:bg-emerald-400 transition flex items-center justify-center gap-1 shadow-md shadow-emerald-500/10"
                      >
                        ETKİYİ UYGULA VE DEVAM ET <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer info bar */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 text-[10px] text-stone-500 flex justify-between">
          <span>Yapay zeka analizleri Belediye Binası ve Kışla gelişimlerini takip eder.</span>
          <span>Kingdoms Rise 2D Advisor Panel</span>
        </div>
      </div>
    </div>
  );
}
