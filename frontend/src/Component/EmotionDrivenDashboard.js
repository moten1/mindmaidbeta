import React, { useRef, useState, useEffect } from "react";

const WS_URL = process.env.REACT_APP_WS_URL || "ws://localhost:5000";

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
    delivery: ""
  });

  // ------------------------------
  // 1. Start the camera
  // ------------------------------
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  // ------------------------------
  // 2. Capture frame & send binary
  // ------------------------------
  const captureFrame = () => {
    if (
      !videoRef.current ||
      !canvasRef.current ||
      wsRef.current?.readyState !== WebSocket.OPEN
    )
      return;

    const canvas = canvasRef.current;
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        wsRef.current.send(blob);
      },
      "image/jpeg",
      0.8
    );
  };

  // ------------------------------
  // 3. Adjust FPS dynamically
  // ------------------------------
  const adjustFPS = (emotionChanged) => {
    if (emotionChanged) setFps(4);
    else setFps(2);

    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = setInterval(captureFrame, 1000 / fps);
    }
  };

  // ------------------------------
  // 4. START ANALYSIS (WebSocket)
  // ------------------------------
  const startAnalysis = async () => {
    await startCamera();

    const ws = new WebSocket(`${WS_URL}/api/emotion/stream`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      setConnectionStatus("connected");
      setIsAnalyzing(true);

      // Send user location once
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
        const raw =
          event.data instanceof Blob ? await event.data.text() : event.data;

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
            {
              emotion,
              timestamp: new Date().toLocaleTimeString(),
            },
            ...prev.slice(0, 9),
          ]);

          adjustFPS(emotionChanged);

          setRecommendations({
            outfit: data.recommendations.outfit,
            food: data.recommendations.food,
            music: data.recommendations.music,
            delivery: data.recommendations.delivery,
          });
        }
      } catch (err) {
        console.error("WS message parse error:", err);
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      setConnectionStatus("error");
    };

    ws.onclose = () => {
      console.log("WebSocket closed");
      setConnectionStatus("disconnected");
      setIsAnalyzing(false);
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    };
  };

  // ------------------------------
  // 5. Stop Analysis
  // ------------------------------
  const stopAnalysis = () => {
    if (wsRef.current) wsRef.current.close();
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    setIsAnalyzing(false);
  };

  // ------------------------------
  // 6. Get Location On Mount
  // ------------------------------
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
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
  // UI Rendering
  // ------------------------------
  return (
    <div style={{ padding: 20 }}>
      <h1>Emotion Driven Dashboard</h1>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{ width: "400px", borderRadius: 8 }}
      />

      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div style={{ marginTop: 20 }}>
        {isAnalyzing ? (
          <button onClick={stopAnalysis} style={{ padding: 10 }}>
            Stop Analysis
          </button>
        ) : (
          <button onClick={startAnalysis} style={{ padding: 10 }}>
            Start Emotion Analysis
          </button>
        )}
      </div>

      {currentEmotion && (
        <div style={{ marginTop: 20 }}>
          <h3>Current Emotion: {currentEmotion.emotion}</h3>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <h2>AI Recommendations</h2>
        <p><strong>Outfit:</strong> {recommendations.outfit}</p>
        <p><strong>Food:</strong> {recommendations.food}</p>
        <p><strong>Music:</strong> {recommendations.music}</p>
        <p><strong>Delivery:</strong> {recommendations.delivery}</p>
      </div>
    </div>
  );
}
