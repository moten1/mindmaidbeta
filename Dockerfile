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
RUN cd backend && npm ci --legacy-peer-deps --only=production --silent

# -------------------------
# Frontend dependencies + build
# -------------------------
FROM base AS frontend-deps
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci --legacy-peer-deps --silent
COPY frontend ./frontend
RUN cd frontend && npm run build --silent

# -------------------------
# Final image
# -------------------------
FROM node:20 AS final
WORKDIR /usr/src/app

# Copy backend and built frontend
COPY --from=backend-deps /usr/src/app/backend ./backend
COPY --from=frontend-deps /usr/src/app/frontend/build ./frontend/build

# Set working directory to backend
WORKDIR /usr/src/app/backend

# Expose port (Render will provide PORT env)
EXPOSE 3000

# Use Render PORT if available
ENV PORT=3000

# Start backend server
CMD ["node", "server.js"]
