import React, { useState, useRef, useEffect } from 'react';

const WS_URL = process.env.REACT_APP_API_URL_WS || 'ws://localhost:5000/api/emotion/stream';
const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 min
const MIN_FPS = 1;
const MAX_FPS = 20;
const FPS_STEP = 2;

export default function EmotionDrivenDashboard() {
  const [currentEmotion, setCurrentEmotion] = useState(null);
  const [emotionHistory, setEmotionHistory] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [fps, setFps] = useState(5);
  const [bandwidth, setBandwidth] = useState('Medium');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const wsRef = useRef(null);
  const inactivityTimerRef = useRef(null);
  const captureIntervalRef = useRef(null);
  const lastEmotionRef = useRef(null);
  const userLocationRef = useRef(null);

  // --- Camera setup ---
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
    } catch (err) {
      alert('Camera access denied. Please allow camera access.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    }
  };

  // --- Inactivity Timer ---
  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => stopStreaming(), INACTIVITY_TIMEOUT);
  };

  // --- Adaptive FPS ---
  const adjustFPS = (emotionChanged) => {
    setFps(prev => {
      let newFps = prev;
      if (emotionChanged) {
        newFps = Math.min(prev + FPS_STEP, MAX_FPS);
        setBandwidth('High');
      } else {
        newFps = Math.max(prev - 0.5, MIN_FPS);
        setBandwidth(newFps <= 2 ? 'Low' : newFps <= 10 ? 'Medium' : 'High');
      }
      return newFps;
    });
  };

  // --- WebSocket streaming ---
  const startStreaming = async () => {
    await startCamera();

    const ws = new WebSocket(WS_URL);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      console.log('✅ Connected to WS stream');
      setIsStreaming(true);

      // Send location if available
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
          const loc = { type: "location", lat: pos.coords.latitude, lng: pos.coords.longitude };
          userLocationRef.current = loc;
          ws.send(JSON.stringify(loc));
        });
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.emotion) {
          const emotionChanged = lastEmotionRef.current !== data.emotion;
          lastEmotionRef.current = data.emotion;

          setCurrentEmotion(data);
          adjustFPS(emotionChanged);

          // Update history (last 10)
          setEmotionHistory(prev => [
            { ...data, timestamp: new Date().toLocaleTimeString() },
            ...prev.slice(0, 9)
          ]);
        }
      } catch (err) {
        console.error('Invalid WS message:', err);
      }
    };

    ws.onerror = (err) => console.error('WebSocket error:', err);
    ws.onclose = () => {
      console.log('⚠️ WebSocket closed');
      setIsStreaming(false);
    };

    wsRef.current = ws;

    // --- Frame capture ---
    const captureFrames = () => {
      if (!videoRef.current || ws.readyState !== WebSocket.OPEN) return;
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d').drawImage(videoRef.current, 0, 0);

      canvas.toBlob(blob => {
        if (blob && ws.readyState === WebSocket.OPEN) ws.send(blob);
      }, 'image/jpeg', 0.8);
    };

    captureIntervalRef.current = setInterval(captureFrames, 1000 / fps);
  };

  // --- Update interval dynamically ---
  useEffect(() => {
    if (captureIntervalRef.current && isStreaming) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = setInterval(() => {
        if (videoRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
          const canvas = document.createElement('canvas');
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
          canvas.toBlob(blob => {
            if (blob && wsRef.current.readyState === WebSocket.OPEN) wsRef.current.send(blob);
          }, 'image/jpeg', 0.8);
        }
      }, 1000 / fps);
    }
    return () => clearInterval(captureIntervalRef.current);
  }, [fps, isStreaming]);

  const stopStreaming = () => {
    stopCamera();
    if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
    if (wsRef.current) wsRef.current.close();
    setIsStreaming(false);
  };

  // --- Inactivity event listeners ---
  useEffect(() => {
    const events = ['mousemove', 'keydown', 'touchstart'];
    events.forEach(evt => window.addEventListener(evt, resetInactivityTimer));
    resetInactivityTimer();

    return () => {
      events.forEach(evt => window.removeEventListener(evt, resetInactivityTimer));
      stopStreaming();
    };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-extrabold text-gray-800">Emotion Dashboard</h1>
      <p className="text-lg text-gray-600">Live emotion detection with AI recommendations for outfit, music, and food.</p>

      <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center gap-4">
        <video ref={videoRef} autoPlay playsInline className="w-full max-w-md rounded-lg border-2 border-gray-300" />

        {currentEmotion && (
          <div className="mt-4 w-full max-w-md space-y-2">
            <div className="p-4 bg-yellow-50 rounded-lg">
              <p className="font-semibold text-gray-800">Detected Mood:</p>
              <p className="text-xl text-yellow-700">{currentEmotion.emotion}</p>
            </div>

            {currentEmotion.recommendations && (
              <div className="p-4 bg-blue-50 rounded-lg mt-2 space-y-2">
                <p className="font-semibold text-gray-800">AI Recommendations:</p>
                <p>Outfit: {currentEmotion.recommendations.outfit}</p>
                <p>Music: {currentEmotion.recommendations.music}</p>
                <p>Food: {currentEmotion.recommendations.food}</p>

                {currentEmotion.recommendations.nearbyRestaurants?.length > 0 && (
                  <div>
                    <p className="font-semibold mt-2">Nearby Restaurants:</p>
                    <ul className="list-disc list-inside">
                      {currentEmotion.recommendations.nearbyRestaurants.map((r, idx) => (
                        <li key={idx}>
                          {r.name} — {r.address} ({r.rating || 'N/A'} ⭐)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <button
          onClick={isStreaming ? stopStreaming : startStreaming}
          className={`mt-4 px-6 py-3 rounded-md font-semibold text-white ${
            isStreaming ? 'bg-red-500 hover:bg-red-600' : 'bg-yellow-400 hover:bg-yellow-500'
          }`}
        >
          {isStreaming ? '⏸️ Stop Stream' : '▶️ Start Stream'}
        </button>

        <div className="mt-2 flex gap-4 text-sm text-gray-600">
          <div>FPS: {fps.toFixed(1)}</div>
          <div>Bandwidth: {bandwidth}</div>
        </div>
      </div>

      {emotionHistory.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md mt-4 max-w-md mx-auto">
          <h2 className="text-2xl font-semibold mb-2">Emotion History</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {emotionHistory.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="capitalize font-medium">{item.emotion}</span>
                <span className="text-xs text-gray-400">{item.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
