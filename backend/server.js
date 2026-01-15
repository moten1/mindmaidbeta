// backend/server.js
// ============================================
// MindMaid Backend — Render Pre-Flight Ready
// ============================================

import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { createEmotionStreamServer } from "./emotionProxy.js";

dotenv.config();

const app = express();

// ------------------------
// Config
// ------------------------
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error(
    "❌ MongoDB URI not defined. Set MONGO_URI or MONGODB_URI in your environment variables."
  );
  process.exit(1);
}

// ------------------------
// Middleware
// ------------------------
app.use(cors()); // For pre-flight testing we allow all origins
app.use(express.json());
app.set("trust proxy", true);

// ------------------------
// Health Check Route
// ------------------------
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", time: new Date().toISOString() });
});

// ------------------------
// MongoDB Connection
// ------------------------
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// ------------------------
// Serve React Frontend
// ------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "../frontend/build")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/build", "index.html"));
});

// ------------------------
// HTTP Server (Render only)
// ------------------------
const server = http.createServer(app);

// ------------------------
// WebSocket Server (Emotion + Biometrics)
// ------------------------
const { wss: emotionWSS, clients: wsClients, close: closeEmotionWS } =
  createEmotionStreamServer(server);

// ------------------------
// Start Server
// ------------------------
server.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});

// ------------------------
// Graceful Shutdown
// ------------------------
async function shutdown() {
  console.log("\n⚡ Shutting down MindMaid backend...");
  try {
    closeEmotionWS?.();
    await mongoose.disconnect();
    server.close(() => {
      console.log("✅ Shutdown complete");
      process.exit(0);
    });
  } catch (err) {
    console.error("❌ Error during shutdown:", err);
    process.exit(1);
  }
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  shutdown();
});
process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Rejection:", reason);
  shutdown();
});
