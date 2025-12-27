Quick run instructions
======================

Start the frontend using the helper script which prefers local Node/npm but falls back to Docker Compose if Node is not available.

PowerShell (Windows):

```powershell
cd "c:\Users\moten\OneDrive\Desktop\MindMaidbetaFresh"
.\run-frontend.ps1
```

What it does:
- If `node` and `npm` are on PATH: runs `npm install` then `npm start` in `frontend/`.
- Otherwise, if Docker is available: runs `docker compose up --build frontend`.

If you prefer to run directly, ensure Node is installed and run inside `frontend`:

```powershell
cd frontend
npm install
npm start
```
