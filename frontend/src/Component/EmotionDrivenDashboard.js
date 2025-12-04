import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const WS_URL = API_URL.replace(/^http/, 'ws');
const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const MIN_FPS = 1;
const MAX_FPS = 20;
const FPS_STEP = 2;

export default function EmotionDrivenDashboard() {
  const [currentEmotion, setCurrentEmotion] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [emotionHistory, setEmotionHistory] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [fps, setFps] = useState(5);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const streamRef = useRef(null);
  const frameIntervalRef = useRef(null);
  const inactivityTimerRef = useRef(null);
  const lastEmotionRef = useRef(null);
  const userLocationRef = useRef(null);

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
    } catch (err) {
      alert('Camera access denied. Please allow camera access.');
      console.error('Camera error:', err);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    }
  };

  // Reset inactivity timer
  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(stopAnalysis, INACTIVITY_TIMEOUT);
  };

  // Adjust FPS based on emotion change
  const adjustFPS = (emotionChanged) => {
    setFps(prev => {
      let newFps = prev;
      if (emotionChanged) {
        newFps = Math.min(prev + FPS_STEP, MAX_FPS);
      } else {
        newFps = Math.max(prev - 0.5, MIN_FPS);
      }
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = setInterval(captureFrame, 1000 / newFps);
      }
      return newFps;
    });
  };

  // Capture frames and send via WebSocket
  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current || wsRef.current?.readyState !== WebSocket.OPEN) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(blob => {
      if (!blob) return;
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        wsRef.current.send(JSON.stringify({ data: base64, models: { face: {} } }));
      };
    }, 'image/jpeg', 0.8);
  };

  // Start WebSocket and frame capture
  const startAnalysis = async () => {
    await startCamera();

    const ws = new WebSocket(`${WS_URL}/api/emotion/stream`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ Connected to WebSocket');
      setConnectionStatus('connected');
      setIsAnalyzing(true);
      frameIntervalRef.current = setInterval(captureFrame, 1000 / fps);
    };

    ws.onmessage = async (event) => {
      try {
        const data = event.data instanceof Blob ? JSON.parse(await event.data.text()) : JSON.parse(event.data);

        if (data.success && data.dominantEmotion && data.recommendation) {
          const emotion = data.dominantEmotion;
          const emotionChanged = lastEmotionRef.current !== emotion;
          lastEmotionRef.current = emotion;

          setCurrentEmotion({ emotion, timestamp: new Date().toLocaleTimeString() });
          setEmotionHistory(prev => [{ emotion, timestamp: new Date().toLocaleTimeString() }, ...prev.slice(0, 9)]);

          adjustFPS(emotionChanged);
          setRecommendations(data.recommendation);
        }
      } catch (err) {
        console.error('WS parse error:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      setConnectionStatus('error');
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
      setConnectionStatus('disconnected');
      setIsAnalyzing(false);
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    };
  };

  // Stop analysis
  const stopAnalysis = () => {
    stopCamera();
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    if (wsRef.current) wsRef.current.close();
    setIsAnalyzing(false);
    setConnectionStatus('disconnected');
  };

  // Location handler for food suggestions
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      userLocationRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    });
  }, []);

  // Inactivity listeners
  useEffect(() => {
    const events = ['mousemove', 'keydown', 'touchstart'];
    events.forEach(evt => window.addEventListener(evt, resetInactivityTimer));
    resetInactivityTimer();
    return () => {
      events.forEach(evt => window.removeEventListener(evt, resetInactivityTimer));
      stopAnalysis();
    };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-extrabold">🧠 MindMaid AI</h1>
      <p>Real-time emotion detection with AI suggestions for outfit, food, music, and local restaurants!</p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Video Feed */}
        <div className="bg-white p-6 rounded shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Live Analysis</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              connectionStatus === 'connected' ? 'bg-green-100 text-green-700' :
              connectionStatus === 'error' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }`}>{connectionStatus.toUpperCase()}</span>
          </div>

          <div className="relative">
            <video ref={videoRef} autoPlay playsInline className="w-full rounded border" />
            <canvas ref={canvasRef} className="hidden" />
            {currentEmotion && (
              <div className="absolute top-2 left-2 bg-yellow-400 px-3 py-1 rounded font-bold">
                {currentEmotion.emotion.toUpperCase()} ({currentEmotion.timestamp})
              </div>
            )}
          </div>

          <button
            onClick={isAnalyzing ? stopAnalysis : startAnalysis}
            className={`mt-4 w-full py-3 rounded font-semibold text-white ${
              isAnalyzing ? 'bg-red-500 hover:bg-red-600' : 'bg-yellow-400 hover:bg-yellow-500'
            }`}
          >
            {isAnalyzing ? '⏸️ Stop Analysis' : '▶️ Start Emotion Detection'}
          </button>

          <div className="mt-2 text-sm text-gray-600">FPS: {fps.toFixed(1)}</div>
        </div>

        {/* Recommendations */}
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-2xl font-semibold mb-4">AI Recommendations</h2>
          {currentEmotion ? (
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 rounded">
                <p className="text-sm text-gray-600">Current Mood</p>
                <p className="text-3xl font-bold text-yellow-700 capitalize">{currentEmotion.emotion}</p>
                <p className="text-xs text-gray-400">{currentEmotion.timestamp}</p>
              </div>

              {recommendations && (
                <>
                  <div className="p-4 bg-blue-50 rounded">
                    <h3 className="font-semibold">👔 Outfit</h3>
                    <p>{recommendations.outfit}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded">
                    <h3 className="font-semibold">🍽️ Food</h3>
                    <p>{recommendations.food}</p>
                    {recommendations.nearbyRestaurants?.length > 0 && (
                      <ul className="mt-2 text-sm list-disc pl-5">
                        {recommendations.nearbyRestaurants.map((r, i) => (
                          <li key={i}>{r.name} - {r.rating || 'N/A'}⭐</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="p-4 bg-purple-50 rounded">
                    <h3 className="font-semibold">🎵 Music</h3>
                    <p>{recommendations.music}</p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-12">
              <p>Click "Start Emotion Detection" to begin</p>
              <p className="text-sm mt-2">AI will analyze your face and suggest outfit, food & music</p>
            </div>
          )}
        </div>
      </div>

      {emotionHistory.length > 0 && (
        <div className="bg-white p-6 rounded shadow mt-4 max-w-md mx-auto">
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
