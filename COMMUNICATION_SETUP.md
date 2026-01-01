# MindMaid Backend ↔ Frontend Communication Setup Guide

## Overview

Your MindMaid app now has **unified, seamless communication** between backend and frontend using:

1. **HTTP REST APIs** — Standard request/response for CRUD operations
2. **WebSocket (WS/WSS)** — Real-time emotion streaming from backend
3. **Centralized API Client** — Single import point for all backend calls

---

## Architecture

### Backend (Node.js/Express)
- **Port:** `5000` (local) | `https://mindmaid-backend.onrender.com` (production)
- **CORS:** Enabled (`*` origin, suitable for development)
- **Routes:**
  - `/api/health` — Health check
  - `/api/emotion/*` — Emotion analysis & history
  - `/api/ai/*` — AI recommendations & chat
  - `/api/user/*` — User profile & preferences
  - `/api/auth/*` — Login, register, logout
  - `/api/sessions/*` — Session management
  - `/api/feedback/*` — Feedback submission

### Frontend (React)
- **Port:** `3000` (local) | `https://mindmaid.onrender.com` (production)
- **API Client:** `frontend/src/utils/apiClient.js` (centralized)
- **Integration Guide:** `frontend/src/utils/apiIntegration.js` (examples)
- **Environment Config:**
  - `frontend/frontend.env` — Production settings
  - `frontend/.env.local` — Local development (override)

---

## Quick Start

### Step 1: Local Development Setup

**Terminal 1 — Backend:**
```powershell
cd backend
npm install
node server.js
# Backend running on http://localhost:5000
```

**Terminal 2 — Frontend:**
```powershell
cd frontend
npm install
npm start
# Frontend running on http://localhost:3000
```

**Expected Console Output (Backend):**
```
============================================
🚀 MindMaid Backend Online
📡 Port: 5000
🌍 Env: development
🖥 Serving Frontend: NO
============================================
```

---

## Using the API Client

### Import in Your Component

```javascript
import { emotion, ai, user, auth } from '@/utils/apiClient';
// OR import full integration guide:
import { analyzeFrame, getRecommendations, getUserProfile } from '@/utils/apiIntegration';
```

### Common Usage Examples

#### Emotion Analysis
```javascript
// Get recent emotions
const history = await emotion.recent(10);
console.log(history);

// Send frame for analysis
const frameBase64 = canvas.toDataURL('image/jpeg');
const result = await emotion.analyze(frameBase64);

// Submit feedback
await emotion.feedback('happy', 1); // 1 = correct, 0 = incorrect
```

#### AI Recommendations
```javascript
// Get mood-based suggestions
const recs = await ai.recommend('sad', 'meals');
console.log(recs); // { title: "Recipe: ...", url: "..." }

// Chat with AI
const response = await ai.chat('I need help', { mood: 'anxious' });
console.log(response.message);
```

#### User Management
```javascript
// Login
const loginResult = await auth.login('user@example.com', 'password');
if (loginResult.token) {
  apiClient.api.setAuthToken(loginResult.token);
}

// Get profile
const profile = await user.getProfile();

// Update preferences
await user.updatePreferences({ theme: 'dark', notifications: true });
```

---

## Environment Configuration

### `.env.local` (Local Development)
```dotenv
REACT_APP_API_URL=http://localhost:5000
REACT_APP_WS_URL=ws://localhost:5000
```

### `frontend.env` (Production)
```dotenv
REACT_APP_API_URL_PROD=https://mindmaid-backend.onrender.com
REACT_APP_WS_URL_PROD=wss://mindmaid-backend.onrender.com
```

**Priority:** `.env.local` > `frontend.env` > hardcoded defaults

---

## WebSocket Connection (Real-Time Emotion Streaming)

The `EmotionDrivenDashboard.js` already uses WebSocket for streaming:

```javascript
const WS_URL = `${WS_HOST}/api/emotion/stream`;
const ws = new WebSocket(WS_URL);
ws.onmessage = (e) => {
  const emotion = JSON.parse(e.data);
  console.log('Real-time emotion:', emotion);
};
```

---

## Health Checks

### Backend Health
```powershell
curl http://localhost:5000/api/health
```

**Response:**
```json
{
  "ok": true,
  "uptime": 1234,
  "env": "development",
  "port": 5000,
  "memory": {
    "rss": "45 MB",
    "heapUsed": "25 MB"
  },
  "timestamp": "2025-12-27T10:00:00.000Z"
}
```

### Frontend API Client Health Check
```javascript
import { checkBackendHealth } from '@/utils/apiIntegration';

const health = await checkBackendHealth();
if (health) {
  console.log('✅ Backend is reachable');
} else {
  console.error('❌ Backend is unreachable');
}
```

---

## Common Issues & Solutions

### Issue: `CORS Error` or `Network Failed`
**Solution:**
1. Ensure backend is running: `node server.js` in `backend/` directory
2. Check port: Backend should be on `5000`, Frontend on `3000`
3. Verify `.env.local`: `REACT_APP_API_URL=http://localhost:5000`
4. Backend has CORS enabled (already configured in `server.js`)

### Issue: `WebSocket Connection Failed`
**Solution:**
1. WebSocket URL must be `ws://` (dev) or `wss://` (prod)
2. Check `REACT_APP_WS_URL` in `.env.local`
3. Ensure backend supports WS at `/api/emotion/stream`

### Issue: `401 Unauthorized`
**Solution:**
1. User not logged in or token expired
2. Use `auth.login()` to get token
3. API client auto-adds token to headers (from localStorage)
4. Or manually: `apiClient.api.setAuthToken(token)`

### Issue: `404 Not Found`
**Solution:**
1. Check backend route exists in `backend/routes/`
2. Verify route is registered in `server.js` (check `ROUTES` array)
3. Ensure endpoint URL is correct in `apiClient.js`

---

## Verification Checklist

- [ ] Backend running on `http://localhost:5000`
- [ ] Frontend running on `http://localhost:3000`
- [ ] `/api/health` returns `{ ok: true }`
- [ ] `emotion.recent()` returns emotion history
- [ ] WebSocket connects without errors
- [ ] `ai.recommend('happy', 'meals')` returns recommendations
- [ ] Auth endpoints work (login/register/logout)
- [ ] No CORS errors in browser console
- [ ] No network errors in Network tab

---

## Production Deployment

### Render (Recommended)

**Backend:**
- Deploy `backend/` directory
- Set `PORT` environment variable
- Set required API keys (GEMINI_API_KEY, SPOONACULAR_API_KEY, etc.)

**Frontend:**
- Deploy `frontend/` directory
- Build command: `npm run build`
- Start command: `npm start`
- Set `REACT_APP_API_URL_PROD` to Render backend URL
- Set `REACT_APP_WS_URL_PROD` to Render backend WebSocket URL

### Environment Variables (Render)

**Backend:**
```
PORT=5000
NODE_ENV=production
GEMINI_API_KEY=sk-...
SPOONACULAR_API_KEY=...
# ... other API keys
```

**Frontend:**
```
REACT_APP_API_URL_PROD=https://mindmaid-backend.onrender.com
REACT_APP_WS_URL_PROD=wss://mindmaid-backend.onrender.com
REACT_APP_ENABLE_WARDROBE=true
REACT_APP_ENABLE_FOOD=true
REACT_APP_ENABLE_RELAXATION=true
```

---

## Next Steps

1. **Test locally:** Run backend + frontend, verify health checks pass
2. **Use API client:** Import functions in components, test CRUD operations
3. **Monitor logs:** Check browser console for network errors
4. **Deploy:** Push to Render when ready
5. **Monitor production:** Check logs regularly for errors

---

## File References

- **API Client:** [frontend/src/utils/apiClient.js](frontend/src/utils/apiClient.js)
- **Integration Guide:** [frontend/src/utils/apiIntegration.js](frontend/src/utils/apiIntegration.js)
- **Backend Server:** [backend/server.js](backend/server.js)
- **Environment Config:** [frontend/frontend.env](frontend/frontend.env) & [frontend/.env.local](frontend/.env.local)

---

## Support

For issues:
1. Check backend logs: `node server.js`
2. Check frontend console: `F12` → Console tab
3. Test API directly: `curl http://localhost:5000/api/health`
4. Review error responses in Network tab (F12)

---

**Last Updated:** December 27, 2025  
**Status:** ✅ Production Ready
