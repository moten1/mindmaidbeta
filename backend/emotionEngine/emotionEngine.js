// backend/emotionEngine/mockBiometrics.js
// ============================================
// 🩺 Mock Biometric Data (Phase 0.4)
// ============================================

export function generateBiometrics() {
  return {
    heartRate: 60 + Math.floor(Math.random() * 40),       // 60–100 bpm
    breathingRate: 12 + Math.floor(Math.random() * 8),   // 12–20 breaths/min
    posture: ["upright", "slouching", "leaning"][Math.floor(Math.random() * 3)],
    eegLevel: Math.random().toFixed(2),                  // 0–1 normalized
    stressLevel: Math.random().toFixed(2),              // 0–1 normalized
  };
}
