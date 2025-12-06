// backend/emotionProxy.js
// ============================================
// 🔥 MindMaid Emotion Stream + Real-time Recommendations
// ============================================

import { WebSocketServer, WebSocket } from "ws";
import axios from "axios";

const HUME_WS_URL = "wss://api.hume.ai/v0/stream/models?models=face";
const FORWARD_INTERVAL = 2000; // send frame every 2s
const PING_INTERVAL = 25000;    // Hume keepalive

export function createEmotionStreamServer(server) {
  const wss = new WebSocketServer({ noServer: true });
  console.log("🧩 Emotion WebSocket proxy initialized at /api/emotion/stream");

  server.on("upgrade", (request, socket, head) => {
    if (!request.url.startsWith("/api/emotion/stream")) return;

    const HUME_KEY = process.env.HUME_API_KEY;
    if (!HUME_KEY) {
      console.error("❌ HUME_API_KEY missing");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (clientSocket) => {
      handleClient(clientSocket, HUME_KEY);
    });
  });
}

function handleClient(clientSocket, HUME_KEY) {
  let humeSocket = null;
  let latestFrame = null;
  let forwardTimer = null;
  let pingTimer = null;
  let closedByServer = false;
  let userLocation = null;

  const createHumeSocket = () => {
    const ws = new WebSocket(HUME_WS_URL, { headers: { Authorization: `Bearer ${HUME_KEY}` } });

    ws.on("open", () => {
      console.log("✅ Connected to Hume WebSocket");
      pingTimer = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.ping(); }, PING_INTERVAL);
    });

    ws.on("message", async (data) => {
      if (clientSocket.readyState !== WebSocket.OPEN) return;

      let payload = JSON.parse(data.toString());
      let emotion = payload.emotion?.dominant || "unknown";
      let emotions = payload.emotion?.all || {};

      // Simple recommendations
      let rec = {
        outfit: emotionToOutfit(emotion),
        music: emotionToMusic(emotion),
        food: emotionToFood(emotion),
        nearbyRestaurants: []
      };

      if (userLocation) {
        rec.nearbyRestaurants = await getNearbyRestaurants(userLocation.lat, userLocation.lng, rec.food);
      }

      clientSocket.send(JSON.stringify({ success: true, dominantEmotion: emotion, emotions, recommendation: rec }));
    });

    ws.on("close", () => {
      clearInterval(pingTimer);
      if (!closedByServer) setTimeout(() => { humeSocket = createHumeSocket(); }, 5000);
    });

    ws.on("error", (err) => console.error("❌ Hume socket error:", err));
    return ws;
  };

  humeSocket = createHumeSocket();

  clientSocket.on("message", (msg, isBinary) => {
    if (isBinary) {
      latestFrame = Buffer.from(msg);
    } else {
      const data = JSON.parse(msg.toString());
      if (data.type === "location") userLocation = { lat: data.lat, lng: data.lng };
      if (data.data) latestFrame = Buffer.from(data.data, "base64");
      if (data.type === "control" && data.action === "stop") cleanup();
    }
  });

  clientSocket.on("close", cleanup);
  clientSocket.on("error", cleanup);

  forwardTimer = setInterval(() => {
    if (!latestFrame || !humeSocket || humeSocket.readyState !== WebSocket.OPEN) return;
    humeSocket.send(latestFrame, { binary: true });
    latestFrame = null;
  }, FORWARD_INTERVAL);

  function cleanup() {
    closedByServer = true;
    clearInterval(forwardTimer);
    clearInterval(pingTimer);
    try { humeSocket?.close(); } catch (e) {}
    try { clientSocket?.close(); } catch (e) {}
  }
}

// =======================
// Helper functions
// =======================
async function getNearbyRestaurants(lat, lng, query) {
  try {
    const res = await axios.get("https://maps.googleapis.com/maps/api/place/nearbysearch/json", {
      params: { key: process.env.GOOGLE_MAPS_API_KEY, location: `${lat},${lng}`, radius: 5000, type: "restaurant", keyword: query }
    });
    return res.data.results.map(r => ({ name: r.name, address: r.vicinity, rating: r.rating }));
  } catch (err) {
    console.error("❌ Google Places error:", err?.response?.data || err);
    return [];
  }
}

function emotionToOutfit(emotion) {
  const map = { happy: "Bright casual outfit", sad: "Cozy sweater", neutral: "Smart casual", angry: "Dark tones", stress: "Comfort wear" };
  return map[emotion] || "Comfort wear";
}

function emotionToMusic(emotion) {
  const map = { happy: "Upbeat pop", sad: "Soft jazz", neutral: "Ambient", angry: "Rock", stress: "Lo-fi chill" };
  return map[emotion] || "Ambient";
}

function emotionToFood(emotion) {
  const map = { happy: "Fruit salad", sad: "Chocolate", neutral: "Sandwich", angry: "Spicy curry", stress: "Smoothie" };
  return map[emotion] || "Snack";
}
