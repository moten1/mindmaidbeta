# 📷 Camera Connectivity Troubleshooting Guide (Render Production)

## Quick Fix Checklist

### ✅ What We Fixed
1. **Added Permissions-Policy headers** - Allows camera/microphone access in browsers
2. **Enhanced error handling** - Better diagnostics for camera failures
3. **Improved WebSocket logging** - Easier debugging of connection issues
4. **Added meta tags** - Ensures browser knows camera is permitted

---

## Common Issues & Solutions

### Issue 1: "Camera access denied"
**Symptom:** Browser shows permission popup but then fails

**Solutions:**
1. **Check browser permissions:**
   - Open DevTools (F12)
   - Go to Settings → Privacy & Security → Camera
   - Remove mindmaid-frontend.onrender.com from blocked list
   - Allow camera access

2. **Clear cached permissions:**
   - In DevTools Console, run:
   ```javascript
   // Reset permissions (browser-specific)
   await navigator.permissions.query({ name: "camera" });
   ```

3. **Check if HTTPS is enforced:**
   - Render provides HTTPS automatically
   - Make sure you're accessing `https://` not `http://`
   - Check: `window.isSecureContext` should be `true` in console

### Issue 2: "getUserMedia not supported"
**Symptom:** Camera button doesn't work or says "getUserMedia not available"

**Solutions:**
1. **Check browser compatibility:**
   - Chrome/Edge: ✅ Fully supported
   - Firefox: ✅ Fully supported
   - Safari: ✅ Supported (iOS 11+)
   - IE: ❌ Not supported (use modern browser)

2. **Verify secure context:**
   ```javascript
   // In browser console:
   console.log(window.isSecureContext); // Should be true
   console.log(navigator.mediaDevices?.getUserMedia ? "✅ Available" : "❌ Not available");
   ```

### Issue 3: "No camera device found"
**Symptom:** Browser says no camera devices detected

**Solutions:**
1. **Check hardware:**
   - Laptop: Built-in camera might be disabled in BIOS
   - Desktop: USB camera might be disconnected
   - Windows: Check Device Manager → Cameras

2. **Check OS permissions:**
   - **Windows 10/11:**
     - Settings → Privacy & Security → Camera
     - Make sure your browser is enabled
   - **macOS:**
     - System Preferences → Security & Privacy → Camera
     - Allow browser access
   - **Linux:**
     ```bash
     # Check if camera is available
     ls /dev/video*
     ```

### Issue 4: "WebSocket connection failed"
**Symptom:** Camera starts but no emotion detection happens

**Solutions:**
1. **Check WebSocket URL:**
   ```javascript
   // In browser console:
   console.log(process.env.REACT_APP_WS_URL_PROD);
   // Should output: wss://mindmaid-backend.onrender.com
   ```

2. **Verify backend is running:**
   - Open [Backend Health Check](https://mindmaid-backend.onrender.com/api/health)
   - Should show JSON with `"ok": true`

3. **Test WebSocket directly:**
   ```javascript
   // In browser console:
   const ws = new WebSocket('wss://mindmaid-backend.onrender.com/api/emotion/stream');
   ws.onopen = () => console.log('✅ WS Connected');
   ws.onerror = (e) => console.error('❌ WS Error', e);
   ```

---

## 🔧 Run Diagnostics

### In Browser Console:

```javascript
// Import diagnostics utility
import CameraDiagnostics from '@/utils/cameraDiagnostics';

// Run full diagnostics
CameraDiagnostics.runFullDiagnostics();

// Or quick test
const result = await CameraDiagnostics.quickCameraTest();
console.log(result);
```

### Expected Diagnostics Output:

```
✅ No issues detected - camera should work!
```

---

## 🚨 Server-Side Checks

### Check Backend Headers
```bash
# Verify Permissions-Policy header is set
curl -I https://mindmaid-backend.onrender.com

# Should include:
# Permissions-Policy: camera=(self), microphone=(self), geolocation=(self)
```

### Check WebSocket Endpoint
```bash
# Test WebSocket endpoint health
curl https://mindmaid-backend.onrender.com/api/health
# Response: { "ok": true, ... }
```

---

## 🔐 Security Headers Applied

The backend now sends these critical headers:

```
Permissions-Policy: camera=(self), microphone=(self), geolocation=(self)
Feature-Policy: camera 'self'; microphone 'self'; geolocation 'self'
```

These tell the browser:
- ✅ Camera access is allowed for this origin
- ✅ Microphone access is allowed for this origin
- ✅ Geolocation is allowed for this origin

---

## 📱 Mobile-Specific Issues

### iPhone/iPad
- ✅ Supported on iOS 11+
- ✅ Requires HTTPS
- ⚠️ May show permission request twice (allow both times)
- ⚠️ Camera might be limited by app restrictions

### Android
- ✅ Supported on Chrome, Firefox
- ✅ Requires HTTPS
- Check: Settings → Apps → [Browser] → Permissions → Camera

---

## 📊 Performance Tips

If camera works but is slow:

1. **Lower video quality:**
   ```javascript
   // In camera startup (EmotionDrivenDashboard.js)
   video: {
     width: { max: 640 },  // Lower resolution
     height: { max: 480 }
   }
   ```

2. **Reduce FPS:**
   - Dashboard has adaptive FPS starting at 4 FPS
   - If too slow, reduce `REACT_APP_DEFAULT_FPS` in `.env`

3. **Check bandwidth:**
   - Dashboard shows bandwidth: Low/Medium/High
   - High bandwidth = more CPU usage

---

## 🐛 Enable Detailed Logging

Add this to your `.env`:
```
REACT_APP_DEBUG_CAMERA=true
```

Then in EmotionDrivenDashboard.js, add:
```javascript
if (process.env.REACT_APP_DEBUG_CAMERA === 'true') {
  console.log('📷 Camera Debug:', { stream, fps: fpsRef.current });
}
```

---

## 🆘 Still Not Working?

1. **Check browser console** for red errors
2. **Run diagnostics** using the script above
3. **Check Render logs:**
   - Dashboard: https://dashboard.render.com
   - Select your backend service
   - View "Logs" tab
4. **Clear cache:**
   - DevTools → Application → Clear site data
   - Hard refresh (Ctrl+Shift+R)
5. **Test on different device** to isolate issue

---

## 📝 Log Locations

### Frontend Logs
- Browser DevTools Console (F12)
- Check for 📷 emoji messages

### Backend Logs
- Render Dashboard → Service → Logs
- Look for `ws_heartbeat` and `camera` entries

---

## ✅ Verification Commands

Run these in browser console to verify everything:

```javascript
// 1. Check secure context
console.log('🔒 Secure context:', window.isSecureContext);

// 2. Check API URL
console.log('📡 API URL:', process.env.REACT_APP_API_URL_PROD);

// 3. Check WS URL
console.log('🔌 WS URL:', process.env.REACT_APP_WS_URL_PROD);

// 4. Check getUserMedia
console.log('📷 getUserMedia:', navigator.mediaDevices?.getUserMedia ? '✅' : '❌');

// 5. Check permissions
navigator.permissions.query({ name: 'camera' }).then(result => {
  console.log('🎥 Camera permission:', result.state);
});
```

---

## 📞 Contact Support

If issues persist after trying above steps, provide:
1. Browser type/version
2. Device type (laptop/mobile)
3. Console error messages
4. Output from `CameraDiagnostics.runFullDiagnostics()`
