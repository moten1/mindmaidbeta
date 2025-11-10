// ============================================
// 🧠 MindMaid AI Routes — Emotionally Intelligent Version
// ============================================

import express from "express";
import fetch from "node-fetch";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = express.Router();

// === 🔑 Load API Keys ===
const {
  GEMINI_API_KEY,
  HUME_API_KEY,
  DEEPSEEK_API_KEY,
  OPENROUTER_API_KEY,
  SPOONACULAR_API_KEY,
} = process.env;

// === 🔮 Initialize Gemini if available ===
let geminiModel = null;
if (GEMINI_API_KEY) {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    geminiModel = genAI.getGenerativeModel({ model: "gemini-pro" });
    console.log("✅ Gemini initialized");
  } catch (err) {
    console.warn("⚠️ Gemini initialization failed:", err.message);
  }
}

// === 🧠 Mood-Adaptive Tone Map ===
const toneModifiers = {
  happy: "Match their upbeat vibe — be playful, confident, and fun.",
  sad: "Be gentle, kind, and hopeful — warmth over logic.",
  tired: "Be soft and grounding — short, calm sentences, like a deep breath.",
  anxious: "Be reassuring and steady — help them slow down.",
  angry: "Be neutral but validating — let calmness lead clarity.",
  neutral: "Be balanced, thoughtful, slightly witty but not loud.",
};

// === 💡 AI Advice Route ===
router.post("/advice", async (req, res) => {
  const { query, mood = "neutral", type = "decision" } = req.body || {};

  if (!query) {
    return res.status(400).json({
      success: false,
      error: "Missing query",
    });
  }

  try {
    let aiResponse = "";
    const systemPrompt = `
You are MindMaid — an emotionally intelligent, witty companion that helps users make micro-decisions with calm clarity.

Context:
- User mood: ${mood}
- Decision type: ${type}

Tone guide: ${toneModifiers[mood] || toneModifiers.neutral}
Guidelines:
- Sound like a mindful friend, not a chatbot.
- Always make the user feel understood before suggesting anything.
- Use subtle emojis if they fit naturally.
- Keep under 60 words.
`;

    // === 1️⃣ Try Gemini ===
    if (!aiResponse && geminiModel) {
      try {
        console.log("🔮 Trying Gemini...");
        const result = await geminiModel.generateContent(`${systemPrompt}\n\nUser: ${query}`);
        const response = await result.response;
        aiResponse = response.text()?.trim() || "";
        if (aiResponse) console.log("✅ Gemini responded");
      } catch (err) {
        console.warn("⚠️ Gemini failed:", err.message);
      }
    }

    // === 2️⃣ Try OpenRouter ===
    if (!aiResponse && OPENROUTER_API_KEY) {
      try {
        console.log("🔮 Trying OpenRouter...");
        const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.0-flash-exp:free",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: query },
            ],
          }),
        });
        const data = await resp.json();
        aiResponse = data?.choices?.[0]?.message?.content?.trim() || "";
        if (aiResponse) console.log("✅ OpenRouter responded");
      } catch (err) {
        console.warn("⚠️ OpenRouter failed:", err.message);
      }
    }

    // === 3️⃣ Try DeepSeek ===
    if (!aiResponse && DEEPSEEK_API_KEY) {
      try {
        console.log("🔮 Trying DeepSeek...");
        const resp = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: query },
            ],
          }),
        });
        const data = await resp.json();
        aiResponse = data?.choices?.[0]?.message?.content?.trim() || "";
        if (aiResponse) console.log("✅ DeepSeek responded");
      } catch (err) {
        console.warn("⚠️ DeepSeek failed:", err.message);
      }
    }

    // === 4️⃣ Smarter Fallback Layer ===
    if (!aiResponse) {
      console.log("⚠️ Using intelligent fallback suggestions");

      const fallbacks = {
        decision: [
          "🌿 Go with what brings you peace, not just approval.",
          "💫 The calm choice often hides the real courage.",
          "🔥 If it excites you and scares you a little — that’s the one.",
        ],
        activity: [
          "🚶 Take a small walk — clarity follows movement.",
          "🕯️ Do something kind for yourself, not productive.",
          "🎧 Music and stillness fix more than logic does.",
        ],
        meals: [
          "🥗 Light, fresh, and mood-friendly — trust your body’s craving.",
          "🍜 Comfort first. The world can wait.",
          "🍓 Something sweet but simple — joy doesn’t need to be earned.",
        ],
        clothes: [
          "🖤 Wear what feels powerful, not just what looks right.",
          "✨ Your energy is the outfit — clothes just catch up.",
          "🌈 Choose color for the mood you want, not the one you’re in.",
        ],
        quick: [
          "✅ Go for it — momentum beats overthinking.",
          "🤔 Wait a bit — time is a better mirror than thought.",
          "❌ Let this one go. You’ll feel lighter instantly.",
        ],
      };

      const suggestions = fallbacks[type] || fallbacks.decision;
      aiResponse = suggestions[Math.floor(Math.random() * suggestions.length)];
    }

    // ✅ Unified Response
    return res.json({
      success: true,
      type,
      mood,
      query,
      result: aiResponse,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("❌ AI route error:", error);
    return res.status(500).json({
      success: false,
      type: req.body?.type || "decision",
      mood: req.body?.mood || "neutral",
      query: req.body?.query || "",
      result: "AI service is offline 😅 — please try again later.",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// === 🍽️ Meal Suggestion Route ===
router.post("/meal-suggestion", async (req, res) => {
  const { preferences, mood } = req.body || {};

  if (!SPOONACULAR_API_KEY) {
    return res.json({
      success: true,
      result: "🍕 Try something that matches your comfort level tonight.",
    });
  }

  try {
    const resp = await fetch(
      `https://api.spoonacular.com/recipes/random?number=1&apiKey=${SPOONACULAR_API_KEY}`
    );
    const data = await resp.json();
    const recipe = data?.recipes?.[0];

    if (recipe) {
      return res.json({
        success: true,
        result: `🍽️ How about ${recipe.title}? It’s ${
          mood === "tired" ? "easy and soothing" : "vibrant and flavorful"
        } — just right for your mood.`,
        recipe: {
          title: recipe.title,
          image: recipe.image,
          url: recipe.sourceUrl,
        },
      });
    }
  } catch (err) {
    console.warn("⚠️ Spoonacular failed:", err.message);
  }

  return res.json({
    success: true,
    result: "🍝 Go with your gut — your intuition always tastes right.",
  });
});

export default router;
