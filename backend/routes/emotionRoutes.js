import express from "express";

const router = express.Router();

/**
 * POST /api/emotion/analyze
 * Receives base64 image frame
 * Returns emotion inference (mock for now)
 */
router.post("/analyze", async (req, res) => {
  const started = Date.now();

  try {
    const { image } = req.body;

    if (!image || typeof image !== "string") {
      return res.status(400).json({
        ok: false,
        error: "Invalid or missing image payload"
      });
    }

    // Strip base64 header if present
    const base64Data = image.includes(",")
      ? image.split(",")[1]
      : image;

    if (!base64Data || base64Data.length < 100) {
      return res.status(400).json({
        ok: false,
        error: "Corrupt image data"
      });
    }

    // 🔮 MOCK EMOTION (safe placeholder)
    const emotion = "calm";

    res.json({
      ok: true,
      emotion,
      confidence: 0.82,
      ts: Date.now(),
      latencyMs: Date.now() - started
    });

  } catch (err) {
    console.error("❌ Emotion analyze error:", err.message);

    res.status(500).json({
      ok: false,
      error: "Emotion analysis failed"
    });
  }
});

export default router;
