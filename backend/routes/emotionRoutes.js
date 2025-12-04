// backend/routes/emotionRoutes.js
// ========================================
// 🔥 FINAL FIXED VERSION — WORKS WITH CAMERA
// ========================================

import express from "express";
import multer from "multer";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// Multer memory storage (no disk writing)
const upload = multer({ storage: multer.memoryStorage() });

// ------------------------------------
// POST /api/emotion/analyze
// ------------------------------------
router.post("/analyze", upload.single("frame"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No frame received" });
    }

    // Convert buffer -> base64
    const base64Image = req.file.buffer.toString("base64");

    // 🔥 Send to your AI model (OpenAI or Google)
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "input_image", image_url: `data:image/jpeg;base64,${base64Image}` },
              { type: "text", text: "Analyze the facial emotion. Reply with: happy/sad/stress/neutral/angry only." }
            ]
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    const emotion = response.data.choices?.[0]?.message?.content || "unknown";

    res.json({
      success: true,
      emotion
    });
  } catch (err) {
    console.error("❌ Emotion analysis error:", err?.response?.data || err);
    res.status(500).json({ error: "Emotion detection failed" });
  }
});

export default router;
