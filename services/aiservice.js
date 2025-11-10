// backend/services/aiService.js
const fetch = require("node-fetch");

const HUME_API_KEY = process.env.HUME_API_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

async function getAIResponse(prompt, history = []) {
  try {
    // =============================
    // 🧠 Primary: DeepSeek
    // =============================
    const deepseekRes = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          ...history,
          { role: "user", content: prompt },
        ],
      }),
    });

    const deepseekData = await deepseekRes.json();
    if (deepseekData?.choices?.[0]?.message?.content)
      return deepseekData.choices[0].message.content.trim();
  } catch (err) {
    console.warn("⚠️ DeepSeek failed:", err.message);
  }

  try {
    // =============================
    // 🌐 Fallback: OpenRouter
    // =============================
    const openrouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          ...history,
          { role: "user", content: prompt },
        ],
      }),
    });

    const openrouterData = await openrouterRes.json();
    if (openrouterData?.choices?.[0]?.message?.content)
      return openrouterData.choices[0].message.content.trim();
  } catch (err) {
    console.warn("⚠️ OpenRouter failed:", err.message);
  }

  try {
    // =============================
    // 🎭 Emotion-aware fallback: Hume
    // =============================
    const humeRes = await fetch("https://api.hume.ai/v0/expressions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Hume-Api-Key": HUME_API_KEY,
      },
      body: JSON.stringify({ text: prompt }),
    });

    const humeData = await humeRes.json();
    const emotion =
      humeData?.predictions?.[0]?.emotions?.[0]?.name || "neutral";
    return `I'd say you’re feeling ${emotion} — trust that and go with what feels right 💫`;
  } catch (err) {
    console.error("❌ Hume failed too:", err.message);
  }

  return "All AI systems are offline — maybe it’s a sign to take a break 😅";
}

module.exports = { getAIResponse };
