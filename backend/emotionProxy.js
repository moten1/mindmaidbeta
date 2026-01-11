// backend/emotionProxy.js
// ============================================
// 🧠 Emotion WebSocket Proxy (Render Production Ready)
// Session-aware, path-locked, observable, heartbeat-maintained
// ============================================

import { WebSocketServer } from "ws";
import crypto from "crypto";
import { analyzeEmotion } from "./emotionEngine/index.js";
import {
  recordEmotion,
  summarizeSession,
  closeSession,
} from "./emotionEngine/emotionSessionStore.js";

const EMOTION_WS_PATH = "/api/emotion/stream";
const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds

export function createEmotionStreamServer(server) {
  // WebSocket server (manual upgrade)
  const wss = new WebSocketServer({ noServer: true });
  const clients = new Set();

  /* --------------------------------------------
      Upgrade Handler: Only allow EMOTION_WS_PATH
  --------------------------------------------*/
  server.on("upgrade", (req, socket, head) => {
    try {
      const { pathname } = new URL(req.url, `http://${req.headers.host}`);
      console.log(`🔌 WS Upgrade request: ${pathname}`);

      if (pathname !== EMOTION_WS_PATH) {
        console.warn(`⚠️ Rejecting WS connection: Wrong path (${pathname})`);
        socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
        socket.destroy();
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } catch (err) {
      console.error("❌ WS Upgrade Error:", err.message);
      socket.destroy();
    }
  });

  /* --------------------------------------------
      Connection Handler
  --------------------------------------------*/
  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.isAlive = true;
    ws.sessionId = crypto.randomUUID();

    console.log(
      `✅ Emotion WS Connected | Session: ${ws.sessionId} | Clients: ${clients.size}`
    );

    // Heartbeat response
    ws.on("pong", () => {
      ws.isAlive = true;
    });

    // Handle incoming frames or messages
    ws.on("message", async (msg) => {
      try {
        const input = { frame: msg, ts: Date.now() };
        const result = await analyzeEmotion(input);

        // Save session data for analytics or history
        recordEmotion(ws.sessionId, result);

        // Respond back to client
        if (ws.readyState === 1) {
          ws.send(
            JSON.stringify({
              type: "emotion",
              sessionId: ws.sessionId,
              ...result,
              ts: Date.now(),
            })
          );
        }
      } catch (err) {
        console.error(`❌ WS Processing Error [${ws.sessionId}]:`, err.message);
      }
    });

    // Handle disconnection
    ws.on("close", (code, reason) => {
      const summary = summarizeSession(ws.sessionId);
      if (summary) {
        console.log(`🧠 Session Summary [${ws.sessionId}]:`, summary);
      }

      closeSession(ws.sessionId);
      clients.delete(ws);
      console.log(
        `❌ WS Disconnected | Session: ${ws.sessionId} | Code: ${code} | Remaining: ${clients.size}`
      );
    });

    // Handle socket errors
    ws.on("error", (err) => {
      console.warn(`⚠️ WS Error [${ws.sessionId}]:`, err.message);
      clients.delete(ws);
    });
  });

  /* --------------------------------------------
      Heartbeat (detects dead connections)
  --------------------------------------------*/
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        console.log(`💀 Terminating inactive session: ${ws.sessionId}`);
        ws.terminate();
        clients.delete(ws);
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, HEARTBEAT_INTERVAL_MS);

  // Cleanup on server close
  wss.on("close", () => clearInterval(heartbeat));

  console.log(`🧠 Emotion WebSocket proxy initialized at ${EMOTION_WS_PATH}`);
  return { wss, clients, close: () => wss.close() };
}
