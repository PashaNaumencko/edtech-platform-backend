# Multi-stage Dockerfile for Identity Service

# Stage 1: Dependencies
FROM node:22-alpine AS dependencies

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY libs/config/package.json ./libs/config/
COPY libs/constants/package.json ./libs/constants/ || true
COPY libs/types/package.json ./libs/types/ || true
COPY libs/nestjs-drizzle/package.json ./libs/nestjs-drizzle/ || true
COPY libs/service-auth/package.json ./libs/service-auth/ || true
COPY libs/shared-kernel/package.json ./libs/shared-kernel/ || true

# Install dependencies
RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/package.json ./package.json

# Copy source code
COPY . .

# Build all libraries first
RUN pnpm run build:libs

# Build identity-service
RUN pnpm run build identity-service

# Stage 3: Production
FROM node:22-alpine AS production

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
USER nestjs

# Expose ports
# 3000 - Public API (client-facing)
# 3001 - Internal API (service-to-service)
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/apps/identity-service/main.js"]
