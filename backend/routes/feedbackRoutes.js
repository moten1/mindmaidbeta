// ============================================
// 💌 MindMaid Feedback Route (ESM version)
// ============================================
import express from "express";

const router = express.Router();

router.post("/", (req, res) => {
  const { message } = req.body;
  console.log("Feedback received:", message);
  res.json({
    success: true,
    message: "Thank you for your feedback 💌",
  });
});

export default router;
