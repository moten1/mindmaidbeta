// ===================================================
// 🌊 Real-Time Emotion Stream Proxy (Hume AI Facial Expression)
// ===================================================

import { WebSocketServer, WebSocket } from "ws";

// Hume AI WS endpoint for face model
const HUME_WS_URL = "wss://api.hume.ai/v0/stream/models?models=face";

/**
 * Initializes the WebSocket server and handles 'upgrade' requests
 * to proxy multiple client connections to Hume AI.
 * @param {import('http').Server} server - Node.js HTTP server
 */
export function createEmotionStreamServer(server) {
  const wss = new WebSocketServer({ noServer: true });
  console.log("🧩 Emotion WebSocket proxy initialized at /api/emotion/stream");

  server.on("upgrade", (request, socket, head) => {
    if (!request.url.startsWith("/api/emotion/stream")) return;

    const HUME_KEY = process.env.HUME_API_KEY;
    if (!HUME_KEY) {
      console.error("❌ HUME_API_KEY missing");
      socket.destroy();
      return;
    }

    // Upgrade client socket
    wss.handleUpgrade(request, socket, head, (clientSocket) => {
      handleClientConnection(clientSocket, HUME_KEY);
    });
  });
}

/**
 * Handles a single client connection and proxies frames to Hume AI.
 * @param {WebSocket} clientSocket
 * @param {string} HUME_KEY
 */
function handleClientConnection(clientSocket, HUME_KEY) {
  let humeSocket = null;

  try {
    const humeUrlWithKey = `${HUME_WS_URL}&api_key=${HUME_KEY}`;
    humeSocket = new WebSocket(humeUrlWithKey);

    // ------------------------------
    // 1. Hume Socket Listeners
    // ------------------------------
    humeSocket.on("open", () => console.log("✅ Connected to Hume AI Face Model"));
    humeSocket.on("error", (err) => {
      console.error("❌ Hume WS Error:", err.message);
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.close(1011, "Hume connection error");
      }
    });

    humeSocket.on("message", (data) => {
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(data); // Forward Hume predictions to client
      }
    });

    humeSocket.on("close", (code, reason) => {
      console.log(`⚠️ Hume connection closed. Code: ${code}, Reason: ${reason.toString()}`);
      clientSocket.close();
    });

    // ------------------------------
    // 2. Client Socket Listeners
    // ------------------------------
    clientSocket.on("message", (msg) => {
      if (humeSocket.readyState === WebSocket.OPEN) {
        humeSocket.send(msg); // Forward frames from client to Hume
      }
    });

    clientSocket.on("close", () => {
      console.log("🛑 Client disconnected. Closing Hume connection.");
      humeSocket?.close();
    });

    clientSocket.on("error", (err) => {
      console.error("❌ Client WS error:", err.message);
      humeSocket?.close();
    });

  } catch (err) {
    console.error("❌ Proxy initialization error:", err);
    clientSocket.destroy();
    humeSocket?.close();
  }
}
