# --- Stage 1: Build ---
FROM node:22-alpine AS builder

WORKDIR /app

# Install backend dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Install frontend dependencies
COPY frontend/package.json frontend/package-lock.json* ./frontend/
RUN cd frontend && npm ci

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/
COPY frontend/ ./frontend/

# Build backend (TypeScript -> JS) and frontend (Vite)
RUN npx tsc && cd frontend && npm run build

# --- Stage 2: Production ---
FROM node:22-alpine AS production

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built backend
COPY --from=builder /app/dist/ ./dist/

# Copy built frontend
COPY --from=builder /app/frontend/dist/ ./frontend/dist/

# Create data directory
RUN mkdir -p /app/data && chown -R node:node /app/data

# Use non-root user
USER node

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "dist/server.js"]
