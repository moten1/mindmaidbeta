# ==============================
# Base image
# ==============================
FROM node:20-alpine

# ==============================
# Set working directory
# ==============================
WORKDIR /app/backend

# ==============================
# Copy package files and install dependencies
# ==============================
COPY backend/package*.json ./
RUN npm ci --only=production

# ==============================
# Copy backend source code
# ==============================
COPY backend ./

# ==============================
# Environment variables
# ==============================
ENV NODE_ENV=production
ENV PORT=3000

# ==============================
# Expose port and start app
# ==============================
EXPOSE 3000
CMD ["node", "server.js"]
