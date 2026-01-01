/**
 * ============================================
 * MindMaid API Client
 * Unified HTTP API service for frontend ↔ backend communication
 * ============================================
 */

// Determine API URL based on environment
const getApiUrl = () => {
  // Development: use localhost
  if (process.env.NODE_ENV === "development") {
    return process.env.REACT_APP_API_URL || "http://localhost:5000";
  }
  // Production: use Render URL
  return process.env.REACT_APP_API_URL_PROD || "https://mindmaid-backend.onrender.com";
};

const API_URL = getApiUrl();

/**
 * Fetch helper with error handling
 */
const apiFetch = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  const defaultHeaders = {
    "Content-Type": "application/json",
  };

  // Add auth token if available
  const token = localStorage.getItem("authToken");
  if (token) {
    defaultHeaders.Authorization = `Bearer ${token}`;
  }

  const config = {
    headers: defaultHeaders,
    ...options,
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const error = new Error(`API Error: ${response.status}`);
      error.status = response.status;
      error.response = response;
      throw error;
    }

    // Handle empty responses
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return { ok: true };
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ API Error [${endpoint}]:`, error);
    throw error;
  }
};

/**
 * ============================================
 * Public API Methods
 * ============================================
 */

// Health Check
export const checkHealth = async () => {
  return apiFetch("/api/health");
};

// ========== EMOTION ROUTES ==========

export const emotion = {
  // Get emotion service status
  status: async () => apiFetch("/api/emotion/status"),

  // Get emotion config
  config: async () => apiFetch("/api/emotion/config"),

  // Get recent emotion records
  recent: async (limit = 10) => apiFetch(`/api/emotion/recent?limit=${limit}`),

  // Analyze frame (send base64 frame for emotion analysis)
  analyze: async (frameBase64) =>
    apiFetch("/api/emotion/analyze", {
      method: "POST",
      body: JSON.stringify({ frame: frameBase64 }),
    }),

  // Send emotion feedback
  feedback: async (emotionLabel, accuracy) =>
    apiFetch("/api/emotion/feedback", {
      method: "POST",
      body: JSON.stringify({ emotion: emotionLabel, accuracy }),
    }),
};

// ========== AI ROUTES ==========

export const ai = {
  // Get AI recommendations based on mood
  recommend: async (mood, type = "general") =>
    apiFetch("/api/ai/recommend", {
      method: "POST",
      body: JSON.stringify({ mood, type }),
    }),

  // Chat with AI assistant
  chat: async (message, context = {}) =>
    apiFetch("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({ message, context }),
    }),
};

// ========== USER ROUTES ==========

export const user = {
  // Get user profile
  getProfile: async () => apiFetch("/api/user/profile"),

  // Update user profile
  updateProfile: async (userData) =>
    apiFetch("/api/user/profile", {
      method: "PUT",
      body: JSON.stringify(userData),
    }),

  // Get user preferences
  getPreferences: async () => apiFetch("/api/user/preferences"),

  // Update user preferences
  updatePreferences: async (preferences) =>
    apiFetch("/api/user/preferences", {
      method: "PUT",
      body: JSON.stringify(preferences),
    }),
};

// ========== AUTH ROUTES ==========

export const auth = {
  // Login
  login: async (email, password) =>
    apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  // Register
  register: async (email, password, name) =>
    apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }),

  // Logout
  logout: async () => {
    localStorage.removeItem("authToken");
    return apiFetch("/api/auth/logout", { method: "POST" });
  },

  // Refresh token
  refreshToken: async () => apiFetch("/api/auth/refresh", { method: "POST" }),
};

// ========== SESSION ROUTES ==========

export const session = {
  // Get all sessions
  getSessions: async () => apiFetch("/api/sessions"),

  // Create new session
  create: async (sessionData) =>
    apiFetch("/api/sessions", {
      method: "POST",
      body: JSON.stringify(sessionData),
    }),

  // Get session details
  get: async (sessionId) => apiFetch(`/api/sessions/${sessionId}`),

  // Update session
  update: async (sessionId, data) =>
    apiFetch(`/api/sessions/${sessionId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Delete session
  delete: async (sessionId) =>
    apiFetch(`/api/sessions/${sessionId}`, { method: "DELETE" }),
};

// ========== FEEDBACK ROUTES ==========

export const feedback = {
  // Submit feedback
  submit: async (feedbackData) =>
    apiFetch("/api/feedback", {
      method: "POST",
      body: JSON.stringify(feedbackData),
    }),

  // Get feedback history
  getHistory: async (limit = 20) =>
    apiFetch(`/api/feedback/history?limit=${limit}`),
};

// ========== DEBUG HELPERS ==========

export const api = {
  setAuthToken: (token) => {
    if (token) {
      localStorage.setItem("authToken", token);
    } else {
      localStorage.removeItem("authToken");
    }
  },

  getApiUrl: () => API_URL,

  isProduction: () => process.env.NODE_ENV === "production",

  isLocalDevelopment: () => {
    return API_URL.includes("localhost") || API_URL.includes("127.0.0.1");
  },
};

export default {
  checkHealth,
  emotion,
  ai,
  user,
  auth,
  session,
  feedback,
  api,
};
