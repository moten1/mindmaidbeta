// backend/emotionEngine/mockEmotion.js
// ============================================
// 🧠 Mock Emotion Engine (Phase 1.0)
// Returns emotion + confidence + recommendations
// Ready for integration with WebSocket proxy
// ============================================

/**
 * Generate a mock emotion with recommendations
 * @returns {Object} { emotion, confidence, recommendations }
 */
export function generateEmotion() {
  const emotions = ["happy", "calm", "sad", "focused", "stressed"];
  const emotion = emotions[Math.floor(Math.random() * emotions.length)];

  // Confidence between 0.5 and 1
  const confidence = Math.random() * 0.5 + 0.5;

  const recommendations = {
    outfit: "Relaxed neutral tones",
    food: "Warm protein-rich meal",
    music: "Low-tempo ambient",
    delivery: ["Nearby cafe", "Local sushi bar"],
  };

  return { emotion, confidence, recommendations };
}
