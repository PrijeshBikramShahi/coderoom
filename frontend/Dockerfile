# ---------- Stage 1: build ----------
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy all source code
COPY . .

# Build the Next.js app
RUN npm run build

# ---------- Stage 2: runtime ----------
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy build output and package files
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package*.json ./


EXPOSE 3000
CMD ["npm", "run", "start"]
