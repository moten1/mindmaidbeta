# 🎥 Camera Not Working? Start Here

## ⚡ Quick Fixes (Do These First)

### 1. Hard Refresh Browser
- **Windows/Linux:** Ctrl + Shift + R
- **Mac:** Cmd + Shift + R
- This clears cache and reloads latest code

### 2. Check You're on HTTPS
- URL should be: `https://mindmaid-...`
- NOT: `http://mindmaid-...`
- Camera only works on secure HTTPS connection

### 3. Clear Camera Permission
1. Open browser Settings
2. Go to Privacy/Security → Camera
3. Find mindmaid and remove it
4. Reload page and grant permission again

### 4. Try Different Browser
- Chrome: ✅ Works best
- Firefox: ✅ Works
- Safari: ✅ Works  
- Edge: ✅ Works

---

## 🔍 Still Not Working?

### Open Browser Console (F12)
1. Press **F12** to open DevTools
2. Go to **Console** tab
3. Look for red error messages
4. **Copy the error message**

### Run Diagnostic
Copy and paste in Console:

```javascript
import CameraDiagnostics from '/utils/cameraDiagnostics.js';
await CameraDiagnostics.runFullDiagnostics();
```

This will show:
- ✅ What's working
- ❌ What's not working
- 💡 How to fix it

---

## 🆘 Common Error Messages

### "Camera access denied"
**Fix:**
1. Check browser Camera permissions
2. Allow mindmaid to use camera
3. Reload page

### "No camera device found"
**Fix:**
1. Check if camera is plugged in (USB cameras)
2. Check laptop camera isn't disabled in BIOS
3. Try different device

### "HTTPS required"
**Fix:**
- Make sure URL starts with `https://`
- Camera won't work on `http://`

### "NotAllowedError"
**Fix:**
1. Click the 🔒 lock icon in URL bar
2. Find "Camera" setting
3. Change from "Block" to "Allow"

---

## 📱 Mobile Users

**iPhone/iPad:**
- Use Safari or Chrome
- Allow camera permission when prompted
- Make sure iOS 11 or newer

**Android:**
- Use Chrome or Firefox
- Allow camera permission when prompted
- Check Settings → Apps → [Browser] → Permissions

---

## 💬 Tell Us About It

If still not working, help us debug by:

1. Running diagnostics (see above)
2. Copying the output
3. Screenshot the error message
4. Tell us:
   - Browser name and version
   - Device (laptop/phone)
   - Operating System

---

## 🎯 What Should Happen

✅ You click "Start Emotion Analysis"
✅ Browser asks to allow camera
✅ You click "Allow"
✅ Camera video appears in the app
✅ Emotion detection starts
✅ You see your emotion displayed

If any step fails, use diagnostics above.

---

## 🚀 Still Stuck?

[Read Full Troubleshooting Guide](./CAMERA_TROUBLESHOOTING.md)

---

**Remember:** Camera access is secure and private. The app only accesses your camera while the emotion analysis is running.
