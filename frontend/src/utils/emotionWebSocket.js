// src/utils/emotionWebSocket.js
// ============================================
// 🔌 Stable WebSocket Client for Emotion Analysis
// ============================================

let socket = null;
let reconnectTimer = null;

export function startEmotionStream({
  onEmotion,
  onOpen,
  onClose,
  onError,
}) {
  const WS_URL =
    process.env.REACT_APP_WS_URL_PROD ||
    process.env.REACT_APP_WS_URL ||
    "ws://localhost:5000";

  const fullUrl = `${WS_URL}/api/emotion/stream`;

  console.log("🔌 Connecting to:", fullUrl);

  socket = new WebSocket(fullUrl);

  socket.onopen = () => {
    console.log("🟢 Emotion WS connected");
    if (onOpen) onOpen();
  };

  socket.onmessage = (ev) => {
    try {
      const payload = JSON.parse(ev.data);

      if (payload.success) {
        onEmotion && onEmotion(payload);
      }
    } catch (err) {
      console.error("❌ Emotion parse error:", err);
    }
  };

  socket.onerror = (err) => {
    console.error("❌ Emotion WS error:", err);
    onError && onError(err);
  };

  socket.onclose = () => {
    console.warn("🟡 Emotion WS closed — retrying in 3s...");
    if (onClose) onClose();

    reconnectTimer = setTimeout(() => {
      startEmotionStream({ onEmotion, onOpen, onClose, onError });
    }, 3000);
  };

  return socket;
}

// Send webcam frames
export function sendFrame(base64Frame) {
  try {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ data: base64Frame }));
  } catch (err) {
    console.error("❌ Frame send error:", err);
  }
}

export function stopEmotionStream() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (socket) socket.close();
}
