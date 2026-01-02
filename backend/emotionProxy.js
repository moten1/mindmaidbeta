// backend/emotionProxy.js
// ============================================
// 🧠 Emotion WebSocket Proxy (Hardenend for Render)
// Session-aware, path-locked, observable
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

export function createEmotionStreamServer(server) {
  // We use noServer: true because we handle the upgrade manually
  const wss = new WebSocketServer({ noServer: true });
  const clients = new Set();

  /* --------------------------------------------
      Upgrade Handler (FLEXIBLE PATH MATCHING)
  --------------------------------------------*/
  server.on("upgrade", (req, socket, head) => {
    try {
      const { pathname } = new URL(req.url, `http://${req.headers.host}`);
      
      console.log(`🔌 Upgrade request received for: ${pathname}`);

      // Check if the request is for our specific WebSocket path
      if (pathname !== EMOTION_WS_PATH) {
        console.warn(`⚠️ Rejecting WS connection: Wrong path (${pathname})`);
        socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
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
      WebSocket Connection Logic
  --------------------------------------------*/
  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.isAlive = true;
    ws.sessionId = crypto.randomUUID();

    console.log(
      `✅ Emotion WS Connected | Session: ${ws.sessionId} | Total Clients: ${clients.size}`
    );

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", async (msg) => {
      try {
        // Handle incoming binary frame (JPEG)
        const input = { 
          frame: msg, // This is the buffer from your laptop camera
          ts: Date.now() 
        };

        const result = await analyzeEmotion(input);

        // Record into session memory for later summary
        recordEmotion(ws.sessionId, result);

        // Send results back to frontend
        if (ws.readyState === 1) { // 1 = OPEN
          ws.send(
            JSON.stringify({
              type: "emotion",
              sessionId: ws.sessionId,
              ...result,
              ts: Date.now(),
            })
          );
        }
      } catch (e) {
        console.error("❌ WS Frame Processing Error:", e.message);
      }
    });

    ws.on("close", (code, reason) => {
      const summary = summarizeSession(ws.sessionId);
      if (summary) {
        console.log(`🧠 Session Summary [${ws.sessionId}]:`, summary);
      }

      closeSession(ws.sessionId);
      clients.delete(ws);
      console.log(`❌ WS Disconnected | Code: ${code} | Remaining: ${clients.size}`);
    });

    ws.on("error", (err) => {
      console.warn(`⚠️ WS Socket Error [${ws.sessionId}]:`, err.message);
      clients.delete(ws);
    });
  });

  /* --------------------------------------------
      Heartbeat (Keeps Render connection alive)
  --------------------------------------------*/
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        console.log(`💀 Terminating inactive session: ${ws.sessionId}`);
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(heartbeat);
  });

  return { wss, clients };
}