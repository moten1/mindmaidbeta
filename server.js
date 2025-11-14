// ============================================
// 🌟 MindMaid Backend Server (Production-Ready)
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

// ============================================
// 📍 ESM Directory Fix
// ============================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// ⚙️ Environment Configuration
// ============================================
dotenv.config(); // Render handles envVars

const REQUIRED_KEYS = [
  "HUME_API_KEY",
  "SPOONACULAR_API_KEY",
  "DEEPSEEK_API_KEY",
  "OPENROUTER_API_KEY",
];

const missingKeys = REQUIRED_KEYS.filter((k) => !process.env[k]);
if (missingKeys.length) {
  console.warn(`⚠️ Missing API keys: ${missingKeys.join(", ")}`);
} else {
  console.log("✅ All API keys loaded");
}

// ============================================
// 🚀 Express App Initialization
// ============================================
const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

// ============================================
// 🌐 Middleware Stack
// ============================================
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://mindmaid.app",
  "https://www.mindmaid.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error("CORS policy violation"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));

// Security headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// ============================================
// 🩺 Health Check
// ============================================
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    memory: {
      used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
    },
    apis: Object.fromEntries(
      REQUIRED_KEYS.map((key) => [key, !!process.env[key]])
    ),
  });
});

// ============================================
// 📁 Dynamic Route Registration
// ============================================
const routes = [
  { path: "/api/auth", file: "./routes/authRoutes.js" },
  { path: "/api/user", file: "./routes/userRoutes.js" },
  { path: "/api/feedback", file: "./routes/feedbackRoutes.js" },
  { path: "/api/sessions", file: "./routes/sessionRoutes.js" },
  { path: "/api/ai", file: "./routes/aiRoutes.js" },
  { path: "/api/emotion", file: "./routes/emotionRoutes.js" },
];

const loadRoutes = async () => {
  for (const { path: routePath, file } of routes) {
    const fullPath = path.join(__dirname, file);

    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️ Route not found: ${file}`);
      continue;
    }

    try {
      const moduleURL = pathToFileURL(fullPath).href;
      const module = await import(moduleURL);
      const router = module.default || module;
      app.use(routePath, router);
      console.log(`✅ Loaded: ${routePath}`);
    } catch (err) {
      console.error(`❌ Failed to load ${file}:`, err.message);
    }
  }
};

await loadRoutes();

// ============================================
// 🌍 Frontend Static Files (Production)
// ============================================
const frontendPath = path.join(__dirname, "../frontend/build");

if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath, { maxAge: "1d" }));
  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
  console.log(`✅ Frontend served from: ${frontendPath}`);
} else {
  console.warn("⚠️ Frontend not built. Run: npm run build");
}

// ============================================
// ❌ 404 Handler
// ============================================
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.url} does not exist`,
  });
});

// ============================================
// ❌ Global Error Handler
// ============================================
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.stack || err.message);
  
  const statusCode = err.statusCode || 500;
  const response = {
    error: err.name || "ServerError",
    message: NODE_ENV === "production" 
      ? "An error occurred" 
      : err.message,
  };

  if (NODE_ENV === "development") {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
});

// ============================================
// 🧩 HTTP + WebSocket Server
// ============================================
const server = http.createServer(app);

// Initialize WebSocket emotion stream
createEmotionStreamServer(server);

// ============================================
// 🚀 Server Launch
// ============================================
server.listen(PORT, "0.0.0.0", () => {
  console.log("\n============================================");
  console.log(`🚀 MindMaid Backend Running`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`🔗 Local: http://localhost:${PORT}`);
  console.log(`📁 Frontend: ${fs.existsSync(frontendPath) ? "✅" : "❌"}`);
  console.log("============================================\n");
});

// ============================================
// 🛑 Graceful Shutdown
// ============================================
const shutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("⚠️ Forced shutdown");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  shutdown("UNCAUGHT_EXCEPTION");
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  shutdown("UNHANDLED_REJECTION");
});
