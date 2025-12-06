// backend/emotionProxy.js
// ======================================================
// 🔥 MindMaid Emotion Stream Proxy (Hume → Frontend)
// Fully revised, stable, Render-ready
// ======================================================

import { WebSocketServer, WebSocket } from "ws";
import axios from "axios";
import url from "url";

const HUME_WS_URL =
  "wss://api.hume.ai/v0/stream/models?models=face&granularity=all";

const FORWARD_INTERVAL = 350; // MUCH faster → Hume requires continuous frames
const PING_INTERVAL = 25000;

/**
 * Attach WebSocket upgrade handler to HTTP server
 */
export function createEmotionStreamServer(server) {
  const wss = new WebSocketServer({ noServer: true });
  console.log("🧩 WS proxy ready → /api/emotion/stream");

  server.on("upgrade", (request, socket, head) => {
    const pathname = url.parse(request.url).pathname;

    // STRICT MATCHING — avoids Render catching it
    if (pathname !== "/api/emotion/stream") return;

    const HUME_KEY = process.env.HUME_API_KEY;
    if (!HUME_KEY) {
      console.error("❌ Missing HUME_API_KEY");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (clientSocket) =>
      handleClient(clientSocket, HUME_KEY)
    );
  });
}

/**
 * Google Places helper
 */
async function getNearbyRestaurants(lat, lng, query = "restaurant") {
  try {
    const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
    if (!API_KEY) return [];

    const res = await axios.get(
      "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
      {
        params: {
          key: API_KEY,
          location: `${lat},${lng}`,
          radius: 5000,
          keyword: query,
          type: "restaurant",
        },
      }
    );

    return res.data.results.slice(0, 5).map((r) => ({
      name: r.name,
      address: r.vicinity,
      rating: r.rating,
    }));
  } catch (err) {
    console.error("❌ Google Places error:", err?.response?.data || err);
    return [];
  }
}

/**
 * Handle each connected frontend client
 */
function handleClient(clientSocket, HUME_KEY) {
  let humeSocket = null;
  let latestFrame = null;
  let forwardTimer = null;
  let pingTimer = null;
  let userLocation = null;

  // -----------------------
  // Connect to Hume WS
  // -----------------------
  const createHumeSocket = () => {
    const ws = new WebSocket(HUME_WS_URL, {
      headers: { Authorization: `Bearer ${HUME_KEY}` },
    });

    ws.on("open", () => {
      console.log("✅ Hume WebSocket Connected");

      pingTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.ping();
      }, PING_INTERVAL);
    });

    ws.on("message", async (data) => {
      if (clientSocket.readyState !== WebSocket.OPEN) return;

      try {
        const payload = JSON.parse(data.toString());

        const result =
          payload?.face?.predictions?.[0]?.emotion ??
          payload?.emotion ??
          null;

        const dominant =
          result?.dominant ??
          Object.entries(result?.scores ?? {})?.[0]?.[0] ??
          "unknown";

        const emotions = result?.scores || {};

        // Recommendations
        const outfit = emotionToOutfit(dominant);
        const music = emotionToMusic(dominant);
        const food = emotionToFood(dominant);
        let nearbyRestaurants = [];

        if (userLocation) {
          nearbyRestaurants = await getNearbyRestaurants(
            userLocation.lat,
            userLocation.lng,
            food
          );
        }

        clientSocket.send(
          JSON.stringify({
            success: true,
            dominantEmotion: dominant,
            emotions,
            recommendation: {
              outfit,
              music,
              food,
              nearbyRestaurants,
            },
          })
        );
      } catch (err) {
        console.error("❌ Hume message decode error:", err);
      }
    });

    ws.on("close", () => {
      console.log("⚠️ Hume socket closed → reconnecting");
      reconnect();
    });

    ws.on("error", (err) => {
      console.error("❌ Hume WS error:", err);
    });

    return ws;
  };

  const reconnect = () => {
    setTimeout(() => {
      humeSocket = createHumeSocket();
    }, 3000);
  };

  humeSocket = createHumeSocket();

  // -----------------------
  // Incoming messages from client
  // -----------------------
  clientSocket.on("message", (msg, isBinary) => {
    try {
      if (isBinary) {
        // UNCHANGED: direct binary from canvas → acceptable
        latestFrame = msg;
        return;
      }

      const data = JSON.parse(msg.toString());

      if (data.type === "location") {
        userLocation = { lat: data.lat, lng: data.lng };
      }

      if (data.type === "stop") {
        cleanup();
      }

      // Accept base64 frames
      if (data.frame) {
        latestFrame = Buffer.from(data.frame, "base64");
      }
    } catch {
      console.error("Client message parse failed");
    }
  });

  // -----------------------
  // Frame forward loop (FAST)
  // -----------------------
  forwardTimer = setInterval(() => {
    if (!latestFrame) return;
    if (!humeSocket || humeSocket.readyState !== WebSocket.OPEN) return;

    try {
      // Hume expects JSON wrapper for base64 images
      humeSocket.send(
        JSON.stringify({
          models: ["face"],
          data: latestFrame.toString("base64"),
        })
      );
      latestFrame = null;
    } catch (err) {
      console.error("❌ Error sending frame to Hume:", err);
    }
  }, FORWARD_INTERVAL);

  clientSocket.on("close", cleanup);
  clientSocket.on("error", cleanup);

  // -----------------------
  // CLEANUP
  // -----------------------
  function cleanup() {
    if (forwardTimer) clearInterval(forwardTimer);
    if (pingTimer) clearInterval(pingTimer);

    try {
      clientSocket.close();
    } catch {}

    try {
      humeSocket.close();
    } catch {}

    console.log("💤 Client disconnected + cleaned");
  }
}

// -------------------------------------------------------
// Recommendation Helpers
// -------------------------------------------------------
function emotionToOutfit(e) {
  const map = {
    happy: "Bright casual outfit",
    sad: "Cozy sweater",
    neutral: "Smart casual",
    angry: "Dark tones",
    fear: "Soft sweaters",
    stress: "Comfort wear",
  };
  return map[e] || "Comfort wear";
}

function emotionToMusic(e) {
  const map = {
    happy: "Upbeat pop",
    sad: "Soft jazz",
    angry: "Rock",
    neutral: "Ambient",
    fear: "Piano",
    stress: "Lo-fi chill",
  };
  return map[e] || "Ambient";
}

function emotionToFood(e) {
  const map = {
    happy: "Fruit salad",
    sad: "Chocolate",
    angry: "Spicy curry",
    neutral: "Sandwich",
    fear: "Warm soup",
    stress: "Smoothie",
  };
  return map[e] || "Snack";
}
