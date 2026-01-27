# ==============================
# Base image
# ==============================
FROM node:20-alpine

# App root
WORKDIR /app

# ==============================
# Install backend dependencies
# ==============================
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production

# ==============================
# Copy backend source
# ==============================
COPY backend ./backend

# ==============================
# Run backend
# ==============================
WORKDIR /app/backend

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]
