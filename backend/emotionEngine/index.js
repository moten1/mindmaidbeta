// backend/emotionEngine/index.js
// ============================================
// 🧠 Emotion Engine Entry Point (Phase 0.4.2)
// Combines mock emotion + biometric stubs
// ============================================

import { generateEmotion } from "./mockEmotion.js";
import { generateBiometrics } from "./mockBiometrics.js";

/**
 * Main analyzeEmotion function
 * @param {Object} input - { frame?: Buffer, ts?: number }
 */
export async function analyzeEmotion(input = {}) {
  // Currently ignores frame, but ready for Phase 0.5 AI processing

  const emotionData = generateEmotion();
  const biometrics = generateBiometrics();

  return {
    ...emotionData,
    biometrics,
  };
}
