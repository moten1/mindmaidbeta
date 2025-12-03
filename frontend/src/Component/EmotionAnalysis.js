import React, { useState, useRef, useEffect } from 'react';

const API_WS_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000')
  .replace(/^http/, 'ws') + '/api/emotion/stream';
const CAPTURE_INTERVAL = 2000; // 2 seconds
const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export default function EmotionAnalysis() {
  const [result, setResult] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const wsRef = useRef(null);
  const inactivityTimerRef = useRef(null);

  // ---------------------------
  // 1️⃣ Camera Handling
  // ---------------------------
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      videoRef.current.srcObject = mediaStream;
      streamRef.current = mediaStream;
    } catch (err) {
      alert('Camera access denied. Please allow camera access.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  // ---------------------------
  // 2️⃣ WebSocket Setup
  // ---------------------------
  const initWebSocket = () => {
    wsRef.current = new WebSocket(API_WS_URL);

    wsRef.current.onopen = () => console.log('✅ Emotion WebSocket connected');

    wsRef.current.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        setResult(data);
      } catch (err) {
        console.error('Failed to parse WS message:', err);
      }
    };

    wsRef.current.onerror = (err) => {
      console.error('❌ WebSocket error:', err);
    };

    wsRef.current.onclose = () => console.log('🛑 Emotion WebSocket closed');
  };

  // ---------------------------
  // 3️⃣ Frame Capture & Send
  // ---------------------------
  const captureAndSendFrame = () => {
    if (!videoRef.current || !streamRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);

    canvas.toBlob((blob) => {
      if (blob && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(blob);
      }
    }, 'image/jpeg');
  };

  // ---------------------------
  // 4️⃣ Inactivity Handling
  // ---------------------------
  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      stopCamera();
      wsRef.current?.close();
    }, INACTIVITY_TIMEOUT);
  };

  // ---------------------------
  // 5️⃣ Effects
  // ---------------------------
  useEffect(() => {
    startCamera();
    initWebSocket();
    resetInactivityTimer();

    const events = ['mousemove', 'keydown', 'touchstart'];
    events.forEach(evt => window.addEventListener(evt, resetInactivityTimer));

    const interval = setInterval(captureAndSendFrame, CAPTURE_INTERVAL);

    return () => {
      stopCamera();
      wsRef.current?.close();
      clearInterval(interval);
      events.forEach(evt => window.removeEventListener(evt, resetInactivityTimer));
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, []);

  // ---------------------------
  // 6️⃣ UI
  // ---------------------------
  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-extrabold text-gray-800">Live Emotion Dashboard</h1>
      <p className="text-lg text-gray-600">
        Your facial expression is analyzed continuously. Move, smile, or frown — watch your emotion update live!
      </p>

      <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center gap-4">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full max-w-md rounded-lg border-2 border-gray-300"
        />

        {result && (
          <div className="w-full max-w-md mt-4">
            <div className="p-4 bg-yellow-50 rounded-lg mb-2">
              <p className="font-semibold text-gray-800">Detected Mood:</p>
              <p className="text-xl text-yellow-700">{result.dominantEmotion || 'Analyzing...'}</p>
            </div>

            {result.emotions && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-semibold text-gray-800 mb-2">Emotion Breakdown:</p>
                {Object.entries(result.emotions).map(([emotion, score]) => (
                  <div key={emotion} className="flex justify-between items-center mb-1">
                    <span className="capitalize">{emotion}</span>
                    <span className="text-gray-600">{(score * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            )}

            {result.recommendation && (
              <div className="p-4 bg-blue-50 rounded-lg mt-2">
                <p className="font-semibold text-gray-800 mb-2">AI Recommendation:</p>
                <p className="text-gray-700">{result.recommendation}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
