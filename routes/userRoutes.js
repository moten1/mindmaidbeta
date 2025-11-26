// ============================================
// 👤 MindMaid Profile Routes (ESM version)
// ============================================
import express from "express";

const router = express.Router();

router.get("/profile", (req, res) => {
  res.json({
    name: "Demo User",
    mood: "Relaxed 😌",
    preferences: {
      color: "Blue",
      style: "Casual",
    },
  });
});

export default router;
