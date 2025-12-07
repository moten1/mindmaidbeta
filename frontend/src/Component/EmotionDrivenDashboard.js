// frontend/src/EmotionDrivenDashboard.js
import React, { useRef, useState, useEffect } from "react";

/* ---------------------------------------------
   1️⃣ AUTO-DETECT API + WS URL (Production-safe)
----------------------------------------------*/
const API_URL =
  process.env.NODE_ENV === "production"
    ? process.env.REACT_APP_API_URL_PROD
    : process.env.REACT_APP_API_URL;

const WS_BASE =
  process.env.NODE_ENV === "production"
    ? process.env.REACT_APP_WS_URL_PROD
    : process.env.REACT_APP_WS_URL;

// FORCE WS to wss:// in production
const WS_URL =
  (WS_BASE || "").replace("http://", "ws://").replace("https://", "wss://") +
  (process.env.REACT_APP_WS_PATH || "/api/emotion/stream");

const DEFAULT_FPS = Number(process.env.REACT_APP_DEFAULT_FPS) || 4;
const RECONNECT_INTERVAL = 3000; // 3 seconds

/* ---------------------------------------------
   MAIN COMPONENT
----------------------------------------------*/
export default function EmotionDrivenDashboard() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const frameIntervalRef = useRef(null);
  const lastEmotionRef = useRef(null);
  const userLocationRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fps, setFps] = useState(DEFAULT_FPS);

  const [currentEmotion, setCurrentEmotion] = useState(null);
  const [emotionHistory, setEmotionHistory] = useState([]);
  const [recommendations, setRecommendations] = useState({
    outfit: "",
    food: "",
    music: "",
    delivery: [],
  });

  /* ---------------------------------------------
     2️⃣ CAMERA START
  ----------------------------------------------*/
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      console.log("📷 Camera started");
    } catch (err) {
      console.error("❌ Camera error:", err);
      alert("Camera access blocked. Please enable it.");
    }
  };

  /* ---------------------------------------------
     3️⃣ SEND FRAME → WS (Base64)
  ----------------------------------------------*/
  const captureFrame = () => {
    try {
      if (!videoRef.current || !canvasRef.current || wsRef.current?.readyState !== WebSocket.OPEN)
        return;

      const canvas = canvasRef.current;
      const video = videoRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob && wsRef.current?.readyState === WebSocket.OPEN) {
          const reader = new FileReader();
          reader.onloadend = () => {
            wsRef.current.send(JSON.stringify({ data: reader.result }));
          };
          reader.readAsDataURL(blob);
        }
      }, "image/jpeg", 0.8);
    } catch (e) {
      console.warn("Frame capture skipped:", e);
    }
  };

  /* ---------------------------------------------
     4️⃣ DYNAMIC FPS (Smart Load Balancer)
  ----------------------------------------------*/
  const adjustFPS = (emotionChanged) => {
    const optimal = emotionChanged ? 6 : 2;
    if (optimal === fps) return;

    setFps(optimal);
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    frameIntervalRef.current = setInterval(captureFrame, 1000 / optimal);

    console.log(`⏱ FPS changed → ${optimal}`);
  };

  /* ---------------------------------------------
     5️⃣ START ANALYSIS + WS CONNECT
  ----------------------------------------------*/
  const startAnalysis = async () => {
    await startCamera();
    connectWebSocket();
  };

  const connectWebSocket = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    console.log("🌐 Attempting WS:", WS_URL);
    setConnectionStatus("connecting");

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("✅ WS CONNECTED:", WS_URL);
      setConnectionStatus("connected");
      setIsAnalyzing(true);

      if (userLocationRef.current) {
        ws.send(JSON.stringify({ type: "location", ...userLocationRef.current }));
      }

      frameIntervalRef.current = setInterval(captureFrame, 1000 / fps);
    };

    ws.onmessage = async (event) => {
      try {
        const raw = event.data instanceof Blob ? await event.data.text() : event.data;
        const json = JSON.parse(raw);

        const emotion = json.dominantEmotion || json.emotion;
        const rec = json.recommendation || json.recommendations;
        if (!emotion) return;

        const changed = lastEmotionRef.current !== emotion;
        lastEmotionRef.current = emotion;

        const timestamp = new Date().toLocaleTimeString();
        setCurrentEmotion({ emotion, timestamp });

        setEmotionHistory((prev) => [
          { emotion, timestamp },
          ...prev.slice(0, 9),
        ]);

        adjustFPS(changed);

        if (rec) {
          setRecommendations({
            outfit: rec.outfit || "",
            food: rec.food || "",
            music: rec.music || "",
            delivery: rec.nearbyRestaurants || rec.delivery || [],
          });
        }
      } catch (err) {
        console.error("❌ WS JSON Parse Error:", err);
      }
    };

    ws.onerror = (err) => {
      console.error("❌ WS ERROR:", err);
      setConnectionStatus("error");
    };

    ws.onclose = () => {
      console.warn("🔌 WS CLOSED — retrying in 3s...");
      setConnectionStatus("disconnected");
      stopAnalysis(false);

      // Auto-reconnect
      reconnectTimerRef.current = setTimeout(() => {
        if (isAnalyzing) connectWebSocket();
      }, RECONNECT_INTERVAL);
    };
  };

  /* ---------------------------------------------
     6️⃣ STOP ANALYSIS
  ----------------------------------------------*/
  const stopAnalysis = (manual = true) => {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    if (wsRef.current) wsRef.current.close();
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);

    setIsAnalyzing(false);
    if (manual) setConnectionStatus("disconnected");

    console.log("🛑 Analysis stopped");
  };

  /* ---------------------------------------------
     7️⃣ GET USER LOCATION
  ----------------------------------------------*/
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        userLocationRef.current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        console.log("📍 Location:", userLocationRef.current);
      },
      () => console.warn("Location blocked")
    );
  }, []);

  /* ---------------------------------------------
     8️⃣ UI
  ----------------------------------------------*/
  return (
    <div style={{ padding: 20 }}>
      <h1>🧠 Emotion Driven Dashboard</h1>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{ width: 400, borderRadius: 8, marginTop: 20 }}
      />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div style={{ marginTop: 20 }}>
        <button
          onClick={isAnalyzing ? () => stopAnalysis(true) : startAnalysis}
          style={{
            padding: "10px 20px",
            fontSize: 16,
            backgroundColor: isAnalyzing ? "#e53e3e" : "#48bb78",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          {isAnalyzing ? "Stop Analysis" : "Start Emotion Analysis"}
        </button>
        <span style={{ marginLeft: 10 }}>Status: {connectionStatus}</span>
      </div>

      {currentEmotion && (
        <div style={{ marginTop: 20 }}>
          <h3>Current Emotion: {currentEmotion.emotion}</h3>
          <small>{currentEmotion.timestamp}</small>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <h2>AI Recommendations</h2>
        <p><strong>Outfit:</strong> {recommendations.outfit}</p>
        <p><strong>Food:</strong> {recommendations.food}</p>
        <p><strong>Music:</strong> {recommendations.music}</p>
        {recommendations.delivery.length > 0 && (
          <div>
            <strong>Delivery:</strong>
            <ul>{recommendations.delivery.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </div>
        )}
      </div>

      {emotionHistory.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3>Emotion History (last 10)</h3>
          <ul>
            {emotionHistory.map((e, i) => (
              <li key={i}>{e.emotion} – {e.timestamp}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
