import React, { useRef, useState, useEffect, useCallback } from "react";

/* ======================================================
   STRICT ENV CONFIG (HARDENED FOR RENDER)
====================================================== */
const getWsUrl = () => {
  // If we are on localhost, use local backend. 
  // If on Render, use the direct backend WSS URL.
  const isLocal = window.location.hostname === "localhost";
  
  if (isLocal) {
    return "ws://localhost:5000/api/emotion/stream";
  } else {
    // We hardcode this to ensure the frontend talks to the backend service, not itself
    return "wss://mindmaidbeta-backend.onrender.com/api/emotion/stream";
  }
};

const DEFAULT_FPS = 4;
const RECONNECT_DELAY = 3000;

export default function EmotionDrivenDashboard() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const frameTimerRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const runningRef = useRef(false);
  const fpsRef = useRef(DEFAULT_FPS);

  const [status, setStatus] = useState("disconnected");
  const [running, setRunning] = useState(false);
  const [emotion, setEmotion] = useState(null);

  /* ======================================================
     UNIVERSAL CAMERA LOGIC (LAPTOP + MOBILE)
  ====================================================== */
  const startCamera = async () => {
    // Attempts mobile-first, falls back to laptop/default
    const constraints = [
      { video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } },
      { video: true } 
    ];

    for (const constraint of constraints) {
      try {
        console.log("📷 Attempting camera with:", constraint);
        const stream = await navigator.mediaDevices.getUserMedia(constraint);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          return; 
        }
      } catch (err) {
        console.warn("Retrying camera... error was:", err.name);
      }
    }
    throw new Error("Device camera could not be started. Please check permissions.");
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;
    stream?.getTracks()?.forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  /* ======================================================
     WEBSOCKET & FRAME CAPTURE
  ====================================================== */
  const sendFrame = () => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;

    canvas.width = 320; 
    canvas.height = 240;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob && ws.readyState === WebSocket.OPEN) {
        ws.send(blob);
      }
    }, "image/jpeg", 0.5);
  };

  const connectWS = useCallback(() => {
    if (!runningRef.current) return;
    const WS_URL = getWsUrl();
    
    console.log("🔌 Connecting to:", WS_URL);
    setStatus("connecting");
    
    const ws = new WebSocket(WS_URL);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("✅ WebSocket Connected");
      setStatus("connected");
      if (frameTimerRef.current) clearInterval(frameTimerRef.current);
      frameTimerRef.current = setInterval(sendFrame, 1000 / fpsRef.current);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.emotion) setEmotion(data.emotion);
      } catch (e) { /* skip non-json frames */ }
    };

    ws.onclose = (e) => {
      console.log("🔌 Connection Closed:", e.code);
      setStatus("reconnecting");
      clearInterval(frameTimerRef.current);
      if (runningRef.current) {
        reconnectTimerRef.current = setTimeout(connectWS, RECONNECT_DELAY);
      }
    };

    ws.onerror = (err) => {
      console.error("❌ WebSocket Error:", err);
      setStatus("connection_error");
    };
  }, []);

  const start = async () => {
    try {
      runningRef.current = true;
      setRunning(true);
      setEmotion(null);
      await startCamera();
      connectWS();
    } catch (e) {
      alert(e.message);
      stop();
    }
  };

  const stop = useCallback(() => {
    runningRef.current = false;
    if (frameTimerRef.current) clearInterval(frameTimerRef.current);
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    stopCamera();
    setRunning(false);
    setEmotion(null);
    setStatus("disconnected");
  }, []);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  const getStatusColor = () => {
    switch(status) {
      case "connected": return "#4ade80"; // Green
      case "connecting":
      case "reconnecting": return "#fbbf24"; // Yellow
      case "connection_error":
      case "camera_error": return "#f87171"; // Red
      default: return "#6b7280"; // Gray
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🧠 MindMaid AI</h2>
      
      <div style={styles.videoBox}>
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          style={styles.video} 
        />
        
        {!running && (
          <div style={styles.overlay}>
            <button onClick={start} style={styles.startBtn}>
              START ANALYSIS
            </button>
          </div>
        )}

        {emotion && <div style={styles.badge}>{emotion.toUpperCase()}</div>}
      </div>

      <div style={styles.statusRow}>
        <div style={{...styles.dot, backgroundColor: getStatusColor()}} />
        <span style={styles.statusText}>{status.toUpperCase()}</span>
      </div>

      {running && (
        <button onClick={stop} style={styles.stopLink}>
          Stop and Close Camera
        </button>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}

const styles = {
  container: { textAlign: 'center', padding: '20px', backgroundColor: '#0a1a12', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif' },
  title: { color: '#facc15', marginBottom: '20px', letterSpacing: '2px', fontWeight: '800' },
  videoBox: { position: 'relative', width: '100%', maxWidth: '500px', margin: '0 auto', borderRadius: '16px', overflow: 'hidden', background: '#000', border: '2px solid #1e293b' },
  video: { width: '100%', display: 'block', transform: 'scaleX(-1)' }, // Mirrored for natural feel
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.8)' },
  startBtn: { padding: '16px 32px', fontSize: '18px', backgroundColor: '#facc15', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', color: '#000', transition: 'transform 0.2s' },
  badge: { position: 'absolute', top: 20, right: 20, padding: '10px 25px', background: '#facc15', color: '#000', borderRadius: '30px', fontWeight: '900', fontSize: '1.4rem', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' },
  statusRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '25px', gap: '10px' },
  dot: { width: '12px', height: '12px', borderRadius: '50%', boxShadow: '0 0 10px rgba(255,255,255,0.2)' },
  statusText: { color: '#94a3b8', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '1.5px' },
  stopLink: { marginTop: '25px', background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem' }
};