# Multi-stage Dockerfile for Backend
# Stage 1: Base image with dependencies
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# Stage 2: Development dependencies
FROM base AS dev-deps
RUN npm ci --include=dev && npm cache clean --force

# Stage 3: Production dependencies only
FROM base AS prod-deps
RUN npm ci --only=production && npm cache clean --force

# Stage 4: Production stage (minimal size)
FROM node:20-alpine AS production

# Install security updates and dumb-init
RUN apk upgrade --no-cache && \
    apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy only production dependencies
COPY --from=prod-deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs . .

# Create necessary directories and set permissions
RUN mkdir -p /app/uploads /app/logs && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node healthcheck.js

# Expose port
EXPOSE 3001

# Set environment
ENV NODE_ENV=production

# Use dumb-init for proper signal handling and start the server
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
