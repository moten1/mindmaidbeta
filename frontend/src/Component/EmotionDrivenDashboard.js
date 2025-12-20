import React, { useRef, useState, useEffect } from "react";

/* ======================================================
   STRICT ENV CONFIG (NO FRONTEND FALLBACK LOGIC)
====================================================== */
const RAW_WS_HOST =
  process.env.REACT_APP_WS_URL_PROD ||
  process.env.REACT_APP_WS_URL;

const WS_PATH =
  process.env.REACT_APP_WS_PATH || "/api/emotion/stream";

if (!RAW_WS_HOST) {
  console.error("❌ REACT_APP_WS_URL(_PROD) is NOT defined");
}

// ✅ FORCE WS PROTOCOL
const WS_HOST = RAW_WS_HOST
  .replace(/^http:\/\//, "ws://")
  .replace(/^https:\/\//, "wss://")
  .replace(/\/$/, "");

const WS_URL = `${WS_HOST}${WS_PATH}`;

const DEFAULT_FPS = Number(process.env.REACT_APP_DEFAULT_FPS) || 4;
const RECONNECT_DELAY = 3000;

/* ======================================================
   COMPONENT
====================================================== */
export default function EmotionDrivenDashboard() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const frameTimerRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const lastEmotionRef = useRef(null);
  const runningRef = useRef(false);

  const [status, setStatus] = useState("disconnected");
  const [running, setRunning] = useState(false);
  const [emotion, setEmotion] = useState(null);
  const [history, setHistory] = useState([]);
  const [fps, setFps] = useState(DEFAULT_FPS);

  const [recommendations, setRecommendations] = useState({
    outfit: "",
    food: "",
    music: "",
    delivery: [],
  });

  /* ======================================================
     CAMERA
  ====================================================== */
  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoRef.current.srcObject = stream;
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;
    stream?.getTracks()?.forEach((t) => t.stop());
    videoRef.current.srcObject = null;
  };

  /* ======================================================
     FRAME CAPTURE
  ====================================================== */
  const sendFrame = () => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    canvas.getContext("2d").drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => blob && wsRef.current?.send(blob),
      "image/jpeg",
      0.8
    );
  };

  const resetFrameInterval = (nextFps) => {
    clearInterval(frameTimerRef.current);
    frameTimerRef.current = setInterval(
      sendFrame,
      1000 / nextFps
    );
    setFps(nextFps);
  };

  /* ======================================================
     FPS ADAPTATION
  ====================================================== */
  const adjustFPS = (emotionChanged) => {
    const next = emotionChanged ? 6 : 2;
    if (next !== fps) resetFrameInterval(next);
  };

  /* ======================================================
     WEBSOCKET
  ====================================================== */
  const connectWS = () => {
    if (!runningRef.current) return;

    setStatus("connecting");
    const ws = new WebSocket(WS_URL);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      resetFrameInterval(fps);
    };

    ws.onmessage = (event) => {
      if (typeof event.data !== "string") return;

      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      if (!data.emotion) return;

      const changed = lastEmotionRef.current !== data.emotion;
      lastEmotionRef.current = data.emotion;

      setEmotion(data.emotion);
      setHistory((h) => [data.emotion, ...h.slice(0, 9)]);
      if (data.recommendations) setRecommendations(data.recommendations);

      adjustFPS(changed);
    };

    ws.onerror = () => setStatus("error");

    ws.onclose = () => {
      clearInterval(frameTimerRef.current);
      setStatus("disconnected");

      if (runningRef.current) {
        reconnectTimerRef.current = setTimeout(
          connectWS,
          RECONNECT_DELAY
        );
      }
    };
  };

  /* ======================================================
     START / STOP
  ====================================================== */
  const start = async () => {
    runningRef.current = true;
    setRunning(true);
    await startCamera();
    connectWS();
  };

  const stop = () => {
    runningRef.current = false;
    clearInterval(frameTimerRef.current);
    clearTimeout(reconnectTimerRef.current);
    wsRef.current?.close();
    stopCamera();
    setRunning(false);
    setStatus("disconnected");
  };

  useEffect(() => () => stop(), []);

  /* ======================================================
     UI
  ====================================================== */
  return (
    <div style={{ padding: 20 }}>
      <h1>🧠 Emotion Driven Dashboard</h1>

      <video ref={videoRef} autoPlay playsInline style={{ width: 400 }} />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div style={{ marginTop: 16 }}>
        <button onClick={running ? stop : start}>
          {running ? "Stop Analysis" : "Start Emotion Analysis"}
        </button>
        <span style={{ marginLeft: 12 }}>Status: {status}</span>
      </div>

      {emotion && <p><b>Emotion:</b> {emotion}</p>}
    </div>
  );
}
