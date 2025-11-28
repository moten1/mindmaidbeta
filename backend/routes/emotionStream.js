// ===================================================
// 🌊 Emotion Stream Proxy (Hume AI Facial Expression)
// ===================================================

import { WebSocketServer, WebSocket } from "ws";
// Removed 'fetch' as we no longer need the initial REST call.

// The correct, direct WebSocket endpoint for Expression Measurement (Face Model)
const HUME_WS_URL = "wss://api.hume.ai/v0/stream/models?models=face"; 

/**
 * Initializes the WebSocket server and handles the 'upgrade' request to proxy
 * the client connection to the Hume AI streaming API.
 * @param {import('http').Server} server The Node.js HTTP server instance.
 */
export function createEmotionStreamServer(server) {
  const wss = new WebSocketServer({ noServer: true });
  console.log("🧩 Emotion WebSocket proxy initialized at /api/emotion/stream");

  // Handle WebSocket upgrade requests initiated by the client
  server.on("upgrade", (request, socket, head) => {
    // Only process requests destined for this specific path
    if (!request.url.startsWith("/api/emotion/stream")) return;

    const HUME_KEY = process.env.HUME_API_KEY;
    if (!HUME_KEY) {
      console.error("❌ HUME_API_KEY missing in environment variables");
      socket.destroy();
      return;
    }

    // Upgrade the client's connection to a WebSocket
    wss.handleUpgrade(request, socket, head, (clientSocket) => {
      // Pass the client socket to the proxy function
      proxyClientToHume(clientSocket, HUME_KEY);
    });
  });
}


/**
 * Establishes and manages the proxy connection between the client and Hume AI.
 * @param {WebSocket} clientSocket The established client WebSocket connection.
 * @param {string} HUME_KEY The Hume API key.
 */
function proxyClientToHume(clientSocket, HUME_KEY) {
  let humeSocket = null;

  try {
    // CRITICAL FIX: Use query parameter for WS auth, connecting directly to the endpoint.
    // Also including 'models=face' to ensure the correct model is used for expression detection.
    const humeUrlWithKey = `${HUME_WS_URL}&api_key=${HUME_KEY}`;
    humeSocket = new WebSocket(humeUrlWithKey);

    // ===================================
    // 1. Hume Socket Event Listeners
    // ===================================
    
    humeSocket.on("open", () => {
      console.log("✅ Proxy: Successfully connected to Hume AI Expression API.");
    });
    
    humeSocket.on("error", (err) => {
      console.error("❌ Hume WebSocket Error:", err.message);
      // Close client connection gracefully with an error code
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.close(1011, "Hume API connection failed due to server error."); 
      }
    });

    // NOTE: For production, you must implement automatic reconnection logic on 'close'.

    // ===================================
    // 2. Proxy Logic (Client <-> Hume)
    // ===================================

    // PROXY LOGIC: Client -> Hume (Forwarding camera data/control messages)
    clientSocket.on("message", (msg) => {
      if (humeSocket?.readyState === WebSocket.OPEN) {
        humeSocket.send(msg); 
      }
    });

    // PROXY LOGIC: Hume -> Client (Forwarding emotion data/results)
    humeSocket.on("message", (data) => {
      clientSocket.send(data);
    });
    
    // ===================================
    // 3. Closure Logic
    // ===================================

    // If Hume closes, close the client
    humeSocket.on("close", (code, reason) => {
      console.log(`⚠️ Hume connection closed. Code: ${code}. Reason: ${reason.toString()}`);
      clientSocket.close();
    });

    // If client closes, close the Hume connection
    clientSocket.on("close", () => {
      console.log("🛑 Client connection closed. Closing Hume connection.");
      humeSocket?.close();
    });

  } catch (err) {
    console.error("❌ Emotion stream proxy initial connection error:", err);
    clientSocket.destroy();
  }
}