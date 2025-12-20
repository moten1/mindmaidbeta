// backend/controllers/emotionController.js
import fs from "fs";
import path from "path";

// In-memory storage for demo purposes
const recentEmotions = [];

// Feature toggles & defaults
const config = {
  fps: Number(process.env.REACT_APP_DEFAULT_FPS) || 4,
  enableWardrobe: process.env.REACT_APP_ENABLE_WARDROBE === "true",
  enableFood: process.env.REACT_APP_ENABLE_FOOD === "true",
  enableRelaxation: process.env.REACT_APP_ENABLE_RELAXATION === "true",
  maxHistory: 10,
};

// Utility: generate random emotion & recommendations (replace with AI later)
const analyzeFrame = async (base64Frame) => {
  const emotions = ["happy", "sad", "angry", "neutral", "surprised"];
  const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];

  const recommendations = {
    outfit: "Casual T-shirt",
    food: "Pasta",
    music: "Lo-fi Beats",
    delivery: ["Nearby Pizza Place", "Local Sushi Bar"],
  };

  const timestamp = new Date().toISOString();
  const record = { emotion: randomEmotion, recommendations, timestamp };

  // Store in memory
  recentEmotions.unshift(record);
  if (recentEmotions.length > config.maxHistory) recentEmotions.pop();

  return record;
};

// -----------------------------
// Controller Functions
// -----------------------------
export const getConfig = (req, res) => {
  res.json(config);
};

export const postAnalyze = async (req, res) => {
  try {
    const { data: base64Frame } = req.body;
    if (!base64Frame) return res.status(400).json({ error: "Frame data required" });

    const result = await analyzeFrame(base64Frame);
    res.json(result);
  } catch (err) {
    console.error("❌ Emotion analyze error:", err);
    res.status(500).json({ error: "Failed to analyze frame" });
  }
};

export const getRecent = (req, res) => {
  res.json(recentEmotions);
};
