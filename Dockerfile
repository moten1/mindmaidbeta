# -------------------------
# Base image
# -------------------------
FROM node:20 AS base
WORKDIR /usr/src/app
ENV NODE_ENV=production

# -------------------------
# Backend dependencies
# -------------------------
FROM base AS backend-deps
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --legacy-peer-deps --only=production

# -------------------------
# Frontend dependencies + build
# -------------------------
FROM base AS frontend-deps
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci --legacy-peer-deps
COPY frontend ./frontend
RUN cd frontend && npm run build

# -------------------------
# Final image
# -------------------------
FROM node:20 AS final
WORKDIR /usr/src/app

# Copy backend and built frontend
COPY --from=backend-deps /usr/src/app/backend ./backend
COPY --from=frontend-deps /usr/src/app/frontend/build ./frontend/build

WORKDIR /usr/src/app/backend
EXPOSE 3000

# Start backend server using Render PORT
CMD ["node", "server.js"]
