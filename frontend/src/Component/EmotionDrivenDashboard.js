import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const WS_URL = API_URL.replace('http', 'ws');

export default function EmotionDrivenDashboard() {
  const [currentEmotion, setCurrentEmotion] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const streamRef = useRef(null);
  const frameIntervalRef = useRef(null);
  const lastEmotionRef = useRef(null);

  // Start camera and WebSocket connection
  const startAnalysis = async () => {
    try {
      // Start camera
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      videoRef.current.srcObject = stream;
      streamRef.current = stream;

      // Connect to WebSocket
      const ws = new WebSocket(`${WS_URL}/api/emotion/stream`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Connected to emotion stream');
        setConnectionStatus('connected');
        setIsAnalyzing(true);
        startFrameCapture();
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.success && data.dominantEmotion) {
            const emotion = data.dominantEmotion;
            const confidence = data.confidence;

            setCurrentEmotion({
              emotion,
              confidence,
              emotions: data.emotions,
              timestamp: new Date().toLocaleTimeString()
            });

            // If emotion changed significantly, get new recommendations
            if (emotion !== lastEmotionRef.current && confidence > 0.6) {
              lastEmotionRef.current = emotion;
              await fetchRecommendations(emotion);
            }
          }
        } catch (err) {
          console.error('Parse error:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        setConnectionStatus('disconnected');
        setIsAnalyzing(false);
      };

    } catch (error) {
      console.error('Camera access error:', error);
      alert('Camera access denied. Please allow camera access.');
    }
  };

  // Capture and send frames
  const startFrameCapture = () => {
    frameIntervalRef.current = setInterval(() => {
      if (!videoRef.current || !canvasRef.current || !wsRef.current) return;
      if (wsRef.current.readyState !== WebSocket.OPEN) return;

      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      // Convert to base64 and send
      canvas.toBlob((blob) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64 = reader.result.split(',')[1];
          wsRef.current.send(JSON.stringify({
            data: base64,
            models: { face: {} }
          }));
        };
      }, 'image/jpeg', 0.8);
    }, 1000); // 1 FPS to start
  };

  // Fetch AI recommendations based on emotion
  const fetchRecommendations = async (emotion) => {
    try {
      const [outfit, food, music] = await Promise.all([
        axios.post(`${API_URL}/api/ai/advice`, {
          query: `Suggest an outfit for someone feeling ${emotion}`,
          mood: emotion.toLowerCase(),
          type: 'clothes'
        }),
        axios.post(`${API_URL}/api/ai/advice`, {
          query: `Suggest food for someone feeling ${emotion}`,
          mood: emotion.toLowerCase(),
          type: 'meals'
        }),
        axios.post(`${API_URL}/api/ai/advice`, {
          query: `Suggest music for someone feeling ${emotion}`,
          mood: emotion.toLowerCase(),
          type: 'activity'
        })
      ]);

      setRecommendations({
        outfit: outfit.data.result,
        food: food.data.result,
        music: music.data.result
      });
    } catch (error) {
      console.error('Recommendations error:', error);
    }
  };

  // Stop analysis
  const stopAnalysis = () => {
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    if (wsRef.current) wsRef.current.close();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsAnalyzing(false);
    setConnectionStatus('disconnected');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAnalysis();
    };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-extrabold text-gray-800">🧠 MindMaid AI</h1>
      
      <p className="text-lg text-gray-600">
        Real-time facial emotion detection that automatically suggests what to wear, eat, and listen to!
      </p>

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
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline
              className="w-full rounded-lg border-2 border-gray-300"
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {currentEmotion && (
              <div className="absolute top-4 left-4 bg-yellow-400 text-gray-900 px-4 py-2 rounded-lg font-bold">
                😊 {currentEmotion.emotion.toUpperCase()} ({(currentEmotion.confidence * 100).toFixed(0)}%)
              </div>
            )}
          </div>

          <button
            onClick={isAnalyzing ? stopAnalysis : startAnalysis}
            className={`mt-4 w-full font-semibold px-6 py-3 rounded-md transition-colors ${
              isAnalyzing 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-yellow-400 hover:bg-yellow-500 text-white'
            }`}
          >
            {isAnalyzing ? '⏸️ Stop Analysis' : '▶️ Start Emotion Detection'}
          </button>
        </div>

        {/* AI Recommendations */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">AI Recommendations</h2>
          
          {currentEmotion ? (
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Current Mood</p>
                <p className="text-3xl font-bold text-yellow-700 capitalize">
                  {currentEmotion.emotion}
                </p>
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