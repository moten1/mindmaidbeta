// ============================================
// 🌟 MindMaid Backend Server (Production Ready)
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
import { createEmotionStreamServer } from "./routes/emotionStream.js";

// ESM path helpers
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Env - Simplified for platform compatibility
dotenv.config(); 
console.log("✅ Environment variables loaded (via default .env or platform variables).");

const REQUIRED_KEYS = [
  "HUME_API_KEY",
  "SPOONACULAR_API_KEY",
  "DEEPSEEK_API_KEY",
  "OPENROUTER_API_KEY",
  "FRONTEND_URL", // <-- ADDED: Crucial for CORS configuration
];

const missing = REQUIRED_KEYS.filter(k => !process.env[k]);
if (missing.length) console.warn(`⚠️ Missing API keys: ${missing.join(", ")}`);

// App
const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "production";

// Middleware - CORS (FIXED & improved for flexibility)
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL, // Use ENV variable for production URL
  // You can keep other specific origins here if needed, or remove them
].filter(Boolean); // Filters out undefined/null values

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (like mobile apps or server-to-server)
      if (!origin) return cb(null, true); 
      
      // Check if the requesting origin is in the allowed list
      if (allowedOrigins.includes(origin)) return cb(null, true);
      
      console.log(`⚠️ CORS rejected: ${origin}`);
      cb(new Error("CORS policy violation"));
    },
    credentials: true,
  })
);

app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));

// security headers
app.use((req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Frame-Options", "DENY");
  res.set("X-XSS-Protection", "1; mode=block");
  next();
});

// Health
app.get("/api/health", (req, res) =>
  res.json({
    status: "healthy",
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    // Include FRONTEND_URL in health check output for verification
    apis: Object.fromEntries(REQUIRED_KEYS.map(k => [k, !!process.env[k]])), 
  })
);

// Dynamic route loader
const ROUTES = [
  { path: "/api/auth", file: "./routes/authRoutes.js" },
  { path: "/api/user", file: "./routes/userRoutes.js" },
  { path: "/api/feedback", file: "./routes/feedbackRoutes.js" },
  { path: "/api/sessions", file: "./routes/sessionRoutes.js" },
  { path: "/api/ai", file: "./routes/aiRoutes.js" },
  { path: "/api/emotion", file: "./routes/emotionRoutes.js" }, // Emotion REST endpoints
  // Add other routes here as needed (e.g., wardrobe, food, spotify)
];

const loadRoutes = async () => {
  for (const { path: routePath, file } of ROUTES) {
    const fullPath = path.join(__dirname, file);
    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️ Route not found: ${file}`);
      continue;
    }
    try {
      const module = await import(pathToFileURL(fullPath).href);
      const router = module.default || module;
      app.use(routePath, router);
      console.log(`✅ Loaded: ${routePath}`);
    } catch (err) {
      console.error(`❌ Failed to load ${file}:`, err.message);
    }
  }
};
await loadRoutes();

// Serve frontend build if present
const buildDir = path.resolve(__dirname, "../frontend/build");
const indexFile = path.join(buildDir, "index.html");

if (fs.existsSync(buildDir)) {
  app.use(express.static(buildDir, { maxAge: "1d" }));
  // SPA fallback for non-API routes
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(indexFile);
  });
  console.log(`✅ Frontend build served from: ${buildDir}`);
} else {
  console.warn("⚠️ Frontend build not found. Ensure frontend is built during deployment.");
}

// API 404
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not Found", message: `API ${req.method} ${req.url} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.stack || err.message || err);
  const status = err.statusCode || 500;
  res.status(status).json({
    error: err.name || "ServerError",
    message: NODE_ENV === "production" ? "An error occurred" : err.message,
    ...(NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
});

// HTTP + WebSocket
const server = http.createServer(app);
// CRITICAL: The Hume WebSocket handler. Listens for 'upgrade' events on the HTTP server.
createEmotionStreamServer(server); 

// Start
server.listen(PORT, "0.0.0.0", () => {
  console.log("============================================");
  console.log(`🚀 MindMaid Backend Running`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`🎨 Frontend build present: ${fs.existsSync(buildDir) ? "yes" : "no"}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || "Not Set"}`); // <-- Added for easy verification
  console.log("============================================\n");
});

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`\n${signal} received — shutting down gracefully...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000);
};
["SIGTERM", "SIGINT"].forEach(s => process.on(s, () => shutdown(s)));
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  shutdown("UNCAUGHT_EXCEPTION");
});
process.on("unhandledRejection", (reason, p) => {
  console.error("❌ Unhandled Rejection at:", p, "reason:", reason);
  shutdown("UNHANDLED_REJECTION");
});