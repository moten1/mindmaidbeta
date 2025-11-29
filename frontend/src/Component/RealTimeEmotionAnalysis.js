import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function RealTimeEmotionAnalysis() {
  const [currentEmotion, setCurrentEmotion] = useState(null);
  const [emotionHistory, setEmotionHistory] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fps, setFps] = useState(2); // Start at 2 FPS
  const [bandwidth, setBandwidth] = useState('Low');
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const lastEmotionRef = useRef(null);
  const frameCountRef = useRef(0);

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
    } catch (error) {
      alert('Camera access denied. Please allow camera access.');
    }
  };

  // Capture frame and analyze
  const analyzeFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    // Convert to base64
    canvas.toBlob(async (blob) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Image = reader.result.split(',')[1];
        
        try {
          const response = await axios.post(`${API_URL}/api/emotion/detect`, {
            imageBase64: base64Image
          });

          if (response.data.success) {
            const newEmotion = response.data.mood;
            const confidence = response.data.confidence;

            // Only update if emotion changed significantly
            if (newEmotion !== lastEmotionRef.current) {
              lastEmotionRef.current = newEmotion;
              
              setCurrentEmotion({
                emotion: newEmotion,
                confidence: confidence,
                timestamp: new Date().toLocaleTimeString()
              });

              // Add to history
              setEmotionHistory(prev => [
                { emotion: newEmotion, confidence, time: new Date().toLocaleTimeString() },
                ...prev.slice(0, 9) // Keep last 10
              ]);

              // Adjust FPS based on emotion stability
              adjustFPS(true); // Emotion changed - increase FPS
            } else {
              adjustFPS(false); // Same emotion - decrease FPS
            }
          }
        } catch (error) {
          console.error('Analysis error:', error);
        }
      };
    }, 'image/jpeg', 0.8);
  };

  // Smart FPS adjustment
  const adjustFPS = (emotionChanged) => {
    setFps(current => {
      let newFps = current;
      
      if (emotionChanged) {
        // Emotion changed - increase FPS to catch rapid changes
        newFps = Math.min(current + 2, 20); // Max 20 FPS
        setBandwidth('High');
      } else {
        // Stable emotion - decrease FPS to save bandwidth
        newFps = Math.max(current - 0.5, 1); // Min 1 FPS
        
        if (newFps <= 2) setBandwidth('Low');
        else if (newFps <= 10) setBandwidth('Medium');
        else setBandwidth('High');
      }
      
      return newFps;
    });
  };

  // Start/Stop analysis
  const toggleAnalysis = () => {
    if (isAnalyzing) {
      // Stop
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setIsAnalyzing(false);
    } else {
      // Start
      startCamera();
      setIsAnalyzing(true);
    }
  };

  // Update interval when FPS changes
  useEffect(() => {
    if (isAnalyzing) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      
      const interval = 1000 / fps;
      intervalRef.current = setInterval(analyzeFrame, interval);
      
      frameCountRef.current++;
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAnalyzing, fps]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-extrabold text-gray-800">Real-Time Emotion Analysis</h1>
      
      <p className="text-lg text-gray-600">
        Continuous AI-powered emotion detection that adapts bandwidth based on mood changes.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Video Feed */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Live Camera Feed</h2>
          
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
                {currentEmotion.emotion.toUpperCase()} ({(currentEmotion.confidence * 100).toFixed(0)}%)
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={toggleAnalysis}
              className={`px-6 py-3 rounded-md font-semibold transition-colors ${
                isAnalyzing 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-yellow-400 hover:bg-yellow-500 text-white'
              }`}
            >
              {isAnalyzing ? '⏸️ Stop Analysis' : '▶️ Start Analysis'}
            </button>

            <div className="text-sm space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">FPS:</span>
                <span className="text-gray-600">{fps.toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Bandwidth:</span>
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  bandwidth === 'High' ? 'bg-red-100 text-red-700' :
                  bandwidth === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {bandwidth}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Current Emotion & History */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Emotion Tracking</h2>
          
          {currentEmotion ? (
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Current Emotion</p>
                <p className="text-3xl font-bold text-yellow-700 capitalize">
                  {currentEmotion.emotion}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Confidence: {(currentEmotion.confidence * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {currentEmotion.timestamp}
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Recent Changes</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {emotionHistory.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="capitalize font-medium">{item.emotion}</span>
                      <div className="text-right">
                        <span className="text-sm text-gray-600">{(item.confidence * 100).toFixed(0)}%</span>
                        <span className="text-xs text-gray-400 ml-2">{item.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 py-12">
              <p>Click "Start Analysis" to begin real-time emotion detection</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold text-gray-800 mb-2">📊 How it works:</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• <strong>Adaptive FPS:</strong> Increases to 20 FPS when emotions change, drops to 1 FPS when stable</li>
          <li>• <strong>Smart Bandwidth:</strong> Only sends frames when needed, saving data</li>
          <li>• <strong>Real-time Detection:</strong> Analyzes your face continuously using Hume AI</li>
          <li>• <strong>History Tracking:</strong> Keeps last 10 emotion changes for reference</li>
        </ul>
      </div>
    </div>
  );
}