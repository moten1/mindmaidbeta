import React, { useState, useRef } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function EmotionAnalysis() {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [image, setImage] = useState(null);
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      videoRef.current.srcObject = mediaStream;
      setStream(mediaStream);
    } catch (error) {
      alert('Camera access denied. Please allow camera access.');
    }
  };

  const capturePhoto = () => {
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    
    canvas.toBlob(async (blob) => {
      setImage(URL.createObjectURL(blob));
      await analyzeEmotion(blob);
    }, 'image/jpeg');
  };

  const analyzeEmotion = async (imageBlob) => {
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('image', imageBlob, 'selfie.jpg');

      const response = await axios.post(`${API_URL}/api/emotion/analyze`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setResult(response.data);
    } catch (error) {
      console.error('Emotion analysis error:', error);
      alert('Failed to analyze emotion. Please try again.');
    } finally {
      setAnalyzing(false);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }
  };

  const resetAnalysis = () => {
    setResult(null);
    setImage(null);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-extrabold text-gray-800">Emotion Analysis</h1>
      
      <p className="text-lg text-gray-600">
        Let AI analyze your facial expression to understand your mood and get personalized recommendations!
      </p>

      {!result && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Capture Your Expression</h2>
          
          <div className="flex flex-col items-center gap-4">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline
              className="w-full max-w-md rounded-lg border-2 border-gray-300"
            />
            
            {!stream ? (
              <button
                onClick={startCamera}
                className="bg-yellow-400 text-white font-semibold px-6 py-3 rounded-md hover:bg-yellow-500 transition-colors"
              >
                📸 Start Camera
              </button>
            ) : (
              <button
                onClick={capturePhoto}
                disabled={analyzing}
                className="bg-yellow-400 text-white font-semibold px-6 py-3 rounded-md hover:bg-yellow-500 transition-colors disabled:bg-gray-300"
              >
                {analyzing ? 'Analyzing...' : '✨ Capture & Analyze'}
              </button>
            )}
          </div>

          <p className="text-sm text-gray-500 mt-4 text-center">
            Your image is processed securely and not stored.
          </p>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-2xl font-semibold mb-4">Your Emotion Analysis</h3>
            
            {image && (
              <img src={image} alt="Your selfie" className="w-full max-w-md mx-auto rounded-lg mb-4" />
            )}

            <div className="space-y-3">
              <div className="p-4 bg-yellow-50 rounded-lg">
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
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="font-semibold text-gray-800 mb-2">AI Recommendation:</p>
                  <p className="text-gray-700">{result.recommendation}</p>
                </div>
              )}
            </div>

            <button
              onClick={resetAnalysis}
              className="mt-4 w-full bg-gray-400 text-white font-semibold px-6 py-3 rounded-md hover:bg-gray-500 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}