// backend/emotionProxy.js
// ============================================
// MindMaid — Emotion WebSocket proxy + recommendations
// Robust, production-ready proxy between browser and Hume AI
// ============================================

import { WebSocketServer, WebSocket } from "ws";
import axios from "axios";

const HUME_WS_URL = "wss://api.hume.ai/v0/stream/models?models=face";
const FORWARD_INTERVAL = Number(process.env.FORWARD_INTERVAL_MS) || 2000; // ms
const PING_INTERVAL = Number(process.env.PING_INTERVAL_MS) || 25000; // ms
const MAX_BACKOFF_MS = 30_000; // 30s
const BACKOFF_BASE_MS = 500; // base backoff

export function createEmotionStreamServer(server) {
  const wss = new WebSocketServer({ noServer: true });
  console.log("🧩 Emotion WebSocket proxy initialized at /api/emotion/stream");

  server.on("upgrade", (request, socket, head) => {
    if (!request.url || !request.url.startsWith("/api/emotion/stream")) {
      return;
    }

    const HUME_KEY = process.env.HUME_API_KEY;
    if (!HUME_KEY) {
      console.error("❌ Missing HUME_API_KEY in env");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (clientSocket) => {
      handleClientConnection(clientSocket, HUME_KEY);
    });
  });
}

/**
 * handleClientConnection(clientSocket, HUME_KEY)
 * One client maps to one proxied connection to Hume.
 */
function handleClientConnection(clientSocket, HUME_KEY) {
  console.log("🔌 New client connected (emotion stream)");
  let humeSocket = null;
  let latestFrame = null; // Buffer
  let forwardTimer = null;
  let pingTimer = null;
  let closedByServer = false;
  let backoffAttempts = 0;
  let userLocation = null;

  // create hume socket with headers
  const createHumeSocket = () => {
    const options = {
      headers: {
        Authorization: `Bearer ${HUME_KEY}`,
        // add other headers if Hume requires them
      },
      // per-message deflate can be left default
    };

    const ws = new WebSocket(HUME_WS_URL, options);

    ws.on("open", () => {
      console.log("✅ Connected to Hume AI stream");
      backoffAttempts = 0;

      // start keepalive pings
      if (pingTimer) clearInterval(pingTimer);
      pingTimer = setInterval(() => {
        try {
          if (ws.readyState === WebSocket.OPEN) ws.ping();
        } catch (e) {}
      }, PING_INTERVAL);
    });

    ws.on("message", async (data) => {
      // Forward parsed emotion + recommendations back to client
      try {
        if (clientSocket.readyState !== WebSocket.OPEN) return;

        // Hume may send textual JSON or binary frames — ensure text
        const text = data instanceof Buffer ? data.toString() : data.toString();
        let payload;
        try {
          payload = JSON.parse(text);
        } catch (e) {
          // not JSON — forward raw
          clientSocket.send(JSON.stringify({ success: false, error: "non-json payload from hume" }));
          return;
        }

        // Try to find emotion data in payload
        // Hume payload shape may vary; attempt common paths
        const dominant =
          payload.dominantEmotion ||
          payload.emotion?.dominant ||
          payload.data?.face?.emotion?.dominant ||
          payload.result ||
          payload.primaryEmotion ||
          null;

        const allEmotions =
          payload.emotions ||
          payload.emotion?.all ||
          payload.data?.face?.emotion?.all ||
          payload.data?.face?.expressions ||
          null;

        const confidence =
          payload.confidence ||
          (payload.emotion && payload.emotion.confidence) ||
          null;

        const emotion = dominant || (allEmotions ? Object.keys(allEmotions)[0] : "unknown");

        // Build recommendations
        const outfit = emotionToOutfit(emotion);
        const music = emotionToMusic(emotion);
        const food = emotionToFood(emotion);

        let nearbyRestaurants = [];
        if (userLocation && process.env.GOOGLE_MAPS_API_KEY) {
          try {
            nearbyRestaurants = await fetchNearbyPlaces(
              userLocation.lat,
              userLocation.lng,
              food
            );
          } catch (err) {
            console.warn("⚠️ Google Places call failed:", err?.message || err);
            nearbyRestaurants = [];
          }
        }

        const response = {
          success: true,
          dominantEmotion: emotion,
          confidence,
          emotions: allEmotions || {},
          recommendation: {
            outfit,
            music,
            food,
            nearbyRestaurants,
          },
          raw: payload,
        };

        // Send to client
        clientSocket.send(JSON.stringify(response));
      } catch (err) {
        console.error("❌ Error processing Hume message:", err);
      }
    });

    ws.on("error", (err) => {
      console.error("❌ Hume socket error:", err?.message || err);
      // let 'close' handle reconnect/backoff
    });

    ws.on("close", (code, reason) => {
      console.warn(`⚠️ Hume socket closed (code=${code}) reason=${reason?.toString() || ""}`);
      if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }

      if (!closedByServer) {
        backoffAttempts++;
        const delay = Math.min(BACKOFF_BASE_MS * 2 ** backoffAttempts, MAX_BACKOFF_MS);
        console.log(`⏳ Reconnecting to Hume in ${delay}ms (attempt ${backoffAttempts})`);
        setTimeout(() => {
          try { humeSocket = createHumeSocket(); } catch (e) { console.error(e); }
        }, delay);
      }
    });

    return ws;
  };

  // create initial Hume socket
  humeSocket = createHumeSocket();

  // Client message handler — expects either binary frames (Buffer) or JSON text messages
  clientSocket.on("message", (msg, isBinary) => {
    try {
      if (isBinary) {
        // Browser sent Blob/binary (forward-ready)
        latestFrame = Buffer.from(msg);
        return;
      }

      const text = msg.toString();
      let payload = null;
      try {
        payload = JSON.parse(text);
      } catch (e) {
        // Not JSON; ignore
        console.warn("⚠️ Received non-json text from client (ignored)");
        return;
      }

      // Control messages
      if (payload.type === "location" && payload.lat && payload.lng) {
        userLocation = { lat: payload.lat, lng: payload.lng };
        console.log("📍 Received user location:", userLocation);
        return;
      }

      if (payload.type === "control" && payload.action === "stop") {
        cleanup();
        return;
      }

      // Accept base64 frame: {"data":"<base64>"}
      if (payload.data) {
        try {
          latestFrame = Buffer.from(payload.data, "base64");
        } catch (e) {
          console.warn("⚠️ Invalid base64 from client");
        }
      }
    } catch (err) {
      console.error("❌ Error handling client message:", err);
    }
  });

  clientSocket.on("error", (err) => {
    console.error("❌ Client socket error:", err?.message || err);
    cleanup();
  });

  clientSocket.on("close", () => {
    console.log("🛑 Client disconnected");
    cleanup();
  });

  // Forward loop: periodically forward latestFrame to Hume
  forwardTimer = setInterval(() => {
    try {
      if (!latestFrame || !humeSocket || humeSocket.readyState !== WebSocket.OPEN) return;

      // Forward binary frame to Hume
      humeSocket.send(latestFrame, { binary: true }, (err) => {
        if (err) console.error("❌ Error sending frame to Hume:", err);
      });

      // drop after forwarding
      latestFrame = null;
    } catch (err) {
      console.error("❌ Forward loop error:", err);
    }
  }, FORWARD_INTERVAL);

  // cleanup helper
  function cleanup() {
    closedByServer = true;

    if (forwardTimer) {
      clearInterval(forwardTimer);
      forwardTimer = null;
    }
    latestFrame = null;

    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }

    try {
      if (humeSocket && (humeSocket.readyState === WebSocket.OPEN || humeSocket.readyState === WebSocket.CONNECTING)) {
        humeSocket.terminate?.();
        humeSocket.close();
      }
    } catch (e) {}

    try {
      if (clientSocket && (clientSocket.readyState === WebSocket.OPEN || clientSocket.readyState === WebSocket.CONNECTING)) {
        clientSocket.terminate?.();
        clientSocket.close();
      }
    } catch (e) {}
  }
}

// -------------------------
// Optional: Google Places (nearby restaurants)
// -------------------------
async function fetchNearbyPlaces(lat, lng, keyword = "restaurant") {
  if (!process.env.GOOGLE_MAPS_API_KEY) return [];

  const url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";
  const res = await axios.get(url, {
    params: {
      key: process.env.GOOGLE_MAPS_API_KEY,
      location: `${lat},${lng}`,
      radius: 5000,
      type: "restaurant",
      keyword,
    },
    timeout: 8000,
  });

  if (!res.data || !res.data.results) return [];
  return res.data.results.slice(0, 6).map((r) => ({
    name: r.name,
    address: r.vicinity || r.formatted_address,
    rating: r.rating,
  }));
}

// -------------------------
// Recommendation helpers
// -------------------------
function emotionToOutfit(e) {
  if (!e) return "Comfort wear";
  const key = String(e).toLowerCase();
  if (key.includes("happy")) return "Bright casual outfit (sunny colours)";
  if (key.includes("sad")) return "Cozy sweater & soft textures";
  if (key.includes("angry")) return "Dark, structured outfit (calming)";
  if (key.includes("stress") || key.includes("stressed")) return "Loose comfortable layers";
  if (key.includes("surprise") || key.includes("excited")) return "Playful, statement piece";
  return "Smart casual";
}

function emotionToMusic(e) {
  if (!e) return "Ambient";
  const key = String(e).toLowerCase();
  if (key.includes("happy")) return "Upbeat pop or lively lounge";
  if (key.includes("sad")) return "Soft piano / jazz";
  if (key.includes("angry")) return "Gritty rock or cathartic beats";
  if (key.includes("stress")) return "Lo-fi chill / binaural tones";
  return "Ambient / instrumental";
}

function emotionToFood(e) {
  if (!e) return "Snack";
  const key = String(e).toLowerCase();
  if (key.includes("happy")) return "Fresh fruit salad or light bowl";
  if (key.includes("sad")) return "Comfort dessert (dark chocolate)";
  if (key.includes("angry")) return "Spicy curry or bold flavours";
  if (key.includes("stress")) return "Smoothie or calming tea-based drink";
  return "Balanced meal";
}
