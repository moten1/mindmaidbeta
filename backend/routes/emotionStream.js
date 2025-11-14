// ============================================
// 🌊 Emotion Stream Proxy (Hume Streaming)
// ============================================

import { WebSocketServer, WebSocket } from "ws";
import fetch from "node-fetch";

// This function will be imported and called from server.js
export function createEmotionStreamServer(server) {
  const wss = new WebSocketServer({ noServer: true });
  console.log("🧩 Emotion WebSocket proxy initialized at /api/emotion/stream");

  // Handle WebSocket upgrade requests
  server.on("upgrade", async (request, socket, head) => {
    if (!request.url.startsWith("/api/emotion/stream")) return;

    const HUME_KEY = process.env.HUME_API_KEY;
    if (!HUME_KEY) {
      console.error("❌ HUME_API_KEY missing in environment variables");
      socket.destroy();
      return;
    }

    try {
      // Get a Hume streaming session URL
      const res = await fetch("https://api.hume.ai/v0/stream/models", {
        headers: { Authorization: `Bearer ${HUME_KEY}` },
      });

      if (!res.ok) {
        console.error("❌ Failed to connect to Hume:", await res.text());
        socket.destroy();
        return;
      }

      const data = await res.json();
      const humeUrl = data?.url || "wss://api.hume.ai/v0/stream/models";

      // Connect to Hume WebSocket
      const humeSocket = new WebSocket(humeUrl, {
        headers: { Authorization: `Bearer ${HUME_KEY}` },
      });

      // Upgrade connection and proxy between client <-> Hume
      wss.handleUpgrade(request, socket, head, (clientSocket) => {
        clientSocket.on("message", (msg) => {
          if (humeSocket.readyState === WebSocket.OPEN) {
            humeSocket.send(msg);
          }
        });

        humeSocket.on("message", (data) => {
          clientSocket.send(data);
        });

        humeSocket.on("close", () => clientSocket.close());
        clientSocket.on("close", () => humeSocket.close());
      });
    } catch (err) {
      console.error("❌ Emotion stream proxy error:", err);
      socket.destroy();
    }
  });
}
