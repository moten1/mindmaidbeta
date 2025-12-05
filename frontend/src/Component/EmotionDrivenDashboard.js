// frontend/src/EmotionDrivenDashboard.js
import React, { useRef, useState, useEffect } from "react";

// Dynamically select API and WS URLs based on environment
const API_URL =
  process.env.NODE_ENV === "production"
    ? process.env.REACT_APP_API_URL_PROD
    : process.env.REACT_APP_API_URL;

const WS_URL =
  process.env.NODE_ENV === "production"
    ? process.env.REACT_APP_WS_URL_PROD
    : process.env.REACT_APP_WS_URL;

export default function EmotionDrivenDashboard() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const frameIntervalRef = useRef(null);
  const lastEmotionRef = useRef(null);
  const userLocationRef = useRef(null);

  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fps, setFps] = useState(4);

  const [currentEmotion, setCurrentEmotion] = useState(null);
  const [emotionHistory, setEmotionHistory] = useState([]);
  const [recommendations, setRecommendations] = useState({
    outfit: "",
    food: "",
    music: "",
    delivery: [],
  });

  // ------------------------------
  // 1. Start camera
  // ------------------------------
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Camera error:", err);
      alert("Camera access denied. Please allow camera access.");
    }
  };

  // ------------------------------
  // 2. Capture frame & send to WebSocket
  // ------------------------------
  const captureFrame = () => {
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
        wsRef.current.send(blob);
      }
    }, "image/jpeg", 0.8);
  };

  // ------------------------------
  // 3. Adjust FPS dynamically
  // ------------------------------
  const adjustFPS = (emotionChanged) => {
    const newFps = emotionChanged ? 6 : 2;
    setFps(newFps);

    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = setInterval(captureFrame, 1000 / newFps);
    }
  };

  // ------------------------------
  // 4. Start analysis (WebSocket)
  // ------------------------------
  const startAnalysis = async () => {
    await startCamera();

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("✅ WebSocket connected");
      setConnectionStatus("connected");
      setIsAnalyzing(true);

      if (userLocationRef.current) {
        ws.send(
          JSON.stringify({
            type: "location",
            lat: userLocationRef.current.lat,
            lng: userLocationRef.current.lng,
          })
        );
      }

      frameIntervalRef.current = setInterval(captureFrame, 1000 / fps);
    };

    ws.onmessage = async (event) => {
      try {
        const raw = event.data instanceof Blob ? await event.data.text() : event.data;
        const data = JSON.parse(raw);

        if (data.type === "recommendations") {
          const emotion = data.emotion;
          const emotionChanged = lastEmotionRef.current !== emotion;
          lastEmotionRef.current = emotion;

          setCurrentEmotion({
            emotion,
            timestamp: new Date().toLocaleTimeString(),
          });

          setEmotionHistory((prev) => [
            { emotion, timestamp: new Date().toLocaleTimeString() },
            ...prev.slice(0, 9),
          ]);

          adjustFPS(emotionChanged);

          setRecommendations({
            outfit: data.recommendations.outfit,
            food: data.recommendations.food,
            music: data.recommendations.music,
            delivery: data.recommendations.delivery || [],
          });
        }
      } catch (err) {
        console.error("WS parse error:", err);
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      setConnectionStatus("error");
      stopAnalysis();
    };

    ws.onclose = () => {
      console.log("❌ WebSocket closed");
      setConnectionStatus("disconnected");
      setIsAnalyzing(false);
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    };
  };

  // ------------------------------
  // 5. Stop analysis
  // ------------------------------
  const stopAnalysis = () => {
    if (wsRef.current) wsRef.current.close();
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    setIsAnalyzing(false);
    setConnectionStatus("disconnected");
  };

  // ------------------------------
  // 6. Get user location
  // ------------------------------
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        userLocationRef.current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
      },
      (err) => console.warn("Location blocked:", err)
    );
  }, []);

  // ------------------------------
  // 7. Render UI
  // ------------------------------
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
          onClick={isAnalyzing ? stopAnalysis : startAnalysis}
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
            <strong>Delivery Options:</strong>
            <ul>
              {recommendations.delivery.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {emotionHistory.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3>Emotion History (last 10)</h3>
          <ul>
            {emotionHistory.map((e, idx) => (
              <li key={idx}>{e.emotion} - {e.timestamp}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
