# ---------- FRONTEND BUILD ----------
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps

COPY frontend ./
RUN npm run build

# ---------- BACKEND ----------
FROM node:18-alpine
WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm install --omit=dev

COPY backend ./

# Copy frontend build into backend
COPY --from=frontend-build /app/frontend/build ./public

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]
