# Multi-stage Dockerfile for ultron-comms coordinator (Northflank deployment).
# Stage 1 builds the TypeScript dist, stage 2 ships a slim runtime.

FROM node:24-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git
COPY package.json package-lock.json* ./
# Drop husky/prepare AND the postinstall tsc fallback. The latter would
# otherwise run during npm install (when dist/ isn't yet in the build
# context) and fail because typescript isn't installed yet. We run tsc
# explicitly after COPY src ./src below.
RUN npm pkg delete scripts.prepare && \
    npm pkg delete scripts.postinstall && \
    npm install --no-audit --no-fund
# eslint.config.ts is intentionally excluded by .dockerignore (lint runs in CI,
# not in the image build). Only the tsc inputs are copied here.
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc && \
    printf '#!/usr/bin/env node\n' | cat - dist/cli.js > dist/cli.tmp && \
    mv dist/cli.tmp dist/cli.js && \
    chmod +x dist/cli.js

FROM node:24-alpine AS runtime
WORKDIR /app
# Production deps only — coordinator path uses node:net and the bundled core.
COPY package.json package-lock.json* ./
# Strip prepare (husky) AND postinstall (tsc fallback) — the multi-stage
# build already produces dist/ in the builder stage; the runtime image must
# not try to compile typescript again or it fails because typescript is a
# devDependency that --omit=dev skips.
RUN npm pkg delete scripts.prepare && \
    npm pkg delete scripts.postinstall && \
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
