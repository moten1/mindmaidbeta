import React, { useState, useRef, useEffect } from "react";

const WS_URL = process.env.REACT_APP_WS_PROXY || "ws://localhost:5000/api/emotion/stream";

export default function LiveEmotionStream() {
  const [result, setResult] = useState(null);
  const [streaming, setStreaming] = useState(false);
  const [toast, setToast] = useState("");
  const videoRef = useRef(null);
  const wsRef = useRef(null);
  const streamRef = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  // Start camera & WebSocket streaming
  const startStreaming = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      videoRef.current.srcObject = mediaStream;
      streamRef.current = mediaStream;

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("✅ Connected to WebSocket proxy");
        setStreaming(true);
      };

      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data);
          setResult(data);
        } catch (err) {
          console.error("Invalid WS message", err);
        }
      };

      ws.onerror = (err) => console.error("WebSocket error:", err);

      ws.onclose = () => {
        console.log("WebSocket closed");
        setStreaming(false);
      };

      // Capture frames as user interacts
      const captureFrame = () => {
        if (!videoRef.current || ws.readyState !== WebSocket.OPEN) return;

        const canvas = document.createElement("canvas");
        canvas.width = 480;
        canvas.height = (videoRef.current.videoHeight / videoRef.current.videoWidth) * 480;
        canvas.getContext("2d").drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          if (blob) ws.send(blob);
        }, "image/jpeg");
      };

      // Capture frames only when user is active (mousemove/keydown)
      const handleUserActivity = () => captureFrame();
      window.addEventListener("mousemove", handleUserActivity);
      window.addEventListener("keydown", handleUserActivity);

      ws.onclose = () => {
        window.removeEventListener("mousemove", handleUserActivity);
        window.removeEventListener("keydown", handleUserActivity);
      };

    } catch (err) {
      console.error(err);
      showToast("Camera access denied or failed to start stream.");
    }
  };

  const stopStreaming = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStreaming(false);
    setResult(null);
  };

  useEffect(() => {
    return () => stopStreaming(); // cleanup on unmount
  }, []);

  return (
    <div className="space-y-6">
      {toast && <div className="fixed top-5 right-5 bg-yellow-400 text-white px-4 py-2 rounded-md z-50">{toast}</div>}

      <h1 className="text-4xl font-bold text-gray-800">Live Emotion Stream</h1>

      <video ref={videoRef} autoPlay playsInline className="w-full max-w-md rounded-lg border-2 border-gray-300" />

      {!streaming ? (
        <button onClick={startStreaming} className="bg-yellow-400 px-6 py-3 rounded-md text-white font-semibold hover:bg-yellow-500">Start Live Emotion Stream</button>
      ) : (
        <button onClick={stopStreaming} className="bg-gray-400 px-6 py-3 rounded-md text-white font-semibold hover:bg-gray-500">Stop Stream</button>
      )}

      {result && (
        <div className="p-4 bg-white rounded-lg shadow-md">
          <p className="font-semibold text-gray-800">Detected Mood: {result.dominantEmotion || "Analyzing..."}</p>
          {result.emotions && Object.entries(result.emotions).map(([k,v]) => (
            <div key={k} className="flex justify-between">
              <span className="capitalize">{k}</span>
              <span>{(v*100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
