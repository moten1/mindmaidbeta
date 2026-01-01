/**
 * ============================================
 * Backend ↔ Frontend Communication Guide
 * ============================================
 * 
 * This document outlines how to use the unified API client
 * for seamless communication between backend and frontend.
 */

// ============================================
// 1. IMPORTING THE API CLIENT
// ============================================
import apiClient, { emotion, ai, user, auth, session, feedback } from '@/utils/apiClient';

// ============================================
// 2. EMOTION ANALYSIS (WebSocket + HTTP)
// ============================================

/**
 * WebSocket for real-time emotion streaming
 * (already set up in EmotionDrivenDashboard.js)
 */
// Uses REACT_APP_WS_URL environment variables

/**
 * HTTP endpoint for sending frames for analysis
 */
export async function analyzeFrame(frameBase64) {
  try {
    const result = await emotion.analyze(frameBase64);
    console.log('Emotion detected:', result);
    return result;
  } catch (error) {
    console.error('Analysis failed:', error);
    throw error;
  }
}

/**
 * Send feedback on emotion detection accuracy
 */
export async function submitEmotionFeedback(detectedEmotion, userConfirmed) {
  try {
    await emotion.feedback(detectedEmotion, userConfirmed ? 1 : 0);
    console.log('Feedback submitted');
  } catch (error) {
    console.error('Feedback failed:', error);
  }
}

/**
 * Get recent emotion history
 */
export async function getEmotionHistory(limit = 10) {
  try {
    const history = await emotion.recent(limit);
    console.log('Emotion history:', history);
    return history;
  } catch (error) {
    console.error('Failed to fetch history:', error);
  }
}

// ============================================
// 3. AI RECOMMENDATIONS
// ============================================

/**
 * Get mood-based recommendations (music, food, activities)
 */
export async function getRecommendations(mood, type = 'general') {
  try {
    const recommendations = await ai.recommend(mood, type);
    console.log(`Recommendations for ${mood}:`, recommendations);
    return recommendations;
  } catch (error) {
    console.error('Failed to get recommendations:', error);
  }
}

/**
 * Chat with AI assistant
 */
export async function chatWithAI(message, context = {}) {
  try {
    const response = await ai.chat(message, context);
    console.log('AI response:', response);
    return response;
  } catch (error) {
    console.error('Chat failed:', error);
  }
}

// ============================================
// 4. USER MANAGEMENT
// ============================================

/**
 * Get current user profile
 */
export async function getUserProfile() {
  try {
    const profile = await user.getProfile();
    console.log('User profile:', profile);
    return profile;
  } catch (error) {
    console.error('Failed to fetch profile:', error);
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(userData) {
  try {
    const updated = await user.updateProfile(userData);
    console.log('Profile updated:', updated);
    return updated;
  } catch (error) {
    console.error('Profile update failed:', error);
  }
}

/**
 * Get user preferences
 */
export async function getUserPreferences() {
  try {
    const prefs = await user.getPreferences();
    console.log('User preferences:', prefs);
    return prefs;
  } catch (error) {
    console.error('Failed to fetch preferences:', error);
  }
}

// ============================================
// 5. AUTHENTICATION
// ============================================

/**
 * User login
 */
export async function loginUser(email, password) {
  try {
    const result = await auth.login(email, password);
    if (result.token) {
      apiClient.api.setAuthToken(result.token);
    }
    console.log('User logged in');
    return result;
  } catch (error) {
    console.error('Login failed:', error);
  }
}

/**
 * User registration
 */
export async function registerUser(email, password, name) {
  try {
    const result = await auth.register(email, password, name);
    if (result.token) {
      apiClient.api.setAuthToken(result.token);
    }
    console.log('User registered');
    return result;
  } catch (error) {
    console.error('Registration failed:', error);
  }
}

/**
 * User logout
 */
export async function logoutUser() {
  try {
    await auth.logout();
    console.log('User logged out');
  } catch (error) {
    console.error('Logout failed:', error);
  }
}

// ============================================
// 6. SESSIONS
// ============================================

/**
 * Get all user sessions
 */
export async function getSessions() {
  try {
    const sessions = await session.getSessions();
    console.log('Sessions:', sessions);
    return sessions;
  } catch (error) {
    console.error('Failed to fetch sessions:', error);
  }
}

/**
 * Create new session
 */
export async function createSession(sessionData) {
  try {
    const newSession = await session.create(sessionData);
    console.log('Session created:', newSession);
    return newSession;
  } catch (error) {
    console.error('Session creation failed:', error);
  }
}

// ============================================
// 7. FEEDBACK
// ============================================

/**
 * Submit general feedback
 */
export async function submitFeedback(feedbackData) {
  try {
    await feedback.submit(feedbackData);
    console.log('Feedback submitted');
  } catch (error) {
    console.error('Feedback submission failed:', error);
  }
}

/**
 * Get feedback history
 */
export async function getFeedbackHistory(limit = 20) {
  try {
    const history = await feedback.getHistory(limit);
    console.log('Feedback history:', history);
    return history;
  } catch (error) {
    console.error('Failed to fetch feedback history:', error);
  }
}

// ============================================
// 8. ENVIRONMENT CHECKS
// ============================================

/**
 * Check if running in development mode with local backend
 */
export function isLocalDevelopment() {
  return apiClient.api.isLocalDevelopment();
}

/**
 * Check if running in production
 */
export function isProduction() {
  return apiClient.api.isProduction();
}

/**
 * Get current API URL
 */
export function getApiUrl() {
  return apiClient.api.getApiUrl();
}

/**
 * Health check - verify backend is reachable
 */
export async function checkBackendHealth() {
  try {
    const health = await apiClient.checkHealth();
    console.log('Backend health:', health);
    return health;
  } catch (error) {
    console.error('Backend is unreachable:', error);
    return null;
  }
}

// ============================================
// 9. USAGE IN REACT COMPONENTS
// ============================================

/**
 * Example React Hook for emotion analysis:
 * 
 * import { useEffect, useState } from 'react';
 * import { getEmotionHistory, analyzeFrame } from '@/utils/apiIntegration';
 * 
 * function MyComponent() {
 *   const [emotions, setEmotions] = useState([]);
 *   const [loading, setLoading] = useState(false);
 * 
 *   useEffect(() => {
 *     const loadHistory = async () => {
 *       setLoading(true);
 *       const history = await getEmotionHistory(5);
 *       setEmotions(history);
 *       setLoading(false);
 *     };
 *     loadHistory();
 *   }, []);
 * 
 *   return (
 *     <div>
 *       {loading ? <p>Loading...</p> : (
 *         <ul>
 *           {emotions.map((e, i) => <li key={i}>{e.emotion}</li>)}
 *         </ul>
 *       )}
 *     </div>
 *   );
 * }
 */

// ============================================
// 10. ERROR HANDLING PATTERN
// ============================================

/**
 * Standard error handling pattern for all API calls:
 * 
 * try {
 *   const data = await emotion.recent(10);
 *   // Handle success
 * } catch (error) {
 *   if (error.status === 401) {
 *     // Handle unauthorized - redirect to login
 *   } else if (error.status === 404) {
 *     // Handle not found
 *   } else if (error.status >= 500) {
 *     // Handle server error - show user message
 *   } else {
 *     // Handle network or unknown error
 *   }
 * }
 */

export default {
  // Emotion
  analyzeFrame,
  submitEmotionFeedback,
  getEmotionHistory,

  // AI
  getRecommendations,
  chatWithAI,

  // User
  getUserProfile,
  updateUserProfile,
  getUserPreferences,

  // Auth
  loginUser,
  registerUser,
  logoutUser,

  // Sessions
  getSessions,
  createSession,

  // Feedback
  submitFeedback,
  getFeedbackHistory,

  // Utilities
  isLocalDevelopment,
  isProduction,
  getApiUrl,
  checkBackendHealth,
};
