// backend/server.js
// ============================================
// 🌟 MindMaid Backend Server (Stable Production Build)
// Phase 0.2 — Health + WS Observability (SAFE)
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

import { createEmotionStreamServer } from "./emotionProxy.js";

// -----------------------------
// Paths
// -----------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -----------------------------
// Load env
// -----------------------------
dotenv.config();
console.log("🌱 Environment loaded");

// -----------------------------
// Express App
// -----------------------------
const app = express();
const PORT = Number(process.env.PORT || 5000);
const NODE_ENV = process.env.NODE_ENV || "production";

// -----------------------------
// CORS (Render Safe)
// -----------------------------
app.use(
  cors({
    origin: "*",
    credentials: false,
  })
);

// -----------------------------
// Middleware
// -----------------------------
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));

app.use((req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});

// -----------------------------
// Health Route (Extended)
// -----------------------------
app.get("/api/health", (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    ok: true,
    uptime: Math.floor(process.uptime()),
    env: NODE_ENV,
    port: PORT,
    memory: {
      rss: Math.round(mem.rss / 1024 / 1024) + " MB",
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + " MB",
    },
    timestamp: new Date().toISOString(),
  });
});

// -----------------------------
// Route Loader
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
    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️ Missing route: ${r.f}`);
      continue;
    }
    try {
      const mod = await import(pathToFileURL(fullPath).href);
      app.use(r.p, mod.default || mod);
      console.log(`📌 Loaded route: ${r.p}`);
    } catch (err) {
      console.error(`❌ Failed route load: ${r.f}`, err);
    }
  }
};

await loadRoutes();

// -----------------------------
// HTTP Server (BEFORE WS)
// -----------------------------
const server = http.createServer(app);

// -----------------------------
// WS Proxy Init
// -----------------------------
let wsServerRef = null;

try {
  wsServerRef = createEmotionStreamServer(server);
  console.log("🔌 Emotion WebSocket Proxy Ready");
} catch (e) {
  console.error("❌ WS Proxy Error:", e);
}

// -----------------------------
// WS HEARTBEAT (Phase 0.2)
// -----------------------------
setInterval(() => {
  try {
    const clients =
      wsServerRef?.wss?.clients?.size ?? "unknown";

    console.log(
      JSON.stringify({
        level: "info",
        event: "ws_heartbeat",
        clients,
        uptime: Math.floor(process.uptime()),
        memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
        ts: new Date().toISOString(),
      })
    );
  } catch (e) {
    console.warn("⚠️ WS heartbeat error:", e.message);
  }
}, 30000);

// -----------------------------
// Serve Frontend Build (if exists)
// -----------------------------
const buildPath = path.resolve(__dirname, "../frontend/build");
const indexPath = path.join(buildPath, "index.html");

if (fs.existsSync(buildPath)) {
  console.log("🎨 Serving frontend build...");
  app.use(express.static(buildPath));

  app.get("*", (req, res) => {
    if (req.url.startsWith("/api")) {
      return res.status(404).json({ error: "Not found" });
    }
    return res.sendFile(indexPath);
  });
} else {
  console.warn("⚠️ No frontend build found.");
}

// -----------------------------
// Start Server
// -----------------------------
server.listen(PORT, "0.0.0.0", () => {
  console.log("============================================");
  console.log("🚀 MindMaid Backend Online");
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌍 Env: ${NODE_ENV}`);
  console.log(`🖥 Serving Frontend: ${fs.existsSync(buildPath) ? "YES" : "NO"}`);
  console.log("============================================");
});

// -----------------------------
// Graceful Shutdown
// -----------------------------
const shutdown = (signal) => {
  console.log(`\n${signal} received — closing server...`);
  server.close(() => {
    console.log("⚡ Server closed gracefully");
    process.exit(0);
  });
  setTimeout(() => {
    console.warn("⏱ Forced shutdown");
    process.exit(1);
  }, 8000);
};

["SIGTERM", "SIGINT"].forEach((sig) =>
  process.on(sig, () => shutdown(sig))
);

process.on("unhandledRejection", (r) => {
  console.error("❌ Unhandled Rejection:", r);
});
process.on("uncaughtException", (e) => {
  console.error("❌ Uncaught Exception:", e);
});
