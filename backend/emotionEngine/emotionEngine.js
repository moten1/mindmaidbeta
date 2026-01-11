// backend/emotionEngine/mockBiometrics.js
// ============================================
// 🩺 Mock Biometric Data Generator (Phase 0.5)
// ============================================

export function generateBiometrics() {
  return {
    timestamp: Date.now(),                              // current time in ms
    heartRate: 60 + Math.floor(Math.random() * 41),    // 60–100 bpm
    breathingRate: 12 + Math.floor(Math.random() * 9), // 12–20 breaths/min
    posture: ["upright", "slouching", "leaning"][Math.floor(Math.random() * 3)],
    eegLevel: Number(Math.random().toFixed(2)),        // normalized 0–1
    stressLevel: Number(Math.random().toFixed(2)),     // normalized 0–1
    skinTemp: Number((36 + Math.random() * 2).toFixed(1)), // optional 36–38°C
  };
}
