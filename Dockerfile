# Multi-stage Dockerfile for ultron-comms coordinator (Northflank deployment).
# Stage 1 builds the TypeScript dist, stage 2 ships a slim runtime.

FROM node:24-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git
COPY package.json package-lock.json* ./
# Skip husky/prepare in build container — no .git hooks needed.
RUN npm pkg delete scripts.prepare && npm install --no-audit --no-fund
COPY tsconfig.json eslint.config.ts ./
COPY src ./src
RUN npx tsc && \
    printf '#!/usr/bin/env node\n' | cat - dist/cli.js > dist/cli.tmp && \
    mv dist/cli.tmp dist/cli.js && \
    chmod +x dist/cli.js

FROM node:24-alpine AS runtime
WORKDIR /app
# Production deps only — coordinator path uses node:net and the bundled core.
COPY package.json package-lock.json* ./
RUN npm pkg delete scripts.prepare && \
    npm install --omit=dev --no-audit --no-fund && \
    npm cache clean --force
COPY --from=builder /app/dist ./dist

# Coordinator listens on the mesh port and a sibling HTTP /health port.
# Northflank: expose 19876 TCP (mesh) + 8080 HTTP (health, public TLS edge).
ENV NODE_ENV=production \
    ULTRON_COMMS_BIND=0.0.0.0 \
    ULTRON_COMMS_PORT=19876 \
    ULTRON_COMMS_HEALTH_PORT=8080
EXPOSE 19876
EXPOSE 8080

# Drop privileges. node:alpine ships a non-root `node` user.
USER node
CMD ["node", "dist/cli.js", "coordinator"]
