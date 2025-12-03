import React, { useState, useRef, useEffect } from 'react';

const WS_URL = process.env.REACT_APP_API_URL_WS || 'ws://localhost:5000/api/emotion/stream';
const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const MIN_FPS = 1; // min frame per second when emotions stable
const MAX_FPS = 20; // max FPS when emotions change rapidly
const FPS_STEP = 2; // increment/decrement FPS

export default function LiveEmotionStreamAdaptive() {
  const [currentEmotion, setCurrentEmotion] = useState(null);
  const [emotionHistory, setEmotionHistory] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [fps, setFps] = useState(5); // start FPS
  const [bandwidth, setBandwidth] = useState('Medium');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const wsRef = useRef(null);
  const inactivityTimerRef = useRef(null);
  const captureIntervalRef = useRef(null);
  const lastEmotionRef = useRef(null);

  // --- CAMERA SETUP ---
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

  // --- INACTIVITY TIMER ---
  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => stopStreaming(), INACTIVITY_TIMEOUT);
  };

  // --- FPS ADAPTATION ---
  const adjustFPS = (emotionChanged) => {
    setFps(prev => {
      let newFps = prev;
      if (emotionChanged) {
        newFps = Math.min(prev + FPS_STEP, MAX_FPS);
        setBandwidth('High');
      } else {
        newFps = Math.max(prev - 0.5, MIN_FPS);
        if (newFps <= 2) setBandwidth('Low');
        else if (newFps <= 10) setBandwidth('Medium');
        else setBandwidth('High');
      }
      return newFps;
    });
  };

  // --- WEBSOCKET STREAM ---
  const startStreaming = async () => {
    await startCamera();

    const ws = new WebSocket(WS_URL);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      console.log('✅ Connected to Hume WS stream');
      setIsStreaming(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.dominantEmotion) {
          const emotionChanged = lastEmotionRef.current !== data.dominantEmotion;
          lastEmotionRef.current = data.dominantEmotion;

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

    // --- CONTINUOUS FRAME CAPTURE ---
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

    // Start interval
    captureIntervalRef.current = setInterval(captureFrames, 1000 / fps);
  };

  // Update interval dynamically
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

  // --- INACTIVITY EVENT LISTENERS ---
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
      <h1 className="text-4xl font-extrabold text-gray-800">Live Emotion Stream</h1>
      <p className="text-lg text-gray-600">Continuous AI-powered facial emotion detection with adaptive bandwidth.</p>

      <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center gap-4">
        <video ref={videoRef} autoPlay playsInline className="w-full max-w-md rounded-lg border-2 border-gray-300" />

        {currentEmotion && (
          <div className="mt-4 w-full max-w-md space-y-2">
            <div className="p-4 bg-yellow-50 rounded-lg">
              <p className="font-semibold text-gray-800">Detected Mood:</p>
              <p className="text-xl text-yellow-700">{currentEmotion.dominantEmotion}</p>
            </div>

            {currentEmotion.emotions && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-semibold text-gray-800 mb-2">Emotion Breakdown:</p>
                {Object.entries(currentEmotion.emotions).map(([emo, score]) => (
                  <div key={emo} className="flex justify-between mb-1">
                    <span className="capitalize">{emo}</span>
                    <span className="text-gray-600">{(score * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            )}

            {currentEmotion.recommendation && (
              <div className="p-4 bg-blue-50 rounded-lg mt-2">
                <p className="font-semibold text-gray-800 mb-2">AI Recommendation:</p>
                <p className="text-gray-700">{currentEmotion.recommendation}</p>
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
                <span className="capitalize font-medium">{item.dominantEmotion}</span>
                <span className="text-xs text-gray-400">{item.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
