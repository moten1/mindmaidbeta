// ============================================
// 💫 MindMaid Emotion Detection & Stream Token Routes
// 🔒 Secure, Cached, and Optimized for Hume AI
// ============================================

import express from "express";
import axios from "axios";

const router = express.Router();

// ============================================
// ⚙️ Validate Environment
// ============================================
const { HUME_API_KEY, NODE_ENV } = process.env;
if (!HUME_API_KEY) {
  console.warn("⚠️ Missing HUME_API_KEY — Emotion detection & streaming may fail.");
}

// ============================================
// 🧠 POST /api/emotion/detect
// Detects emotions from text, imageBase64, or audioBase64
// Dynamically selects models to minimize API cost
// ============================================
router.post("/detect", async (req, res) => {
  try {
    const { text, imageBase64, audioBase64 } = req.body || {};

    if (!text && !imageBase64 && !audioBase64) {
      return res.status(400).json({
        success: false,
        error: "Please provide text, imageBase64, or audioBase64 for analysis.",
      });
    }

    // Dynamically load only the required models
    const models = {};
    if (text) models.language = {};
    if (imageBase64) models.face = {};
    if (audioBase64) models.prosody = {};

    const payload = {
      models,
      data: [{ value: text || imageBase64 || audioBase64 }],
    };

    // 🚀 Send to Hume Batch API
    const { data: result } = await axios.post(
      "https://api.hume.ai/v0/batch/jobs",
      payload,
      {
        headers: {
          "X-Hume-Api-Key": HUME_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    const predictions = result?.predictions?.[0]?.models || {};

    // 🧠 Combine emotions from available models
    const emotions = [
      ...(predictions.language?.emotions || []),
      ...(predictions.face?.emotions || []),
      ...(predictions.prosody?.emotions || []),
    ];

    // 🎯 Determine dominant emotion
    let topEmotion = "neutral";
    let confidence = 0.5;
    if (emotions.length > 0) {
      const sorted = emotions.sort((a, b) => b.score - a.score);
      topEmotion = sorted[0]?.name || "neutral";
      confidence = sorted[0]?.score || 0.5;
    }

    return res.json({
      success: true,
      mood: topEmotion,
      confidence,
      models: Object.keys(models),
      raw: NODE_ENV === "development" ? result : undefined,
    });
  } catch (error) {
    console.error("❌ Emotion detection error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: "Emotion detection failed. Please try again later.",
      details: NODE_ENV === "development" ? error.response?.data || {} : undefined,
    });
  }
});

// ============================================
// 🔐 GET /api/emotion/token
// Secure short-lived WebSocket token generator
// Uses caching for efficiency (50s)
// ============================================
let cachedToken = null;
let tokenExpiry = 0;

router.get("/token", async (req, res) => {
  try {
    const now = Date.now();

    // Reuse cached token if valid
    if (cachedToken && now < tokenExpiry) {
      return res.json({ success: true, token: cachedToken, cached: true });
    }

    // Request a new token from Hume
    const { data } = await axios.post(
      "https://api.hume.ai/v0/stream/token",
      {},
      {
        headers: {
          "X-Hume-Api-Key": HUME_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    const token = data?.token;
    if (!token) throw new Error("Hume API did not return a token.");

    // Cache token for ~50 seconds
    cachedToken = token;
    tokenExpiry = now + 50 * 1000;

    return res.json({ success: true, token, cached: false });
  } catch (error) {
    console.error("❌ Token generation error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to generate Hume streaming token.",
      details: NODE_ENV === "development" ? error.response?.data || {} : undefined,
    });
  }
});

// ============================================
// 🌐 GET /api/emotion/proxy
// Returns a ready-to-use WebSocket URL for Hume Streaming
// Allows frontend to connect securely through your backend
// ============================================
router.get("/proxy", async (req, res) => {
  try {
    const { data } = await axios.post(
      "https://api.hume.ai/v0/stream/token",
      {},
      {
        headers: {
          "X-Hume-Api-Key": HUME_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    const token = data?.token;
    if (!token) throw new Error("Failed to retrieve proxy token.");

    return res.json({
      success: true,
      wsUrl: `wss://api.hume.ai/v0/stream/models?auth=${token}`,
    });
  } catch (error) {
    console.error("❌ Proxy setup error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to proxy Hume WebSocket stream.",
      details: NODE_ENV === "development" ? error.response?.data || {} : undefined,
    });
  }
});

export default router;
