// backend/server.js
// ============================================
// 🌟 MindMaid Backend Server (Production-ready)
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

// Import the WebSocket proxy (place emotionProxy.js in backend/)
import { createEmotionStreamServer } from "./emotionProxy.js";

// -----------------------------
// ESM __dirname fix
// -----------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -----------------------------
// Load env
// -----------------------------
dotenv.config(); // Load .env (Render & other platforms override)
console.log("✅ Env loaded");

// -----------------------------
// Config / Required keys
// -----------------------------
const REQUIRED_KEYS = [
  "HUME_API_KEY",
  "SPOONACULAR_API_KEY",
  "DEEPSEEK_API_KEY",
  "OPENROUTER_API_KEY",
  "FRONTEND_URL",
];

const missing = REQUIRED_KEYS.filter((k) => !process.env[k]);
if (missing.length) {
  console.warn(`⚠️ Missing env vars (not fatal): ${missing.join(", ")}`);
}

// -----------------------------
// App + server
// -----------------------------
const app = express();
const PORT = Number(process.env.PORT || 5000);
const NODE_ENV = process.env.NODE_ENV || "production";

// -----------------------------
// CORS (allow FRONTEND_URL + localhost dev)
// -----------------------------
const allowedOrigins = [
  process.env.FRONTEND_URL || undefined,
  "http://localhost:3000",
  "http://localhost:5173",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // allow non-browser (curl, Postman) calls with no origin
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);

      console.warn(`⚠️ CORS blocked origin: ${origin}`);
      return callback(new Error("CORS policy violation"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  })
);

// -----------------------------
// Middleware
// -----------------------------
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));

// Security headers (basic)
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  // note: modern browsers ignore X-XSS-Protection; kept for older browsers
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// -----------------------------
// Health check
// -----------------------------
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    uptime_seconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    port: PORT,
    frontend_url: process.env.FRONTEND_URL || null,
    apis: Object.fromEntries(REQUIRED_KEYS.map((k) => [k, !!process.env[k]])),
    memory: {
      heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    },
  });
});

// -----------------------------
// Dynamic route loader
// -----------------------------
const ROUTES = [
  { path: "/api/auth", file: "./routes/authRoutes.js" },
  { path: "/api/user", file: "./routes/userRoutes.js" },
  { path: "/api/feedback", file: "./routes/feedbackRoutes.js" },
  { path: "/api/sessions", file: "./routes/sessionRoutes.js" },
  { path: "/api/ai", file: "./routes/aiRoutes.js" },
  { path: "/api/emotion", file: "./routes/emotionRoutes.js" }, // REST emotion
];

const loadRoutes = async () => {
  for (const { path: routePath, file } of ROUTES) {
    const full = path.join(__dirname, file);
    if (!fs.existsSync(full)) {
      console.warn(`⚠️ Route file missing: ${file} (skipping)`);
      continue;
    }
    try {
      const mod = await import(pathToFileURL(full).href);
      const router = mod.default || mod;
      app.use(routePath, router);
      console.log(`✅ Route mounted: ${routePath}`);
    } catch (err) {
      console.error(`❌ Failed loading route ${file}:`, err.message || err);
    }
  }
};

await loadRoutes();

// -----------------------------
// Serve frontend build (if present)
// -----------------------------
const buildDir = path.resolve(__dirname, "../frontend/build");
const indexHtml = path.join(buildDir, "index.html");

if (fs.existsSync(buildDir)) {
  app.use(express.static(buildDir, { maxAge: "1d" }));

  // SPA fallback for non-API GET requests
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(indexHtml);
  });

  console.log(`✅ Serving frontend build from ${buildDir}`);
} else {
  console.warn("⚠️ Frontend build not found — frontend/static will not be served.");
}

// -----------------------------
// API 404 handler
// -----------------------------
app.use("/api", (req, res) =>
  res.status(404).json({ ok: false, error: "API route not found" })
);

// -----------------------------
// Global error handler
// -----------------------------
app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err.stack || err.message || err);
  const status = err.statusCode || 500;
  res.status(status).json({
    ok: false,
    error: NODE_ENV === "production" ? "Internal server error" : err.message,
    ...(NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
});

// -----------------------------
// HTTP + WebSocket server setup
// -----------------------------
const server = http.createServer(app);

// Attach WebSocket proxy BEFORE listening (listens on 'upgrade' events)
try {
  createEmotionStreamServer(server);
  console.log("🧩 Emotion websocket proxy bound to server (upgrade listener installed)");
} catch (e) {
  console.error("❌ Failed to initialize emotion stream proxy:", e);
}

// -----------------------------
// Start server
// -----------------------------
server.listen(PORT, "0.0.0.0", () => {
  console.log("============================================");
  console.log(`🚀 MindMaid Backend Running`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`🎨 Frontend build present: ${fs.existsSync(buildDir) ? "yes" : "no"}`);
  console.log(`🔗 Expected FRONTEND_URL: ${process.env.FRONTEND_URL || "not set"}`);
  console.log("============================================");
});

// -----------------------------
// Graceful shutdown
// -----------------------------
const shutdown = (signal) => {
  console.log(`\n${signal} received — shutting down...`);
  server.close(() => {
    console.log("✅ HTTP server closed");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("⚠️ Forced exit");
    process.exit(1);
  }, 10000);
};

["SIGTERM", "SIGINT"].forEach((s) => process.on(s, () => shutdown(s)));

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, p) => {
  console.error("❌ Unhandled Rejection:", p, reason);
  shutdown("unhandledRejection");
});
 