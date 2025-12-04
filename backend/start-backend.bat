@echo off
echo 🟢 Starting MindMaid Backend Server...

REM Move into backend folder
cd backend

REM Set production environment
set NODE_ENV=production

REM Start backend
npm start

pause
