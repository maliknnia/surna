# Multi-stage Dockerfile for SURNA Sports Social Platform

# Stage 1: Build the frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY client/ ./client/
COPY shared/ ./shared/

# Build frontend
RUN npm run build:client

# Stage 2: Build the backend
FROM node:20-alpine AS backend-builder
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY server/ ./server/
COPY shared/ ./shared/
COPY tsconfig.json ./

# Build backend
RUN npm run build:server

# Stage 3: Production runtime
FROM node:20-alpine AS runtime

# Set NODE_ENV
ENV NODE_ENV=production

# Create app directory
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S surna -u 1001

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=backend-builder /app/dist ./dist
COPY --from=frontend-builder /app/client/dist ./dist/public

# Copy shared directory
COPY shared/ ./shared/

# Copy necessary configuration files
COPY --chown=surna:nodejs scripts/ ./scripts/

# Create directories for logs and temp files
RUN mkdir -p /app/logs /app/temp && \
    chown -R surna:nodejs /app/logs /app/temp

# Switch to non-root user
USER surna

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node scripts/healthcheck.js

# Expose port
EXPOSE 5000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/server/index.js"]