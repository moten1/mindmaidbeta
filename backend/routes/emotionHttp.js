import express from "express";
import { analyzeEmotion } from "../emotionEngine/index.js";
import {
  recordEmotion,
  summarizeSession,
  closeSession
} from "../emotionEngine/emotionSessionStore.js";
import crypto from "crypto";

const router = express.Router();

// Simple session map (HTTP-safe)
const sessions = new Map();

router.post("/analyze", async (req, res) => {
  try {
    const { image, sessionId } = req.body;

    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    const sid = sessionId || crypto.randomUUID();

    // Decode base64 JPEG
    const buffer = Buffer.from(
      image.replace(/^data:image\/\w+;base64,/, ""),
      "base64"
    );

    const result = await analyzeEmotion({
      frame: buffer,
      ts: Date.now()
    });

    recordEmotion(sid, result);

    res.json({
      sessionId: sid,
      ...result,
      ts: Date.now()
    });
  } catch (err) {
    console.error("❌ HTTP Emotion Error:", err);
    res.status(500).json({ error: "Emotion analysis failed" });
  }
});

router.post("/close", (req, res) => {
  const { sessionId } = req.body;
  const summary = summarizeSession(sessionId);
  closeSession(sessionId);
  res.json({ summary });
});

export default router;
