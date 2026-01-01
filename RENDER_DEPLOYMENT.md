# MindMaid Render Deployment Guide

## Pre-Deployment Checklist

- [x] Backend server configured (port 5000, CORS enabled)
- [x] Frontend React app configured (port 3000, build output)
- [x] Unified API client ready (`apiClient.js`, `apiIntegration.js`)
- [x] Environment variables documented
- [x] Git commits pushed to remote
- [x] Docker configuration ready (`Dockerfile`, `docker-compose.yml`)
- [x] render.yaml configured for both services

---

## Deployment Steps

### Step 1: Push Code to GitHub

```powershell
cd C:\Users\moten\OneDrive\Desktop\MindMaidbetaFresh

# Ensure all changes are committed
git status

# If changes exist, commit them
git add -A
git commit -m "chore: prepare for Render deployment"

# Push to main branch (or your feature branch)
git push origin main
# OR push feature branch first, then PR/merge
git push -u origin feat/mindmaid-comms
```

---

### Step 2: Deploy to Render (Using render.yaml)

#### Option A: Automatic Deployment (Recommended)

1. Go to [https://render.com](https://render.com)
2. Sign in with GitHub
3. Click **New** → **Web Service**
4. Select your GitHub repository (`mindmaidbeta`)
5. Render will auto-detect `render.yaml`
6. Click **Deploy**

#### Option B: Manual Deployment (If render.yaml not detected)

**Backend:**
1. New → Web Service
2. Repository: `mindmaidbeta`
3. Environment: `Node`
4. Build Command: `cd backend && npm install`
5. Start Command: `node server.js`
6. Plan: Free (or Starter)
7. Set environment variables (see Step 3)
8. Deploy

**Frontend:**
1. New → Static Site
2. Repository: `mindmaidbeta`
3. Build Command: `cd frontend && npm install && npm run build`
4. Publish Directory: `frontend/build`
5. Deploy

---

### Step 3: Set Environment Variables on Render

#### Backend Service

Add these environment variables in Render dashboard:

```
NODE_ENV=production
PORT=5000
SKIP_DB=false
MONGODB_URI=<your-mongodb-uri>  # Optional: add real MongoDB if needed

# AI/API Keys (get from your service providers)
GEMINI_API_KEY=<your-gemini-key>
HUME_API_KEY=<your-hume-key>
SPOONACULAR_API_KEY=<your-spoonacular-key>
DEEPSEEK_API_KEY=<your-deepseek-key>
OPENROUTER_API_KEY=<your-openrouter-key>

# Secrets
SECRET_KEY=<generate-random-string>
```

**To generate a secret:**
```powershell
[System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString())) | Out-String
```

#### Frontend Service

Add these environment variables:

```
REACT_APP_API_URL_PROD=https://mindmaid-backend.onrender.com
REACT_APP_WS_URL_PROD=wss://mindmaid-backend.onrender.com
REACT_APP_WS_PATH=/api/emotion/stream
REACT_APP_ENABLE_WARDROBE=true
REACT_APP_ENABLE_FOOD=true
REACT_APP_ENABLE_RELAXATION=true
REACT_APP_DEFAULT_FPS=4
```

---

### Step 4: Update Frontend API URL After Backend Deploys

Once backend service is deployed, Render will provide a URL like:
```
https://mindmaid-backend.onrender.com
```

Update frontend environment variables with this URL:
```
REACT_APP_API_URL_PROD=https://mindmaid-backend.onrender.com
REACT_APP_WS_URL_PROD=wss://mindmaid-backend.onrender.com
```

Redeploy frontend.

---

### Step 5: Verify Deployment

**Test Backend:**
```powershell
# Should return JSON with status info
Invoke-WebRequest https://mindmaid-backend.onrender.com/api/health -UseBasicParsing

# Test emotion endpoint
Invoke-WebRequest https://mindmaid-backend.onrender.com/api/emotion/status -UseBasicParsing
```

**Test Frontend:**
- Visit `https://mindmaid.onrender.com` (or your assigned URL)
- Open browser DevTools (F12)
- Check Network tab for API calls
- Verify emotion analysis works

---

## Architecture on Render

```
┌─────────────────────────────────────────────────────┐
│              Render Deployment                       │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌──────────────────┐         ┌──────────────────┐  │
│  │  Frontend        │         │  Backend         │  │
│  │  (Static Site)   │         │  (Web Service)   │  │
│  │                  │         │                  │  │
│  │ Build: React App │◄────────┤ Node.js/Express │  │
│  │ URL: *.onrender  │ API/WS  │ Port: 5000       │  │
│  │      .com        │         │ URL: *.onrender  │  │
│  │                  │         │      .com        │  │
│  └──────────────────┘         └──────────────────┘  │
│                                                       │
│  Optional:                                           │
│  ┌──────────────────┐                               │
│  │  MongoDB Atlas   │◄────── Backend                │
│  │  (if using DB)   │                               │
│  └──────────────────┘                               │
│                                                       │
└─────────────────────────────────────────────────────┘
```

---

## Post-Deployment

### Monitor Logs

Dashboard → Services → Select Service → Logs

**Expected Backend Logs:**
```
🌱 Environment loaded
📌 Loaded route: /api/auth
📌 Loaded route: /api/user
📌 Loaded route: /api/feedback
📌 Loaded route: /api/sessions
📌 Loaded route: /api/ai
📌 Loaded route: /api/emotion
🔌 Emotion WebSocket Proxy Ready
🎨 Serving frontend build...
🚀 MindMaid Backend Online
```

### Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| **"Cannot find module"** | Backend build succeeded but missing deps → `npm ci` instead of `npm install` |
| **Timeout 30s** | Increase timeout or check build command in render.yaml |
| **Frontend shows "Cannot find API"** | Verify `REACT_APP_API_URL_PROD` env var is set correctly |
| **WebSocket 404** | Ensure backend is running and `/api/emotion/stream` route is loaded |
| **Database connection fails** | Set `SKIP_DB=true` if no MongoDB; add `MONGODB_URI` if using DB |

---

## Troubleshooting

### Check Backend Health

```bash
curl https://mindmaid-backend.onrender.com/api/health
```

### Check Frontend Build

Dashboard → Static Site → Deploys → Check build logs

### View Live Logs

```bash
# Terminal (if Render CLI installed)
render logs <service-name> --follow
```

### Rollback Deployment

Dashboard → Service → Deploys → Click previous deployment → Click "Rollback"

---

## Additional Resources

- [Render Documentation](https://render.com/docs)
- [render.yaml Reference](https://render.com/docs/yaml-spec)
- [Environment Variables](https://render.com/docs/environment-variables)
- [GitHub Integration](https://render.com/docs/github)

---

## Next Steps

1. ✅ Push code to GitHub
2. ✅ Connect repository to Render
3. ✅ Deploy backend service
4. ✅ Deploy frontend service
5. ✅ Set environment variables
6. ✅ Verify both services online
7. ✅ Test API endpoints
8. ✅ Monitor logs and performance

---

**Status:** Ready for Render deployment  
**Last Updated:** December 27, 2025  
**Backend:** Fully configured  
**Frontend:** Fully configured  
