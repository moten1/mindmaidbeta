// backend/emotionProxy.js
// ============================================
// 🧠 Emotion WebSocket Proxy (Phase 0.4-ready)
// Path-locked, Render-safe, observable
// ============================================

import WebSocket from "ws";
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

      // 🔐 Lock WS to emotion stream path
      if (req.url !== EMOTION_WS_PATH) {
        socket.destroy();
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } catch (e) {
      socket.destroy();
    }
  });

  /* --------------------------------------------
     WebSocket Connection
  --------------------------------------------*/
  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.isAlive = true;

    console.log("🔌 Emotion WS connected | clients:", clients.size);

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", async (msg) => {
      try {
        // Expect raw binary frames (camera) or JSON control
        const input = msg instanceof Buffer ? { frame: msg, ts: Date.now() } : {};

        // 🚀 Plug-in emotion engine
        const result = await analyzeEmotion(input);

        ws.send(
          JSON.stringify({
            type: "emotion",
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
      console.log("❌ Emotion WS disconnected | clients:", clients.size);
    });

    ws.on("error", (err) => {
      clients.delete(ws);
      console.warn("⚠️ Emotion WS error:", err.message);
    });
  });

  /* --------------------------------------------
     Heartbeat (Phase 0.3+)
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
