# Multi-stage build for backend

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY backend/package*.json ./backend/
COPY shared ./shared/

# Install dependencies
WORKDIR /app/backend
RUN npm ci

# Copy source code
COPY backend/src ./src
COPY backend/tsconfig.json ./

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production dependencies only
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy built code from builder
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/shared ../shared

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "dist/server.js"]
