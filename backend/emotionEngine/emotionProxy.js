// backend/emotionProxy.js
// ============================================
// 🧠 Emotion WebSocket Proxy (Phase 0.7 FINAL)
// Session-based emotion intelligence (in-memory)
// Path-locked, Render-safe, observable
// ============================================

import WebSocket from "ws";
import crypto from "crypto";
import { analyzeEmotion } from "./emotionEngine/index.js";

const EMOTION_WS_PATH = "/api/emotion/stream";

export function createEmotionStreamServer(server) {
  const wss = new WebSocket.Server({ noServer: true });
  const clients = new Set();

  /* --------------------------------------------
     Upgrade Handler (PATH-LOCKED)
  --------------------------------------------*/
  server.on("upgrade", (req, socket, head) => {
    try {
      if (req.headers.upgrade?.toLowerCase() !== "websocket") {
        socket.destroy();
        return;
      }

      // 🔐 Lock WebSocket strictly to emotion stream
      if (req.url !== EMOTION_WS_PATH) {
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

  /* --------------------------------------------
     WebSocket Connection
  --------------------------------------------*/
  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.isAlive = true;

    // 🧠 Create emotion session
    const sessionId = crypto.randomUUID();
    ws.session = {
      id: sessionId,
      startedAt: Date.now(),
      emotions: [],
    };

    console.log("🧠 Emotion session started:", sessionId);
    console.log("🔌 Emotion WS connected | clients:", clients.size);

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", async (msg) => {
      try {
        // Accept raw binary (future camera frames) or control JSON
        const input =
          msg instanceof Buffer
            ? { frame: msg, ts: Date.now() }
            : {};

        // 🚀 Emotion engine
        const result = await analyzeEmotion(input);

        // 📥 Store rolling session memory
        ws.session.emotions.push({
          emotion: result.emotion,
          confidence: result.confidence ?? 1,
          ts: Date.now(),
        });

        // Limit memory footprint
        if (ws.session.emotions.length > 300) {
          ws.session.emotions.shift();
        }

        // 📤 Emit to client
        ws.send(
          JSON.stringify({
            type: "emotion",
            sessionId: ws.session.id,
            ...result,
            ts: Date.now(),
          })
        );
      } catch (e) {
        console.error("❌ WS message error:", e.message);
      }
    });

    ws.on("close", () => {
      clients.delete(ws);

      if (ws.session) {
        const summary = summarizeSession(ws.session.emotions);

        console.log("📊 Emotion Session Summary", {
          sessionId: ws.session.id,
          durationSec: Math.floor(
            (Date.now() - ws.session.startedAt) / 1000
          ),
          ...summary,
        });
      }

      console.log("❌ Emotion WS disconnected | clients:", clients.size);
    });

    ws.on("error", (err) => {
      clients.delete(ws);
      console.warn("⚠️ Emotion WS error:", err.message);
    });
  });

  /* --------------------------------------------
     Heartbeat (Liveness)
  --------------------------------------------*/
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
  }, 30000);

  console.log("🧠 Emotion WebSocket proxy initialized @", EMOTION_WS_PATH);

  /* --------------------------------------------
     Return reference (observability & cleanup)
  --------------------------------------------*/
  return {
    wss,
    clients,
    close: () => {
      clearInterval(heartbeat);
      wss.close();
    },
  };
}

/* --------------------------------------------
   Session Summary Helper (Phase 0.7)
--------------------------------------------*/
function summarizeSession(events) {
  const counts = {};

  for (const e of events) {
    counts[e.emotion] = (counts[e.emotion] || 0) + 1;
  }

  const dominantEmotion =
    Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    "neutral";

  return {
    dominantEmotion,
    totalEvents: events.length,
  };
}
