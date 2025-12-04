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

async function getNearbyRestaurants(lat, lng, query = "restaurant") {
  try {
    const res = await axios.get("https://maps.googleapis.com/maps/api/place/nearbysearch/json", {
      params: {
        key: process.env.GOOGLE_MAPS_API_KEY,
        location: `${lat},${lng}`,
        radius: 5000,
        type: "restaurant",
        keyword: query,
      },
    });
    return res.data.results.map(r => ({
      name: r.name,
      address: r.vicinity,
      rating: r.rating,
    }));
  } catch (err) {
    console.error("❌ Google Places error:", err?.response?.data || err);
    return [];
  }
}

function handleClient(clientSocket, HUME_KEY) {
  let humeSocket = null;
  let latestFrame = null;
  let forwardTimer = null;
  let pingTimer = null;
  let closedByServer = false;

  // Track user location sent from frontend
  let userLocation = null; // {lat: number, lng: number}

  const createHumeSocket = () => {
    const ws = new WebSocket(HUME_WS_URL, {
      headers: { Authorization: `Bearer ${HUME_KEY}` }
    });

    ws.on("open", () => {
      console.log("✅ Connected to Hume WebSocket");
      if (pingTimer) clearInterval(pingTimer);
      pingTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.ping();
      }, PING_INTERVAL);
    });

    ws.on("message", async (data) => {
      try {
        if (clientSocket.readyState !== WebSocket.OPEN) return;

        let payload = JSON.parse(data.toString());
        let emotion = payload.emotion?.dominant || payload?.data?.face?.emotion?.dominant || "unknown";
        let emotions = payload.emotion?.all || payload?.data?.face?.emotion?.all || {};

        // Fetch AI recommendations
        let outfit = emotionToOutfit(emotion);
        let music = emotionToMusic(emotion);
        let food = emotionToFood(emotion);
        let nearbyRestaurants = [];

        if (userLocation) {
          nearbyRestaurants = await getNearbyRestaurants(
            userLocation.lat,
            userLocation.lng,
            food
          );
        }

        clientSocket.send(JSON.stringify({
          success: true,
          dominantEmotion: emotion,
          emotions,
          recommendation: {
            outfit,
            music,
            food,
            nearbyRestaurants
          }
        }));
      } catch (err) {
        console.error("❌ Error processing Hume message:", err);
      }
    });

    ws.on("close", () => {
      if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
      if (!closedByServer) setTimeout(() => { humeSocket = createHumeSocket(); }, 5000);
    });

    ws.on("error", (err) => console.error("❌ Hume socket error:", err));
    return ws;
  };

  humeSocket = createHumeSocket();

  clientSocket.on("message", (msg, isBinary) => {
    try {
      if (isBinary) {
        latestFrame = Buffer.from(msg);
      } else {
        const data = JSON.parse(msg.toString());
        if (data.type === "location") {
          userLocation = { lat: data.lat, lng: data.lng };
        } else if (data.type === "control" && data.action === "stop") {
          cleanup();
        } else if (data.data) {
          // Accept base64 frame from frontend
          latestFrame = Buffer.from(data.data, "base64");
        }
      }
    } catch (err) { console.error("❌ Client message error:", err); }
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
    if (forwardTimer) clearInterval(forwardTimer);
    if (pingTimer) clearInterval(pingTimer);
    try { if (humeSocket) humeSocket.close(); } catch(e){}
    try { if (clientSocket) clientSocket.close(); } catch(e){}
  }
}

// =======================
// Helper recommendation functions
// =======================
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
