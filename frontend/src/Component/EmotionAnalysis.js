import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const CAPTURE_INTERVAL = 4000; // 4 seconds per frame, adjust as needed

export default function RealTimeEmotionAnalysis() {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [image, setImage] = useState(null);
  const [toast, setToast] = useState("");
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const intervalRef = useRef(null);

  // Toast helper
  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 3000);
  };

  // Start camera and auto-capture
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      videoRef.current.srcObject = mediaStream;
      setStream(mediaStream);

      // Start continuous capture
      intervalRef.current = setInterval(captureFrame, CAPTURE_INTERVAL);
    } catch (error) {
      showToast("Camera access denied. Please allow camera access.");
    }
  };

  // Capture a frame and send to backend
  const captureFrame = async () => {
    if (!videoRef.current || analyzing) return;

    const canvas = document.createElement("canvas");
    const width = 480;
    const height = (videoRef.current.videoHeight / videoRef.current.videoWidth) * 480;
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0, width, height);

    canvas.toBlob(async (blob) => {
      setImage(URL.createObjectURL(blob));
      await analyzeEmotion(blob);
    }, "image/jpeg");
  };

  // Send frame to backend for Hume AI analysis
  const analyzeEmotion = async (imageBlob) => {
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("image", imageBlob, "selfie.jpg");

      const response = await axios.post(`${API_URL}/api/emotion/analyze`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResult(response.data);
    } catch (error) {
      console.error("Emotion analysis error:", error);
      showToast("Failed to analyze emotion. Retrying...");
    } finally {
      setAnalyzing(false);
    }
  };

  // Stop camera and cleanup
  const stopCamera = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setResult(null);
    setImage(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div className="relative space-y-6">
      {/* Full-screen loader overlay */}
      {analyzing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-24 h-24 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 bg-yellow-400 text-white px-4 py-2 rounded-md shadow-lg z-50 animate-fadein">
          {toast}
        </div>
      )}

      <h1 className="text-4xl font-extrabold text-gray-800">Real-Time Emotion Analysis</h1>
      <p className="text-lg text-gray-600">
        The AI analyzes your facial expressions continuously and updates personalized suggestions for mood, outfit, food, and music.
      </p>

      <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center gap-4">
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
            onClick={stopCamera}
            className="bg-gray-400 text-white font-semibold px-6 py-3 rounded-md hover:bg-gray-500 transition-colors"
          >
            🛑 Stop Camera
          </button>
        )}
        <p className="text-sm text-gray-500 mt-4 text-center">
          Your image is processed securely and not stored.
        </p>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-2xl font-semibold mb-4">Current Emotion & Suggestions</h3>

            {image && (
              <img
                src={image}
                alt="Live selfie"
                className="w-full max-w-md mx-auto rounded-lg mb-4"
              />
            )}

            <div className="space-y-3">
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="font-semibold text-gray-800">Detected Mood:</p>
                <p className="text-xl text-yellow-700">{result.dominantEmotion || "Analyzing..."}</p>
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
          </div>
        </div>
      )}
    </div>
  );
}
