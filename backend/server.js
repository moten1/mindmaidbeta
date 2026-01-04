// backend/server.js
// ============================================
// 🌟 MindMaid Backend Server (Production Optimized)
// ============================================

import express from "express";
import cors from "cors";
import morgan from "morgan";
import compression from "compression";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import http from "http";
import { fileURLToPath, pathToFileURL } from "url";

// ⚠️ Kept for future use — NOT ACTIVE
import { createEmotionStreamServer } from "./emotionProxy.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5000);
const NODE_ENV = process.env.NODE_ENV || "production";

// -----------------------------
// 1. GLOBAL MIDDLEWARE
// -----------------------------
app.use(cors({ origin: "*", credentials: false }));
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));

// -----------------------------
// 2. HEALTH CHECK
// -----------------------------
app.get("/api/health", (req, res) => {
  res.status(200).json({
    ok: true,
    status: "online",
    serverTime: new Date().toISOString()
  });
});

// -----------------------------
// 3. API ROUTES
// -----------------------------
const ROUTES = [
  { p: "/api/auth", f: "./routes/authRoutes.js" },
  { p: "/api/user", f: "./routes/userRoutes.js" },
  { p: "/api/feedback", f: "./routes/feedbackRoutes.js" },
  { p: "/api/sessions", f: "./routes/sessionRoutes.js" },
  { p: "/api/ai", f: "./routes/aiRoutes.js" },
  { p: "/api/emotion", f: "./routes/emotionRoutes.js" },
];

const loadRoutes = async () => {
  for (const r of ROUTES) {
    const fullPath = path.join(__dirname, r.f);
    if (fs.existsSync(fullPath)) {
      try {
        const mod = await import(pathToFileURL(fullPath).href);
        app.use(r.p, mod.default || mod);
        console.log(`📌 Route Active: ${r.p}`);
      } catch (err) {
        console.error(`❌ Route Failed: ${r.p}`, err.message);
      }
    }
  }
};

await loadRoutes();

// -----------------------------
// 4. STATIC FRONTEND
// -----------------------------
const buildPath = path.resolve(__dirname, "../frontend/build");

if (fs.existsSync(buildPath)) {
  console.log("🎨 Frontend build detected. Serving static files...");
  app.use(express.static(buildPath));

  app.get("*", (req, res) => {
    if (req.url.startsWith("/api")) {
      return res.status(404).json({ error: "API Endpoint Not Found" });
    }
    res.sendFile(path.join(buildPath, "index.html"));
  });
} else {
  console.warn("⚠️ No frontend build found at:", buildPath);
}

// -----------------------------
// 5. SERVER INITIALIZATION (HTTP ONLY)
// -----------------------------
const server = http.createServer(app);

/**
 * 🚫 WebSockets intentionally disabled
 * ℹ️ Using HTTP frames + polling (Render safe)
 */
// createEmotionStreamServer(server); ❌ DO NOT ENABLE ON RENDER

console.log("ℹ️ Emotion Streaming Mode: HTTP + Polling");

server.listen(PORT, "0.0.0.0", () => {
  console.log("============================================");
  console.log(`🚀 SERVER RUNNING ON PORT: ${PORT}`);
  console.log(`🌍 MODE: ${NODE_ENV}`);
  console.log("============================================");
});

// Graceful Shutdown
process.on("SIGTERM", () => server.close());
process.on("SIGINT", () => server.close());
