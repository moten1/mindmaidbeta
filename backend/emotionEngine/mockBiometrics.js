// backend/emotionEngine/mockBiometrics.js
// ============================================
// 🩺 Mock Biometric Data (Phase 1.1)
// Named export only — compatible with Node ESM
// ============================================

/**
 * Generate mock biometric data
 * @returns {Object} Biometric readings
 */
export function generateBiometrics() {
  return {
    heartRate: Math.floor(Math.random() * (120 - 60) + 60),        // 60-120 bpm
    respiratoryRate: Math.floor(Math.random() * (25 - 12) + 12),  // 12-25 breaths/min
    skinConductance: parseFloat((Math.random() * 10).toFixed(2)), // 0-10 μS
    bodyTemperature: parseFloat((Math.random() * (37.5 - 36.5) + 36.5).toFixed(2)), // 36.5-37.5°C
    timestamp: new Date().toISOString(),
  };
}
