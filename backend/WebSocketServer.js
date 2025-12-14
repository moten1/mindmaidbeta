// backend/WebSocketServer.js
const WebSocket = require("ws");

class WebSocketServer {
  constructor(server, options = {}) {
    this.wss = new WebSocket.Server({ server, ...options });
    this.clients = new Set();

    this.wss.on("connection", (ws, req) => {
      console.log("🔌 Client connected:", req.socket.remoteAddress);
      this.clients.add(ws);

      ws.on("message", async (raw) => {
        try {
          // Handle binary frames (images)
          if (Buffer.isBuffer(raw) || raw instanceof ArrayBuffer) {
            const buffer = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
            const result = await this.processFrame(buffer);
            if (result) {
              this.sendToClient(ws, {
                type: "recommendations",
                emotion: result.emotion,
                recommendations: result.recommendations,
              });
            }
            return;
          }

          // Handle JSON messages
          let message;
          try {
            message = JSON.parse(raw.toString());
          } catch (e) {
            console.warn("⚠️ Invalid JSON received:", raw.toString());
            return;
          }

          console.log("📩 Received:", message);

          // Example: handle location
          if (message.type === "location") {
            const lat = parseFloat(message.lat);
            const lng = parseFloat(message.lng);
            if (!isNaN(lat) && !isNaN(lng)) {
              ws.userLocation = { lat, lng };
              console.log("🌍 Client location set:", ws.userLocation);
            }
          }
        } catch (err) {
          console.error("⚠️ Error processing message:", err);
        }
      });

      ws.on("close", () => {
        console.log("❌ Client disconnected");
        this.clients.delete(ws);
      });

      ws.on("error", (err) => {
        console.error("⚠️ WebSocket error:", err);
        this.clients.delete(ws);
      });
    });
  }

  /**
   * Process a single video frame (binary) and generate emotion + recommendations
   * Replace this with actual AI/emotion logic
   * @param {Buffer} frame
   */
  async processFrame(frame) {
    // Simulated placeholder for AI emotion detection
    const emotions = ["happy", "sad", "angry", "neutral", "surprised"];
    const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];

    // Simulated recommendations
    const recommendations = {
      outfit: "Casual T-shirt",
      food: "Pasta",
      music: "Lo-fi Beats",
      delivery: ["Nearby Pizza Place", "Local Sushi Bar"],
    };

    return { emotion: randomEmotion, recommendations };
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
