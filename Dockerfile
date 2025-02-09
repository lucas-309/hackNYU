# Build stage
FROM mcr.microsoft.com/devcontainers/typescript-node as builder

WORKDIR /app

# Copy package files and prisma schema
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including dev) for build
RUN npm ci

# Generate Prisma client first
RUN npm run prisma:generate
RUN npm uninstall -g typescript
RUN npm uninstall - g tsc
RUN npm install -g typescript 
RUN npm install -D typescript

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files and prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies and generate prisma
RUN npm ci --omit=dev && \
    npm run prisma:generate

# Copy built files
COPY --from=builder /app/build ./build

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the server
CMD ["npm", "run", "start:prod"] 