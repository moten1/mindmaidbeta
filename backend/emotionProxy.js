// backend/emotionProxy.js
// ======================================================
// 🧠 Emotion WebSocket Server
// Render-safe | ESM-native | Session-aware | Heartbeat-guarded
// ======================================================

import { WebSocketServer as WSS } from "ws";
import crypto from "crypto";
import { analyzeEmotion } from "./emotionEngine/index.js";
import {
  recordEmotion,
  summarizeSession,
  closeSession
} from "./emotionEngine/emotionSessionStore.js";

const DEFAULT_WS_PATH = "/api/emotion/stream";
const HEARTBEAT_INTERVAL_MS = 30_000; // 30 seconds

export class WebSocketServer {
  constructor(httpServer, options = {}) {
    this.httpServer = httpServer;
    this.path = options.path || DEFAULT_WS_PATH;

    this.wss = new WSS({ noServer: true });
    this._clients = new Set();
    this.heartbeatTimer = null;

    this._init();
  }

  // ------------------------
  // Expose active clients
  // ------------------------
  get clients() {
    return this._clients;
  }

  // ------------------------
  // Initialize WebSocket server
  // ------------------------
  _init() {
    this._attachUpgradeHandler();
    this._attachConnectionHandler();
    this._startHeartbeat();

    console.log(`🧠 Emotion WebSocket server ready on ${this.path}`);
  }

  // ------------------------
  // HTTP → WS Upgrade handler (only allow specific path)
  // ------------------------
  _attachUpgradeHandler() {
    this.httpServer.on("upgrade", (req, socket, head) => {
      try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        if (url.pathname !== this.path) {
          socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
          socket.destroy();
          return;
        }

        this.wss.handleUpgrade(req, socket, head, (ws) => {
          this.wss.emit("connection", ws, req);
        });
      } catch (err) {
        console.error("❌ WS upgrade failed:", err.message);
        socket.destroy();
      }
    });
  }

  // ------------------------
  // Connection lifecycle
  // ------------------------
  _attachConnectionHandler() {
    this.wss.on("connection", (ws) => {
      ws.sessionId = crypto.randomUUID();
      ws.isAlive = true;

      this._clients.add(ws);

      console.log(
        `✅ WS connected | session=${ws.sessionId} | clients=${this._clients.size}`
      );

      ws.on("pong", () => {
        ws.isAlive = true;
      });

      ws.on("message", async (message) => {
        await this._handleMessage(ws, message);
      });

      ws.on("close", (code, reason) => {
        this._handleDisconnect(ws, code, reason);
      });

      ws.on("error", (err) => {
        console.warn(`⚠️ WS error [${ws.sessionId}]:`, err.message);
        this._cleanupClient(ws);
      });
    });
  }

  // ------------------------
  // Handle incoming messages
  // ------------------------
  async _handleMessage(ws, message) {
    try {
      const input = { frame: message, ts: Date.now() };
      const result = await analyzeEmotion(input);

      // Record session data
      recordEmotion(ws.sessionId, result);

      if (ws.readyState === ws.OPEN) {
        ws.send(
          JSON.stringify({
            type: "emotion",
            sessionId: ws.sessionId,
            ts: Date.now(),
            ...result,
          })
        );
      }
    } catch (err) {
      console.error(`❌ Emotion processing failed [${ws.sessionId}]:`, err.message);
    }
  }

  // ------------------------
  // Handle disconnect + session summary
  // ------------------------
  _handleDisconnect(ws, code, reason) {
    const summary = summarizeSession(ws.sessionId);
    if (summary) {
      console.log(`🧠 Session summary [${ws.sessionId}]:`, summary);
    }

    closeSession(ws.sessionId);
    this._cleanupClient(ws);

    console.log(`❌ WS disconnected | session=${ws.sessionId} | code=${code}`);
  }

  _cleanupClient(ws) {
    this._clients.delete(ws);
  }

  // ------------------------
  // Heartbeat — terminate dead connections
  // ------------------------
  _startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this._clients.forEach((ws) => {
        if (!ws.isAlive) {
          console.log(`💀 Terminating stale session ${ws.sessionId}`);
          ws.terminate();
          this._cleanupClient(ws);
          return;
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, HEARTBEAT_INTERVAL_MS);
  }

  // ------------------------
  // Graceful shutdown
  // ------------------------
  close() {
    console.log("🧹 Shutting down WebSocket server");

    clearInterval(this.heartbeatTimer);

    this._clients.forEach((ws) => ws.close());
    this.wss.close();
  }
}
