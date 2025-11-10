// backend/services/decisionEngine.js
import fetch from "node-fetch";

const SPOON_API_KEY = process.env.SPOON_API_KEY; // from backend.env
const SPOON_API_URL = "https://api.spoonacular.com/recipes/complexSearch"; // example endpoint

// Map emotions to experiences
const EMOTION_MAP = {
  joy: { category: "celebration", keywords: "vibrant+healthy+dishes" },
  sadness: { category: "comfort", keywords: "warm+soups+desserts" },
  anger: { category: "cooling", keywords: "soothing+mint+calm" },
  fear: { category: "grounding", keywords: "root+meals+balance" },
  calm: { category: "light", keywords: "smoothie+salad+fresh" },
  neutral: { category: "neutral", keywords: "balanced+light+protein" },
};

/**
 * Core Decision Engine
 * @param {string} emotion - detected emotion
 * @returns {object} recommendation
 */
export async function getDecision(emotion = "neutral") {
  const emotionData = EMOTION_MAP[emotion.toLowerCase()] || EMOTION_MAP["neutral"];
  
  try {
    // === 1️⃣ Fetch suggestion from Spoon ===
    const spoonRes = await fetch(
      `${SPOON_API_URL}?apiKey=${SPOON_API_KEY}&query=${emotionData.keywords}&number=3`
    );
    const spoonData = await spoonRes.json();

    // === 2️⃣ Fallback if Spoon unavailable ===
    const suggestions = spoonData?.results?.length
      ? spoonData.results.map((r) => r.title)
      : ["Guided Meditation", "Deep Breathing", "Gentle Walk"];

    // === 3️⃣ Return full package ===
    return {
      emotion,
      category: emotionData.category,
      suggestions,
      affirmation: getAffirmation(emotion),
    };
  } catch (err) {
    console.error("Decision Engine Error:", err);
    return { emotion, suggestions: ["Relax", "Reflect", "Recenter"] };
  }
}

/**
 * Helper: simple affirmations
 */
function getAffirmation(emotion) {
  const affirmations = {
    joy: "Let your light expand — joy feeds creation.",
    sadness: "Even the rain nourishes your growth.",
    anger: "Breathe, soften, and let clarity return.",
    fear: "You are safe in this moment — presence is your anchor.",
    calm: "Stillness is strength; peace creates power.",
    neutral: "Every pause carries infinite potential.",
  };
  return affirmations[emotion] || affirmations.neutral;
}
