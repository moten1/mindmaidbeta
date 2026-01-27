// backend/server.js
// ============================================
// MindMaid Backend — Render Safe + Real-Time AI
// ============================================

import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";

// ✅ Use the WebSocketServer class directly
import { WebSocketServer } from "./emotionProxy.js";

dotenv.config();

const app = express();

// ------------------------
// Config
// ------------------------
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error("❌ MongoDB URI missing");
  process.exit(1);
}

// ------------------------
// Middleware
// ------------------------
app.set("trust proxy", true);
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// ------------------------
// Static Frontend (React)
// ------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.join(__dirname, "../frontend/build");

app.use(express.static(frontendPath));
app.get("*", (_, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// ------------------------
// HTTP Server (Render-compatible)
// ------------------------
const server = http.createServer(app);

// ------------------------
// WebSocket Server (AI / Biometrics)
// ------------------------
const wsServer = new WebSocketServer(server);

// ------------------------
// Health Check
// ------------------------
app.get("/health", (_, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    wsClients: wsServer.clients.size, // active WS connections
  });
});

// ------------------------
// MongoDB Connection
// ------------------------
(async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
})();

// ------------------------
// Start Server
// ------------------------
server.listen(PORT, () => {
  console.log(`🚀 MindMaid backend live on port ${PORT}`);
});

// ------------------------
// Graceful Shutdown
// ------------------------
let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`\n⚡ Shutdown initiated (${signal})`);

  try {
    wsServer.close(); // closes WS connections
    await mongoose.disconnect();

    server.close(() => {
      console.log("✅ HTTP server closed");
      process.exit(0);
    });

    // Force exit safety
    setTimeout(() => {
      console.warn("⚠️ Force exit after timeout");
      process.exit(1);
    }, 10_000);
  } catch (err) {
    console.error("❌ Shutdown error:", err);
    process.exit(1);
  }
}

// ------------------------
// Process Signals
// ------------------------
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  shutdown("uncaughtException");
});
process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Rejection:", reason);
  shutdown("unhandledRejection");
});

// ------------------------
// Optional: WS Server error logging
// ------------------------
wsServer.wss.on("error", (err) => {
  console.error("❌ WebSocket Server Error:", err);
});
