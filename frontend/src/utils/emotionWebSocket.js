// src/utils/emotionWebSocket.js
// ======================================================================
// 🔌 Ultra-Stable Emotion WebSocket Client (Auto-Reconnect, Blob-Safe)
// ======================================================================

let socket = null;
let reconnectTimer = null;
let forcedClose = false;

/** Normalize and build a correct WS URL */
function resolveWS() {
  const base =
    process.env.NODE_ENV === "production"
      ? process.env.REACT_APP_WS_URL_PROD
      : process.env.REACT_APP_WS_URL;

  const raw = base || "ws://localhost:5000";

  // Ensure ws:// or wss:// format
  return raw
    .replace("https://", "wss://")
    .replace("http://", "ws://")
    .replace(/\/$/, "") + "/api/emotion/stream";
}

/** Start WebSocket Stream */
export function startEmotionStream({ onEmotion, onOpen, onClose, onError }) {
  const WS_URL = resolveWS();
  console.log("🔌 Connecting to WS:", WS_URL);

  // Prevent duplicate sockets
  if (socket && socket.readyState === WebSocket.OPEN) {
    console.warn("⚠️ Emotion WS already open");
    return socket;
  }

  forcedClose = false;
  socket = new WebSocket(WS_URL);

  /* ----------------------------- OPEN ----------------------------- */
  socket.onopen = () => {
    console.log("🟢 Emotion WS connected →", WS_URL);
    if (onOpen) onOpen();
  };

  /* ----------------------------- MESSAGE ----------------------------- */
  socket.onmessage = async (event) => {
    try {
      // Accept BLOB or text safely
      const raw =
        event.data instanceof Blob ? await event.data.text() : event.data;

      const json = JSON.parse(raw);

      // Backend may send different emotion keys
      const emotion =
        json.dominantEmotion ||
        json.emotion ||
        json.primaryEmotion ||
        json.result;

      if (!emotion) return; // ignore noise packets

      onEmotion &&
        onEmotion({
          success: true,
          emotion,
          confidence: json.confidence || null,
          recommendations: json.recommendation || json.recommendations || null,
          raw: json,
        });
    } catch (err) {
      console.error("❌ Emotion WS parse error:", err);
    }
  };

  /* ----------------------------- ERROR ----------------------------- */
  socket.onerror = (err) => {
    console.error("❌ Emotion WS error:", err);
    onError && onError(err);
  };

  /* ----------------------------- CLOSE + AUTO-RECONNECT ----------------------------- */
  socket.onclose = () => {
    console.warn("🟡 Emotion WS closed");

    if (onClose) onClose();

    if (forcedClose) {
      console.log("🔻 Manual shutdown — no reconnect");
      return;
    }

    // Avoid multiple timers
    if (reconnectTimer) clearTimeout(reconnectTimer);

    console.log("🔄 Reconnecting in 3 seconds...");
    reconnectTimer = setTimeout(() => {
      startEmotionStream({ onEmotion, onOpen, onClose, onError });
    }, 3000);
  };

  return socket;
}

/** Send webcam frame (binary/base64 safe) */
export function sendFrame(frame) {
  try {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    // If frame is already Blob → send directly
    if (frame instanceof Blob) {
      socket.send(frame);
      return;
    }

    // Base64 or JSON
    socket.send(
      typeof frame === "string"
        ? frame
        : JSON.stringify({ data: frame })
    );
  } catch (err) {
    console.error("❌ Frame send error:", err);
  }
}

/** Stop the WS safely */
export function stopEmotionStream() {
  console.log("🔻 Stopping Emotion WS…");

  forcedClose = true;
  if (reconnectTimer) clearTimeout(reconnectTimer);

  if (socket) {
    try {
      socket.close();
    } catch (_) {}
  }

  socket = null;
}
