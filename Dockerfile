FROM node:20

WORKDIR /usr/src/app

# -------------------------
# Backend dependencies
# -------------------------
COPY backend/package*.json ./backend/
RUN cd backend && npm install --legacy-peer-deps

# -------------------------
# Frontend dependencies + build
# -------------------------
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install --legacy-peer-deps

COPY frontend ./frontend
RUN cd frontend && npm run build

# -------------------------
# Backend source
# -------------------------
COPY backend ./backend

WORKDIR /usr/src/app/backend

EXPOSE 3000
CMD ["node", "server.js"]
