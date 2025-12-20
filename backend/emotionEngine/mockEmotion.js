// backend/emotionEngine/mockEmotion.js
// ============================================
// 🧠 Mock Emotion Engine
// Returns emotion + recommendations
// ============================================

export function generateEmotion() {
  const emotions = ["happy", "calm", "sad", "focused", "stressed"];
  const emotion = emotions[Math.floor(Math.random() * emotions.length)];

  const recommendations = {
    outfit: "Relaxed neutral tones",
    food: "Warm protein-rich meal",
    music: "Low-tempo ambient",
    delivery: ["Nearby cafe", "Local sushi bar"],
  };

  return { emotion, recommendations };
}
