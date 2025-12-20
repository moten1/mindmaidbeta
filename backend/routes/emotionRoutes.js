// backend/routes/emotionRoutes.js
import express from "express";
import {
  getConfig,
  getRecent,
  postAnalyze,
  postFeedback,
} from "../controllers/emotionController.js";

const router = express.Router();

/* =================================================
   Emotion Routes
   Production-safe, HTTP-only
   Provides status, recent emotion records, config, analysis, and feedback
================================================= */

// -----------------------------
// GET /api/emotion/status
// Returns simple service health/status
// -----------------------------
router.get("/status", (req, res) => {
  res.json({
    ok: true,
    service: "emotion",
    transport: "http-only",
    timestamp: new Date().toISOString(),
  });
});

// -----------------------------
// GET /api/emotion/config
// -----------------------------
router.get("/config", getConfig);

// -----------------------------
// GET /api/emotion/recent
// -----------------------------
router.get("/recent", getRecent);

// -----------------------------
// POST /api/emotion/analyze
// Accepts Base64 frame for analysis
// -----------------------------
router.post("/analyze", express.json({ limit: "10mb" }), postAnalyze);

// -----------------------------
// POST /api/emotion/feedback
// Accepts user feedback on emotion detection
// -----------------------------
router.post("/feedback", express.json({ limit: "5kb" }), postFeedback);

export default router;
