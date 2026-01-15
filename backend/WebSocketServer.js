const WebSocket = require("ws");
import dotenv from "dotenv";
dotenv.config(); // Load AI keys from .env

// Example: using OpenAI API via fetch
import fetch from "node-fetch";

class WebSocketServer {
  constructor(server, options = {}) {
    this.wss = new WebSocket.Server({ server, ...options });
    this.clients = new Set();

    console.log("🚀 WebSocket Server Initialized");

    this.wss.on("connection", (ws, req) => {
      const ip = req.socket.remoteAddress;
      console.log(`🔌 Client connected from: ${ip}`);
      
      this.clients.add(ws);
      ws.isAlive = true;

      // Heartbeat to prevent idle timeouts on Render
      ws.on("pong", () => { ws.isAlive = true; });

      ws.on("message", async (raw) => {
        try {
          // 1️⃣ Handle Binary Image Frames
          if (Buffer.isBuffer(raw) || raw instanceof ArrayBuffer) {
            const buffer = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);

            // Process frame through real-time AI
            const result = await this.processFrame(buffer);

            if (result && ws.readyState === WebSocket.OPEN) {
              this.sendToClient(ws, {
                type: "emotion_update",
                emotion: result.emotion,
                recommendations: result.recommendations,
                timestamp: Date.now()
              });
            }
            return;
          }

          // 2️⃣ Handle JSON messages (Location, Config, etc.)
          let message;
          try {
            message = JSON.parse(raw.toString());
          } catch (e) { return; }

          if (message.type === "location") {
            ws.userLocation = { lat: message.lat, lng: message.lng };
            console.log("🌍 Location updated for client");
          }

        } catch (err) {
          console.error("⚠️ Message Processing Error:", err);
        }
      });

      ws.on("close", () => {
        console.log("❌ Client disconnected");
        this.clients.delete(ws);
      });

      ws.on("error", (err) => {
        console.error("⚠️ WS Socket Error:", err);
        this.clients.delete(ws);
      });
    });

    this.startHeartbeat();
  }

  // Heartbeat to prevent idle disconnect
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  // -----------------------------
  // Real-time AI processing
  // -----------------------------
  async processFrame(frame) {
    try {
      // Convert frame to base64 (adjust if your AI expects another format)
      const base64Frame = Buffer.isBuffer(frame) ? frame.toString("base64") : Buffer.from(frame).toString("base64");

      // Call your AI service
      const response = await fetch("https://api.example.com/emotion", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.AI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ image: base64Frame })
      });

      const data = await response.json();

      return {
        emotion: data.emotion,
        recommendations: data.recommendations || {
          music: data.emotion === "happy" ? "Upbeat Jazz" : "Lofi Chill",
          activity: "Take a 5-minute stretch"
        }
      };

    } catch (err) {
      console.error("❌ AI Processing Error:", err);
      return {
        emotion: "neutral",
        recommendations: { music: "Calm Ambient", activity: "Breathe deeply" }
      };
    }
  }

  // Send data to single client
  sendToClient(client, data) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  }

  // Graceful shutdown
  close() {
    clearInterval(this.heartbeatInterval);
    this.wss.close();
  }
}

module.exports = WebSocketServer;
