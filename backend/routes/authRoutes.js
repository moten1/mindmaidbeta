// ============================================
// 🧠 MindMaid Auth Routes (ESM)
// ============================================
import express from "express";
const router = express.Router();

// 🔐 Login
router.post("/login", (req, res) => {
  const { email } = req.body;
  res.json({
    message: `Welcome back, ${email}!`,
    token: "mock-token"
  });
});

// 🪄 Register
router.post("/register", (req, res) => {
  const { email } = req.body;
  res.json({
    message: `Account created for ${email}!`
  });
});

export default router;
