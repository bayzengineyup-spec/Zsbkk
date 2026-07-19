import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini client lazily to avoid crashing on startup if key is missing
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// API Route: Gemini AI Advisor
app.post("/api/gemini/advisor", async (req, res) => {
  try {
    const { state, queryType } = req.body;
    
    let prompt = "";
    
    if (queryType === "event") {
      prompt = `Sen Kingdoms Rise 2D oyununun Baş Veziri ve Askeri Danışmanısın. Oyuncunun krallık durumu aşağıdadır:
Kaynaklar: Altın: ${state.gold}, Odun: ${state.wood}, Yiyecek: ${state.food}, Taş: ${state.stone}
Binalar: Belediye Binası Seviyesi: ${state.townHallLevel}, Kışla: ${state.barracksLevel}, Çiftlik: ${state.farmLevel}, Oduncu: ${state.lumberMillLevel}, Altın Madeni: ${state.goldMineLevel}
Askerler: Piyade: ${state.troops.infantry}, Süvari: ${state.troops.cavalry}, Okçu: ${state.troops.archers}
Komutanlar: ${state.commanders.map((c: any) => `${c.name} (Sev ${c.level})`).join(", ")}

Lütfen oyuncuya sunulacak ilginç, tarihi veya kurgusal bir krallık kararı olayı üret. Olay orta çağ temalı olmalı, krallık yönetimi, diplomasi veya savaşla ilgili olmalı.
Lütfen yanıtı JSON formatında döndür. Şema şu şekilde olmalıdır:
{
  "title": "Olayın Başlığı (Kısa ve çarpıcı)",
  "description": "Olayın açıklaması (Oyuncuyu atmosfere sokacak 2-3 cümlelik Türkçe metin)",
  "options": [
    {
      "text": "1. Seçenek Seçeneğin Kısa Açıklaması",
      "cost": { "gold": 100, "wood": 0, "food": 0, "stone": 0 }, // Seçeneğin maliyeti (eksi değerler kazanç demektir, örn: -150 odun oyuncuya odun verir)
      "reward": "Seçeneğin sonucu/kazanımı (Örn: 'Kışla üretimi geçici olarak hızlandı veya +150 Odun')",
      "effectText": "Bu seçeneği seçtiğinde ne olacağına dair Türkçe kısa özet"
    },
    {
      "text": "2. Seçenek Seçeneğin Kısa Açıklaması",
      "cost": { "gold": 0, "wood": 100, "food": 0, "stone": 0 },
      "reward": "Seçeneğin sonucu/kazanımı",
      "effectText": "Bu seçeneği seçtiğinde ne olacağına dair Türkçe kısa özet"
    }
  ]
}
Sadece geçerli bir JSON döndür, markdown veya süsleme yapma.`;
    } else {
      prompt = `Sen Kingdoms Rise 2D oyununun Baş Veziri ve Askeri Danışmanısın. Oyuncunun krallık durumu aşağıdadır:
Kaynaklar: Altın: ${state.gold}, Odun: ${state.wood}, Yiyecek: ${state.food}, Taş: ${state.stone}
Binalar: Belediye Binası Seviyesi: ${state.townHallLevel}, Kışla: ${state.barracksLevel}, Çiftlik: ${state.farmLevel}, Oduncu: ${state.lumberMillLevel}, Altın Madeni: ${state.goldMineLevel}
Askerler: Piyade: ${state.troops.infantry}, Süvari: ${state.troops.cavalry}, Okçu: ${state.troops.archers}
Komutanlar: ${state.commanders.map((c: any) => `${c.name} (Sev ${c.level}, Sınıf: ${c.role})`).join(", ")}
Aktif Görevler: Seviye ${state.quests?.map((q: any) => q.title).join(", ") || "Yok"}

Krallığın şu anki durumuna göre oyuncuya TÜRKÇE stratejik öneriler ve heyecanlandırıcı askeri tavsiyeler ver.
Yanıtını JSON formatında döndür. Şema şu şekilde olmalıdır:
{
  "greeting": "Vezirden oyuncuya hitaben şık bir orta çağ tarzı karşılama (Maksimum 1-2 cümle)",
  "recommendations": [
    "1. Öneri (Örn: 'Odun stoğumuz çok az, oduncuyu seviye 2 yapalım')",
    "2. Öneri (Örn: 'Süvarilerimiz piyadelere karşı zayıftır, dengeli bir ordu için kışlada okçuları eğitmeye ağırlık vermeliyiz')",
    "3. Öneri"
  ],
  "motivation": "Oyuncuyu fethe ve krallığını büyütmeye yönlendirecek heyecan verici bir son söz."
}
Sadece geçerli bir JSON döndür, markdown veya süsleme yapma.`;
    }

    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text || "{}";
      const cleaned = responseText.trim();
      res.json(JSON.parse(cleaned));
    } catch (apiError: any) {
      console.error("Gemini API Error:", apiError);
      // Return a structured mock/fallback response if the Gemini API is unavailable or fails
      if (queryType === "event") {
        res.json({
          title: "Sınır Boylarında Haydutlar",
          description: "Sınır boylarındaki köylülerimiz haydut saldırılarından şikayetçi. Ordumuzu oraya gönderip köylüleri koruyabilir veya köylüleri kaderine bırakıp askerlerimizi şehirde tutabiliriz.",
          options: [
            {
              text: "Köylüleri Koru ve Haydutları Temizle",
              cost: { gold: 50, wood: 0, food: 50, stone: 0 },
              reward: "Köylülerin şükranı: +100 Odun ve ordu tecrübesi",
              effectText: "50 Altın ve 50 Yiyecek harcar, karşılığında 100 Odun kazandırır."
            },
            {
              text: "Köylüleri Görmezden Gel (Tasarruf Et)",
              cost: { gold: 0, wood: 0, food: 0, stone: 0 },
              reward: "Hiçbir şey değişmez ama köylüler mutsuz olur",
              effectText: "Kaynak harcamazsınız."
            }
          ]
        });
      } else {
        res.json({
          greeting: "Saygıdeğer Efendim, imparatorluğumuzun temelleri sarsılmaz bir iradeyle yükseliyor!",
          recommendations: [
            "Odun ve Altın madenlerimizi yükselterek üretimimizi artırmalıyız.",
            "Kışlamızı geliştirip daha fazla piyade ve süvari eğiterek gücümüzü barbarlara göstermeliyiz.",
            "Dünya haritasındaki odun ve yiyecek kaynaklarını toplamak için komutanlarımızı görevlendirelim."
          ],
          motivation: "Gökler krallığımızın şanlı yükselişine şahit olsun! Kılıcınız keskin, gazanız mübarek olsun!"
        });
      }
    }
  } catch (error: any) {
    console.error("Express Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Setup Vite Dev Server / Static Asset serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
