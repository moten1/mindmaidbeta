// ============================================
// 🌊 Real-Time Emotion Stream Proxy (Hume Facial Expression)
// ============================================

import { WebSocketServer, WebSocket } from "ws";

const HUME_WS_URL = "wss://api.hume.ai/v0/stream/models?models=face";

export function createEmotionStreamServer(server) {
  const wss = new WebSocketServer({ noServer: true });
  console.log("🧩 Emotion WebSocket proxy active at /api/emotion/stream");

  server.on("upgrade", (req, socket, head) => {
    if (!req.url.startsWith("/api/emotion/stream")) return;

    const HUME_KEY = process.env.HUME_API_KEY;
    if (!HUME_KEY) {
      console.error("❌ Missing HUME_API_KEY");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (clientSocket) => {
      proxyEmotionStream(clientSocket, HUME_KEY);
    });
  });
}

// --------------------------------------------
// 🔄 Proxy: Client ↔ Hume AI
// --------------------------------------------
function proxyEmotionStream(clientSocket, HUME_KEY) {
  const url = `${HUME_WS_URL}&api_key=${HUME_KEY}`;
  let humeSocket;

  try {
    // Connect to Hume AI WS
    humeSocket = new WebSocket(url);

    // -------------------------
    // HUME → CLIENT
    // -------------------------
    humeSocket.on("open", () => {
      console.log("✅ Connected to Hume AI Face Model Stream");
    });

    humeSocket.on("message", (data) => {
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(data);
      }
    });

    humeSocket.on("error", (err) => {
      console.error("❌ Hume Error:", err.message);
      safeClose(clientSocket, 1011, "Hume streaming error");
    });

    humeSocket.on("close", (c, r) => {
      console.log(`⚠️ Hume closed: ${c} | ${r}`);
      safeClose(clientSocket);
    });

    // -------------------------
    // CLIENT → HUME
    // -------------------------
    clientSocket.on("message", (msg) => {
      if (humeSocket.readyState === WebSocket.OPEN) {
        humeSocket.send(msg);
      }
    });

    clientSocket.on("close", () => {
      console.log("🛑 Client disconnected → closing Hume socket");
      safeClose(humeSocket);
    });

  } catch (err) {
    console.error("❌ Proxy initialization error:", err);
    safeClose(clientSocket);
    safeClose(humeSocket);
  }
}

// --------------------------------------------
// 🛡 Safe close helper (no crash risk)
// --------------------------------------------
function safeClose(socket, code, reason) {
  if (!socket) return;
  try {
    if (socket.readyState === WebSocket.OPEN) {
      socket.close(code, reason);
    } else {
      socket.terminate?.();
    }
  } catch (e) {
    socket.terminate?.();
  }
}
