// backend/emotionProxy.js
// ============================================
// 🧠 Emotion + Biometric WebSocket Proxy
// Phase 1.1 — Render-safe, browser-safe
// ============================================

import { WebSocketServer } from "ws";
import crypto from "crypto";
import { generateBiometrics } from "./emotionEngine/mockBiometrics.js";

/* --------------------------------------------
   Constants
-------------------------------------------- */
const EMOTION_WS_PATH = "/api/emotion/stream";
const HEARTBEAT_INTERVAL_MS = 30000;
const MAX_SESSION_EVENTS = 300;

/* --------------------------------------------
   Mock Emotion Engine (AI-ready stub)
-------------------------------------------- */
async function analyzeEmotion() {
  const EMOTIONS = ["happy", "sad", "angry", "surprised", "neutral"];
  return {
    emotion: EMOTIONS[Math.floor(Math.random() * EMOTIONS.length)],
    confidence: Math.random() * 0.5 + 0.5,
  };
}

/* --------------------------------------------
   Safe Wrapper
-------------------------------------------- */
async function safeAnalyzeEmotion() {
  try {
    return await analyzeEmotion();
  } catch (err) {
    console.error("❌ Emotion engine error:", err.message);
    return { emotion: "neutral", confidence: 0 };
  }
}

/* --------------------------------------------
   Session Summary
-------------------------------------------- */
function summarizeSession(events) {
  const counts = {};
  for (const e of events) {
    counts[e.emotion] = (counts[e.emotion] || 0) + 1;
  }

  return {
    dominantEmotion:
      Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "neutral",
    totalEvents: events.length,
  };
}

/* --------------------------------------------
   WebSocket Server
-------------------------------------------- */
export function createEmotionStreamServer(server) {
  const wss = new WebSocketServer({ noServer: true });
  const clients = new Set();

  /* ---------- Upgrade Handler (Render-safe) ---------- */
  server.on("upgrade", (req, socket, head) => {
    try {
      const { pathname } = new URL(req.url, `http://${req.headers.host}`);

      if (!pathname.startsWith(EMOTION_WS_PATH)) {
        socket.destroy();
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } catch {
      socket.destroy();
    }
  });

  /* ---------- Connection ---------- */
  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.isAlive = true;

    ws.session = {
      id: crypto.randomUUID(),
      startedAt: Date.now(),
      events: [],
    };

    console.log("🧠 WS CONNECTED | Session:", ws.session.id);

    ws.on("pong", () => (ws.isAlive = true));

    ws.on("message", async () => {
      try {
        const emotion = await safeAnalyzeEmotion();
        const biometrics = generateBiometrics();

        const payload = {
          type: "emotion_biometrics",
          sessionId: ws.session.id,
          ...emotion,
          biometrics,
          ts: Date.now(),
        };

        ws.session.events.push(payload);
        if (ws.session.events.length > MAX_SESSION_EVENTS) {
          ws.session.events.shift();
        }

        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify(payload));
        }
      } catch (err) {
        console.error("❌ WS message error:", err.message);
      }
    });

    ws.on("close", () => {
      clients.delete(ws);

      const summary = summarizeSession(ws.session.events);
      console.log("📊 Session Summary:", {
        sessionId: ws.session.id,
        durationSec: Math.floor((Date.now() - ws.session.startedAt) / 1000),
        ...summary,
      });
    });

    ws.on("error", (err) => {
      clients.delete(ws);
      console.warn("⚠️ WS error:", err.message);
    });
  });

  /* ---------- Heartbeat ---------- */
  const heartbeat = setInterval(() => {
    for (const ws of clients) {
      if (!ws.isAlive) {
        ws.terminate();
        clients.delete(ws);
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, HEARTBEAT_INTERVAL_MS);

  return {
    wss,
    close: () => {
      clearInterval(heartbeat);
      wss.close();
    },
  };
}
