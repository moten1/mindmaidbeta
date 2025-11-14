// backend/WebSocketServer.js
const WebSocket = require("ws");

class WebSocketServer {
  constructor(server, options = {}) {
    this.wss = new WebSocket.Server({ server, ...options });
    this.clients = new Set();

    this.wss.on("connection", (ws, req) => {
      console.log("🔌 Client connected:", req.socket.remoteAddress);
      this.clients.add(ws);

      ws.on("message", (raw) => {
        let message;
        try {
          message = JSON.parse(raw.toString());
        } catch (e) {
          console.warn("⚠️ Invalid JSON received:", raw.toString());
          return;
        }

        console.log("📩 Received:", message);

        // Example: Echo back with type "response"
        ws.send(JSON.stringify({ type: "response", data: message }));
      });

      ws.on("close", () => {
        console.log("❌ Client disconnected");
        this.clients.delete(ws);
      });

      ws.on("error", (err) => {
        console.error("⚠️ WebSocket error:", err.message);
        this.clients.delete(ws);
      });
    });
  }

  /**
   * Broadcast message to all connected clients
   * @param {Object} data - JSON object to send
   */
  broadcast(data) {
    const msg = JSON.stringify(data);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    }
  }

  /**
   * Send message to a single client
   * @param {WebSocket} client - Target client
   * @param {Object} data - JSON object to send
   */
  sendToClient(client, data) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  }

  /**
   * Close WebSocket server
   */
  close() {
    for (const client of this.clients) {
      client.close();
    }
    this.wss.close();
    console.log("🛑 WebSocket server closed");
  }
}

module.exports = WebSocketServer;
