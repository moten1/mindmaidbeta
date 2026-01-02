import React, { useRef, useState, useEffect, useCallback } from "react";

/* ======================================================
   STRICT ENV CONFIG (REVISED FOR PRODUCTION)
====================================================== */
const getWsUrl = () => {
  const host = process.env.REACT_APP_WS_URL_PROD || process.env.REACT_APP_WS_URL || window.location.origin.replace(/^http/, 'ws');
  const path = process.env.REACT_APP_WS_PATH || "/api/emotion/stream";
  
  // Clean the host and force WSS in production
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
  const lastEmotionRef = useRef(null);
  const runningRef = useRef(false);
  const fpsRef = useRef(DEFAULT_FPS);

  const [status, setStatus] = useState("disconnected");
  const [running, setRunning] = useState(false);
  const [emotion, setEmotion] = useState(null);

  /* ======================================================
     CAMERA LOGIC
  ====================================================== */
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("❌ Camera Error:", err);
      setStatus("camera_error");
      throw err;
    }
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

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => blob && ws.send(blob), "image/jpeg", 0.6);
  };

  const connectWS = () => {
    if (!runningRef.current) return;
    const WS_URL = getWsUrl();
    
    setStatus("connecting");
    const ws = new WebSocket(WS_URL);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      frameTimerRef.current = setInterval(sendFrame, 1000 / fpsRef.current);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.emotion) setEmotion(data.emotion);
      } catch (e) { /* ignore non-json */ }
    };

    ws.onclose = () => {
      clearInterval(frameTimerRef.current);
      if (runningRef.current) setTimeout(connectWS, RECONNECT_DELAY);
      setStatus("disconnected");
    };
  };

  const start = async () => {
    try {
      runningRef.current = true;
      setRunning(true);
      await startCamera();
      connectWS();
    } catch (e) {
      stop();
    }
  };

  const stop = useCallback(() => {
    runningRef.current = false;
    clearInterval(frameTimerRef.current);
    wsRef.current?.close();
    stopCamera();
    setRunning(false);
    setStatus("disconnected");
  }, []);

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

      <canvas ref={canvasRef} style={{ display: "none" }} />
      <p style={{ color: '#888' }}>Status: {status}</p>
    </div>
  );
}

const styles = {
  container: { textAlign: 'center', padding: '20px', backgroundColor: '#0a1a12', minHeight: '100vh', color: 'white' },
  title: { color: '#facc15', marginBottom: '20px' },
  videoBox: { position: 'relative', width: '100%', maxWidth: '500px', margin: '0 auto', borderRadius: '12px', overflow: 'hidden', background: '#000' },
  video: { width: '100%', display: 'block' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.7)' },
  startBtn: { padding: '15px 30px', fontSize: '18px', backgroundColor: '#facc15', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  badge: { position: 'absolute', top: 10, right: 10, padding: '5px 15px', background: '#facc15', color: '#000', borderRadius: '5px', fontWeight: 'bold' }
};