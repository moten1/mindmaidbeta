// ============================================
// 🧠 Emotion Stability Layer (Phase 0.5)
// Prevents flicker & noise
// ============================================

const WINDOW_SIZE = 5;          // last N samples
const MIN_CONFIDENCE = 0.55;    // discard weak signals

let buffer = [];

export function stabilizeEmotion(input) {
  if (!input?.emotion || input.confidence < MIN_CONFIDENCE) {
    return null;
  }

  buffer.push(input);
  if (buffer.length > WINDOW_SIZE) buffer.shift();

  const counts = {};
  for (const e of buffer) {
    counts[e.emotion] = (counts[e.emotion] || 0) + 1;
  }

  const stableEmotion = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])[0][0];

  return {
    ...input,
    emotion: stableEmotion,
    stable: true,
  };
}
