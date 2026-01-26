import WebSocket, { WebSocketServer as WSS } from "ws";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

if (!process.env.AI_API_KEY) {
  console.warn("⚠️ AI_API_KEY missing from environment");
}

class WebSocketServer {
  constructor(server, options = {}) {
    this.wss = new WSS({ server, ...options });
    this.clients = new Set();

    console.log("🚀 WebSocket Server Initialized");

    this.wss.on("connection", (ws, req) => {
      const ip = req.socket.remoteAddress;
      console.log(`🔌 Client connected: ${ip}`);

      this.clients.add(ws);
      ws.isAlive = true;

      // Heartbeat pong
      ws.on("pong", () => {
        ws.isAlive = true;
      });

      ws.on("message", async (raw) => {
        try {
          // -----------------------------
          // 1️⃣ Binary frames (camera feed)
          // -----------------------------
          if (raw instanceof Buffer || raw instanceof ArrayBuffer || raw instanceof Uint8Array) {
            const buffer = Buffer.from(raw);

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

          // -----------------------------
          // 2️⃣ JSON messages
          // -----------------------------
          let message;
          try {
            message = JSON.parse(raw.toString());
          } catch {
            return;
          }

          if (message.type === "location") {
            ws.userLocation = {
              lat: message.lat,
              lng: message.lng
            };
            console.log("🌍 Location updated");
          }

        } catch (err) {
          console.error("⚠️ Message processing error:", err);
        }
      });

      ws.on("close", () => {
        this.clients.delete(ws);
        console.log("❌ Client disconnected");
      });

      ws.on("error", (err) => {
        this.clients.delete(ws);
        console.error("⚠️ WebSocket error:", err);
      });
    });

    this.startHeartbeat();
  }

  // ---------------------------------
  // Heartbeat (Render-safe)
  // ---------------------------------
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
          ws.terminate();
          return;
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30_000);
  }

  // ---------------------------------
  // Real-time AI processing
  // ---------------------------------
  async processFrame(frame) {
    try {
      const base64Frame = frame.toString("base64");

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch("https://api.example.com/emotion", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.AI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ image: base64Frame }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        emotion: data.emotion || "neutral",
        recommendations: data.recommendations ?? {
          music: data.emotion === "happy" ? "Upbeat Jazz" : "Lofi Chill",
          activity: "Take a 5-minute stretch"
        }
      };

    } catch (err) {
      console.error("❌ AI processing failed:", err.message);
      return {
        emotion: "neutral",
        recommendations: {
          music: "Calm Ambient",
          activity: "Slow breathing (4–6)"
        }
      };
    }
  }

  // ---------------------------------
  // Send to one client
  // ---------------------------------
  sendToClient(client, data) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  }

  // ---------------------------------
  // Graceful shutdown
  // ---------------------------------
  close() {
    clearInterval(this.heartbeatInterval);
    this.wss.close(() => {
      console.log("🛑 WebSocket server closed");
    });
  }
}

export default WebSocketServer;
