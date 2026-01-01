/**
 * ============================================
 * Mock Biometrics Generator
 * Phase 0.4.2 — Stub for real biometric integration
 * ============================================
 */

/**
 * Generate mock biometric data
 * @returns {Object} Biometric readings
 */
export function generateBiometrics() {
  return {
    heartRate: Math.floor(Math.random() * (120 - 60) + 60), // 60-120 bpm
    respiratoryRate: Math.floor(Math.random() * (25 - 12) + 12), // 12-25 breaths/min
    skinConductance: Math.random() * 10, // 0-10 microSiemens
    bodyTemperature: Math.random() * (37.5 - 36.5) + 36.5, // 36.5-37.5°C
    timestamp: new Date().toISOString(),
  };
}

export default { generateBiometrics };
