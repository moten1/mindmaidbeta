import React, { useRef, useState, useEffect, useCallback } from "react";

/* ======================================================
   STRICT ENV CONFIG (REVISED FOR PRODUCTION)
====================================================== */
const getWsUrl = () => {
  const host = process.env.REACT_APP_WS_URL_PROD || process.env.REACT_APP_WS_URL || window.location.origin.replace(/^http/, 'ws');
  const path = process.env.REACT_APP_WS_PATH || "/api/emotion/stream";
  const cleanHost = host.replace(/\/$/, "");
  return `${cleanHost}${path}`.replace(/^http/, 'ws');
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
    // Try mobile front-camera first, then fallback to basic video
    const constraints = [
      { video: { facingMode: "user", width: 640, height: 480 } },
      { video: true } 
    ];

    for (const constraint of constraints) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraint);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          return; // Success!
        }
      } catch (err) {
        console.warn("Attempt failed for constraint:", constraint, err);
      }
    }
    throw new Error("Could not access any camera.");
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

    canvas.width = 320; // Lower resolution for faster transmission
    canvas.height = 240;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => blob && ws.send(blob), "image/jpeg", 0.5);
  };

  const connectWS = useCallback(() => {
    if (!runningRef.current) return;
    const WS_URL = getWsUrl();
    
    setStatus("connecting");
    const ws = new WebSocket(WS_URL);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("🔌 Connected to Backend");
      setStatus("connected");
      if (frameTimerRef.current) clearInterval(frameTimerRef.current);
      frameTimerRef.current = setInterval(sendFrame, 1000 / fpsRef.current);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.emotion) setEmotion(data.emotion);
      } catch (e) { /* ignore non-json */ }
    };

    ws.onclose = () => {
      setStatus("reconnecting");
      clearInterval(frameTimerRef.current);
      if (runningRef.current) {
        reconnectTimerRef.current = setTimeout(connectWS, RECONNECT_DELAY);
      }
    };

    ws.onerror = () => setStatus("connection_error");
  }, []);

  const start = async () => {
    try {
      runningRef.current = true;
      setRunning(true);
      await startCamera();
      connectWS();
    } catch (e) {
      alert("Camera failed: " + e.message);
      stop();
    }
  };

  const stop = useCallback(() => {
    runningRef.current = false;
    if (frameTimerRef.current) clearInterval(frameTimerRef.current);
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    wsRef.current?.close();
    stopCamera();
    setRunning(false);
    setEmotion(null);
    setStatus("disconnected");
  }, []);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  // Status Indicator Helper
  const getStatusColor = () => {
    if (status === "connected") return "#4ade80"; // Green
    if (status === "connecting" || status === "reconnecting") return "#fbbf24"; // Yellow
    if (status === "camera_error" || status === "connection_error") return "#f87171"; // Red
    return "#6b7280"; // Gray
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🧠 MindMaid AI</h2>
      
      <div style={styles.videoBox}>
        <video ref={videoRef} autoPlay playsInline muted style={styles.video} />
        
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
        <button onClick={stop} style={styles.stopLink}>Stop and Close Camera</button>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}

const styles = {
  container: { textAlign: 'center', padding: '20px', backgroundColor: '#0a1a12', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif' },
  title: { color: '#facc15', marginBottom: '20px', letterSpacing: '1px' },
  videoBox: { position: 'relative', width: '100%', maxWidth: '500px', margin: '0 auto', borderRadius: '12px', overflow: 'hidden', background: '#000', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
  video: { width: '100%', display: 'block' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.8)' },
  startBtn: { padding: '15px 30px', fontSize: '18px', backgroundColor: '#facc15', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#000' },
  badge: { position: 'absolute', top: 15, right: 15, padding: '8px 20px', background: '#facc15', color: '#000', borderRadius: '20px', fontWeight: 'bold', fontSize: '1.2rem', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' },
  statusRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '20px', gap: '10px' },
  dot: { width: '10px', height: '10px', borderRadius: '50%' },
  statusText: { color: '#888', fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '1px' },
  stopLink: { marginTop: '20px', background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem' }
};