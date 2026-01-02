const WebSocket = require("ws");

class WebSocketServer {
  constructor(server, options = {}) {
    // Standardizing the path to match your frontend config
    this.wss = new WebSocket.Server({ server, ...options });
    this.clients = new Set();

    console.log("🚀 WebSocket Server Initialized");

    this.wss.on("connection", (ws, req) => {
      const ip = req.socket.remoteAddress;
      console.log(`🔌 Client connected from: ${ip}`);
      
      this.clients.add(ws);
      ws.isAlive = true;

      // Setup Heartbeat to prevent Render timeout
      ws.on("pong", () => { ws.isAlive = true; });

      ws.on("message", async (raw) => {
        try {
          // 1. Handle Binary Image Frames
          if (Buffer.isBuffer(raw) || raw instanceof ArrayBuffer) {
            const buffer = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
            
            // Log frame receipt (useful for debugging performance)
            // console.log(`📸 Received frame: ${buffer.length} bytes`);

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

          // 2. Handle JSON messages (Location, Config, etc.)
          let message;
          try {
            message = JSON.parse(raw.toString());
          } catch (e) {
            return; // Ignore non-JSON strings
          }

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

    // Start Heartbeat interval (every 30 seconds)
    this.startHeartbeat();
  }

  /**
   * Prevents Render from closing "idle" connections
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  async processFrame(frame) {
    // In production, you'd pass 'frame' to your AI model here.
    const emotions = ["happy", "calm", "focused", "energetic", "thoughtful"];
    const emotion = emotions[Math.floor(Math.random() * emotions.length)];

    return { 
      emotion, 
      recommendations: {
        music: emotion === "happy" ? "Upbeat Jazz" : "Lofi Chill",
        activity: "Take a 5-minute stretch"
      } 
    };
  }

  sendToClient(client, data) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  }

  close() {
    clearInterval(this.heartbeatInterval);
    this.wss.close();
  }
}

module.exports = WebSocketServer;