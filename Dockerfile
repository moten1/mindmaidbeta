# ==============================
# Base image
# ==============================
FROM node:20 AS base
WORKDIR /usr/src/app
ENV NODE_ENV=production

# ==============================
# Backend dependencies
# ==============================
FROM base AS backend-deps
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --legacy-peer-deps --only=production --silent

# ==============================
# Frontend dependencies + build
# ==============================
FROM base AS frontend-deps
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci --legacy-peer-deps --silent
COPY frontend ./frontend
RUN cd frontend && npm run build --silent

# ==============================
# Final image
# ==============================
FROM node:20
WORKDIR /usr/src/app

# Copy backend with node_modules
COPY --from=backend-deps /usr/src/app/backend ./backend

# Copy built frontend
COPY --from=frontend-deps /usr/src/app/frontend/build ./frontend/build

# Set working directory to backend
WORKDIR /usr/src/app/backend

# Expose port assigned by Render
EXPOSE 3000
ENV PORT=3000

# Start backend server
CMD ["node", "server.js"]
