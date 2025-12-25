// backend/emotionProxy.js
// ============================================
// 🧠 Emotion WebSocket Proxy (Phase 0.7)
// Session-aware, path-locked, observable
// ============================================

import WebSocket from "ws";
import crypto from "crypto";
import { analyzeEmotion } from "./emotionEngine/index.js";
import {
  recordEmotion,
  summarizeSession,
  closeSession,
} from "./emotionEngine/emotionSessionStore.js";

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
    ws.sessionId = crypto.randomUUID();

    console.log(
      "🔌 Emotion WS connected",
      "| session:",
      ws.sessionId,
      "| clients:",
      clients.size
    );

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", async (msg) => {
      try {
        const input =
          msg instanceof Buffer
            ? { frame: msg, ts: Date.now() }
            : {};

        const result = await analyzeEmotion(input);

        // 🧠 Record emotion into session memory
        recordEmotion(ws.sessionId, result);

        ws.send(
          JSON.stringify({
            type: "emotion",
            sessionId: ws.sessionId,
            ...result,
            ts: Date.now(),
          })
        );
      } catch (e) {
        console.error("❌ WS message error:", e.message);
      }
    });

    ws.on("close", () => {
      const summary = summarizeSession(ws.sessionId);

      if (summary) {
        console.log("🧠 Emotion session summary:", summary);
      }

      closeSession(ws.sessionId);
      clients.delete(ws);

      console.log(
        "❌ Emotion WS disconnected",
        "| session:",
        ws.sessionId,
        "| clients:",
        clients.size
      );
    });

    ws.on("error", (err) => {
      closeSession(ws.sessionId);
      clients.delete(ws);
      console.warn("⚠️ Emotion WS error:", err.message);
    });
  });

  /* --------------------------------------------
     Heartbeat (Stability)
  --------------------------------------------*/
  const heartbeat = setInterval(() => {
    for (const ws of clients) {
      if (!ws.isAlive) {
        closeSession(ws.sessionId);
        ws.terminate();
        clients.delete(ws);
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, 30000);

  console.log(
    "🧠 Emotion WebSocket proxy initialized @",
    EMOTION_WS_PATH
  );

  return {
    wss,
    clients,
    close: () => {
      clearInterval(heartbeat);
      wss.close();
    },
  };
}
