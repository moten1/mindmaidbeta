/**
 * ============================================
 * Emotion Session Store
 * Phase 0.4.2 — In-memory session management
 * ============================================
 */

// In-memory session store
const sessions = new Map();

/**
 * Record emotion for a session
 * @param {string} sessionId - Session identifier
 * @param {Object} emotionData - Emotion analysis result
 */
export function recordEmotion(sessionId, emotionData) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      id: sessionId,
      startTime: new Date(),
      emotions: [],
      summary: null,
    });
  }

  const session = sessions.get(sessionId);
  session.emotions.push({
    ...emotionData,
    timestamp: new Date().toISOString(),
  });

  return session;
}

/**
 * Summarize a session
 * @param {string} sessionId - Session identifier
 */
export function summarizeSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return null;

  const emotions = session.emotions;
  const emotionCounts = {};

  emotions.forEach((e) => {
    emotionCounts[e.emotion] = (emotionCounts[e.emotion] || 0) + 1;
  });

  const dominantEmotion = Object.entries(emotionCounts).sort(
    ([, a], [, b]) => b - a
  )[0]?.[0] || "neutral";

  const summary = {
    sessionId,
    startTime: session.startTime,
    endTime: new Date(),
    totalFrames: emotions.length,
    dominantEmotion,
    emotionDistribution: emotionCounts,
  };

  session.summary = summary;
  return summary;
}

/**
 * Close and clean up a session
 * @param {string} sessionId - Session identifier
 */
export function closeSession(sessionId) {
  if (sessions.has(sessionId)) {
    const session = sessions.get(sessionId);
    sessions.delete(sessionId);
    return session;
  }
  return null;
}

/**
 * Get session details
 * @param {string} sessionId - Session identifier
 */
export function getSession(sessionId) {
  return sessions.get(sessionId) || null;
}

/**
 * Clear all sessions
 */
export function clearAllSessions() {
  sessions.clear();
}

export default {
  recordEmotion,
  summarizeSession,
  closeSession,
  getSession,
  clearAllSessions,
};
