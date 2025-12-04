import React, { useState, useRef, useEffect } from 'react';

const WS_URL = process.env.REACT_APP_API_URL_WS || 'ws://localhost:5000/api/emotion/stream';
const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export default function EmotionDrivenDashboard() {
  const [currentEmotion, setCurrentEmotion] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [fps, setFps] = useState(5);
  const [bandwidth, setBandwidth] = useState('Medium');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const streamRef = useRef(null);
  const frameIntervalRef = useRef(null);
  const lastEmotionRef = useRef(null);
  const inactivityTimerRef = useRef(null);

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
    inactivityTimerRef.current = setTimeout(stopAnalysis, INACTIVITY_TIMEOUT);
  };

  // --- ADAPTIVE FPS ---
  const adjustFPS = (emotionChanged) => {
    setFps(prev => {
      let newFps = prev;
      if (emotionChanged) {
        newFps = Math.min(prev + 2, 20);
        setBandwidth('High');
      } else {
        newFps = Math.max(prev - 0.5, 1);
        setBandwidth(newFps <= 2 ? 'Low' : newFps <= 10 ? 'Medium' : 'High');
      }
      return newFps;
    });
  };

  // --- START EMOTION STREAM ---
  const startAnalysis = async () => {
    await startCamera();
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ Connected to emotion stream');
      setConnectionStatus('connected');
      setIsAnalyzing(true);
      startFrameCapture();
      resetInactivityTimer();
    };

    ws.onmessage = (event) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : null;
        if (!data) return;

        const emotion = data.emotion || 'unknown';
        lastEmotionRef.current = lastEmotionRef.current || '';
        const emotionChanged = lastEmotionRef.current !== emotion;

        setCurrentEmotion({
          emotion,
          timestamp: new Date().toLocaleTimeString(),
          ...data
        });

        adjustFPS(emotionChanged);

        if (emotionChanged) {
          lastEmotionRef.current = emotion;
          setRecommendations(data.recommendations || null);
        }
      } catch (err) {
        console.error('WS parse error:', err);
      }
    };

    ws.onerror = (err) => { console.error('WS error:', err); setConnectionStatus('error'); };
    ws.onclose = () => { console.log('WS closed'); setConnectionStatus('disconnected'); setIsAnalyzing(false); };
  };

  // --- CAPTURE FRAMES ---
  const startFrameCapture = () => {
    frameIntervalRef.current = setInterval(() => {
      if (!videoRef.current || !canvasRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);

      canvas.toBlob(blob => {
        if (blob) wsRef.current.send(blob);
      }, 'image/jpeg', 0.8);
    }, 1000 / fps);
  };

  // --- STOP ANALYSIS ---
  const stopAnalysis = () => {
    stopCamera();
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    if (wsRef.current) wsRef.current.close();
    setIsAnalyzing(false);
    setConnectionStatus('disconnected');
  };

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetInactivityTimer));
    return () => { stopAnalysis(); events.forEach(e => window.removeEventListener(e, resetInactivityTimer)); };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-extrabold text-gray-800">🧠 MindMaid AI</h1>
      <p className="text-lg text-gray-600">Real-time facial emotion detection with instant outfit, food & music recommendations.</p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Video Feed */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Live Analysis</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              connectionStatus === 'connected' ? 'bg-green-100 text-green-700' :
              connectionStatus === 'error' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {connectionStatus.toUpperCase()}
            </span>
          </div>

          <div className="relative">
            <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg border-2 border-gray-300" />
            <canvas ref={canvasRef} className="hidden" />

            {currentEmotion && (
              <div className="absolute top-4 left-4 bg-yellow-400 text-gray-900 px-4 py-2 rounded-lg font-bold">
                😊 {currentEmotion.emotion.toUpperCase()}
              </div>
            )}
          </div>

          <button onClick={isAnalyzing ? stopAnalysis : startAnalysis}
            className={`mt-4 w-full font-semibold px-6 py-3 rounded-md transition-colors ${
              isAnalyzing ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-yellow-400 hover:bg-yellow-500 text-white'
            }`}>
            {isAnalyzing ? '⏸️ Stop Analysis' : '▶️ Start Emotion Detection'}
          </button>

          <div className="mt-2 flex gap-4 text-sm text-gray-600">
            <div>FPS: {fps.toFixed(1)}</div>
            <div>Bandwidth: {bandwidth}</div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">AI Recommendations</h2>
          {currentEmotion ? (
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Current Mood</p>
                <p className="text-3xl font-bold text-yellow-700 capitalize">{currentEmotion.emotion}</p>
                <p className="text-xs text-gray-400 mt-1">{currentEmotion.timestamp}</p>
              </div>
              {recommendations && (
                <div className="space-y-3">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-gray-800 mb-1">👔 Outfit</h3>
                    <p className="text-sm text-gray-700">{recommendations.outfit}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h3 className="font-semibold text-gray-800 mb-1">🍽️ Food</h3>
                    <p className="text-sm text-gray-700">{recommendations.food}</p>
                    {recommendations.nearbyRestaurants && recommendations.nearbyRestaurants.length > 0 && (
                      <ul className="mt-2 text-xs text-gray-600 list-disc list-inside">
                        {recommendations.nearbyRestaurants.map((r, idx) => (
                          <li key={idx}>{r.name} ({r.rating || 'N/A'}) - {r.address}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h3 className="font-semibold text-gray-800 mb-1">🎵 Music</h3>
                    <p className="text-sm text-gray-700">{recommendations.music}</p>
                  </div>
                </div>
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
    </div>
  );
}
