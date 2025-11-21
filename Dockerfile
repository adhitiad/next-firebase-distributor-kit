# Multi-stage Dockerfile for Distributor App
# Uses oven/bun as the base image for optimal performance

# Base stage with Bun and common dependencies
FROM oven/bun:1.1 AS base
WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./
COPY apps/web/package.json apps/web/bun.lockb* ./apps/web/
COPY apps/api/package.json apps/api/bun.lockb* ./apps/api/

# Install dependencies for all workspaces
RUN bun install --frozen-lockfile --production=false

# API Stage
FROM base AS api
WORKDIR /app

# Copy API source code
COPY apps/api ./apps/api
COPY tsconfig.json ./

# Install API production dependencies
RUN cd apps/api && bun install --frozen-lockfile --production

# Generate Prisma client
RUN cd apps/api && bunx prisma generate

# Create logs directory
RUN mkdir -p apps/api/logs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Start API server
CMD ["cd", "apps/api", "&&", "bun", "run", "start"]

# Web Stage
FROM base AS web
WORKDIR /app

# Copy web source code
COPY apps/web ./apps/web
COPY tsconfig.json ./

# Install web production dependencies
RUN cd apps/web && bun install --frozen-lockfile --production

# Build Next.js application
RUN cd apps/web && bun run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

# Start web server
CMD ["cd", "apps/web", "&&", "bun", "run", "start"]

# Development Stage (for local development)
FROM base AS development
WORKDIR /app

# Copy all source code
COPY . .

# Install all dependencies
RUN bun install

# Generate Prisma client
RUN cd apps/api && bunx prisma generate

# Expose ports
EXPOSE 3000 3001

# Start development servers
CMD ["bun", "run", "dev"]