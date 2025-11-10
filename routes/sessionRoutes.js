// ============================================
// 🧘 MindMaid Session Route (ESM version)
// ============================================
import express from "express";

const router = express.Router();

// 🟢 Start a new session
router.post("/start", (req, res) => {
  const { mood } = req.body;
  const sessionId = Date.now();
  res.json({
    sessionId,
    mood,
    startedAt: new Date(),
    status: "active",
  });
});

// 🔴 End an existing session
router.post("/end", (req, res) => {
  const { sessionId } = req.body;
  res.json({
    sessionId,
    endedAt: new Date(),
    message: "Session ended ✅",
  });
});

export default router;
