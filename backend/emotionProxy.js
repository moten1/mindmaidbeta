// ============================================
// 🌊 Real-Time Emotion Stream Proxy (Hume Facial Expression)
// ============================================

import { WebSocketServer, WebSocket } from "ws";

const HUME_WS_URL = "wss://api.hume.ai/v0/stream/models?models=face";
const HEARTBEAT_INTERVAL_MS = 30000; // Send ping every 30 seconds
const RECONNECT_BASE_DELAY_MS = 1000; // Initial reconnect delay

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
// 🔄 Proxy: Client ↔ Hume AI with reconnect & heartbeat
// --------------------------------------------
function proxyEmotionStream(clientSocket, HUME_KEY) {
  let humeSocket;
  let heartbeatTimer;
  let reconnectDelay = RECONNECT_BASE_DELAY_MS;

  function connectHume() {
    const url = `${HUME_WS_URL}&api_key=${HUME_KEY}&inactivity_timeout=300`; // increase inactivity timeout
    console.log("🌐 Connecting to Hume AI WS...");
    humeSocket = new WebSocket(url);

    humeSocket.on("open", () => {
      console.log("✅ Connected to Hume AI Face Model Stream");
      reconnectDelay = RECONNECT_BASE_DELAY_MS;

      // Start heartbeat to prevent inactivity disconnect
      heartbeatTimer = setInterval(() => {
        if (humeSocket.readyState === WebSocket.OPEN) {
          humeSocket.ping();
          if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(JSON.stringify({ type: "ping" }));
          }
        }
      }, HEARTBEAT_INTERVAL_MS);
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

    humeSocket.on("close", (code, reason) => {
      console.log(`⚠️ Hume closed: ${code} | ${reason}`);
      clearInterval(heartbeatTimer);

      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(
          JSON.stringify({ type: "error", message: "Hume stream disconnected, reconnecting..." })
        );
      }

      // Attempt to reconnect with exponential backoff
      setTimeout(() => {
        if (clientSocket.readyState === WebSocket.OPEN) {
          connectHume();
          reconnectDelay = Math.min(reconnectDelay * 2, 30000); // cap at 30 seconds
        } else {
          safeClose(clientSocket);
        }
      }, reconnectDelay);
    });
  }

  // Proxy from client to Hume
  clientSocket.on("message", (msg) => {
    if (humeSocket.readyState === WebSocket.OPEN) {
      humeSocket.send(msg);
    }
  });

  clientSocket.on("close", () => {
    console.log("🛑 Client disconnected → closing Hume socket");
    clearInterval(heartbeatTimer);
    safeClose(humeSocket);
  });

  clientSocket.on("error", (err) => {
    console.error("❌ Client Socket Error:", err.message);
    clearInterval(heartbeatTimer);
    safeClose(humeSocket);
  });

  connectHume();
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
  } catch {
    socket.terminate?.();
  }
}
