// ============================================
// 🌊 Real-Time Emotion Stream Proxy (Hume Facial Expression)
// ============================================

import { WebSocketServer, WebSocket } from "ws";

const HUME_WS_URL = "wss://api.hume.ai/v0/stream/models?models=face";

export function createEmotionStreamServer(server) {
  const wss = new WebSocketServer({ noServer: true });
  console.log("🧩 Emotion WebSocket proxy active at /api/emotion/stream");

  server.on("upgrade", (request, socket, head) => {
    if (!request.url.startsWith("/api/emotion/stream")) return;

    const HUME_KEY = process.env.HUME_API_KEY;
    if (!HUME_KEY) {
      console.error("❌ Missing HUME_API_KEY");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (clientSocket) => {
      handleClientConnection(clientSocket, HUME_KEY);
    });
  });
}

function handleClientConnection(clientSocket, HUME_KEY) {
  let humeSocket;

  try {
    const wsUrl = `${HUME_WS_URL}&api_key=${HUME_KEY}`;
    humeSocket = new WebSocket(wsUrl);

    // HUME Events
    humeSocket.on("open", () =>
      console.log("✅ Connected to Hume AI Face Model Stream")
    );

    humeSocket.on("message", (data) => {
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(data);
      }
    });

    humeSocket.on("error", (err) => {
      console.error("❌ Hume Error:", err.message);
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.close(1011, "Hume streaming error");
      }
    });

    humeSocket.on("close", () => clientSocket.close());

    // CLIENT Events
    clientSocket.on("message", (msg) => {
      if (humeSocket.readyState === WebSocket.OPEN) {
        humeSocket.send(msg);
      }
    });

    clientSocket.on("close", () => {
      console.log("🛑 Client disconnected → closing Hume socket");
      humeSocket?.close();
    });

  } catch (err) {
    console.error("❌ Proxy initialization failed:", err);
    clientSocket.terminate();
    humeSocket?.terminate();
  }
}
