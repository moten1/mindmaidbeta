import { useEffect, useRef, useState } from "react";

const API_URL = process.env.REACT_APP_API_URL || "";

export default function EmotionDrivenDashboard() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const busyRef = useRef(false);

  const [emotion, setEmotion] = useState("detecting...");
  const [error, setError] = useState(null);

  // 🎥 Start camera
  useEffect(() => {
    let stream;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" }
        });

        if (!videoRef.current) return;

        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      } catch (err) {
        console.error("Camera error:", err);
        setError("Camera access failed");
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // 📸 Capture + send frame (SAFE)
  const captureAndSendFrame = async () => {
    if (busyRef.current) return;
    if (!videoRef.current || !canvasRef.current) return;
    if (videoRef.current.readyState < 2) return;

    busyRef.current = true;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.drawImage(video, 0, 0);

      const imageBase64 = canvas.toDataURL("image/jpeg", 0.6);

      const res = await fetch(`${API_URL}/api/emotion/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageBase64 })
      });

      if (!res.ok) throw new Error("Bad response");

      const data = await res.json();

      if (data.ok && data.emotion) {
        setEmotion(data.emotion);
        setError(null);
      }

    } catch (err) {
      console.error("Emotion fetch error:", err);
      setError("Emotion analysis failed");
    } finally {
      busyRef.current = false;
    }
  };

  // ⏱ Poll every 3 seconds (Render-safe)
  useEffect(() => {
    const interval = setInterval(captureAndSendFrame, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ width: 320 }}
      />

      <canvas ref={canvasRef} style={{ display: "none" }} />

      <h3>Emotion: {emotion}</h3>

      {error && (
        <p style={{ color: "red", fontSize: 12 }}>{error}</p>
      )}
    </div>
  );
}
