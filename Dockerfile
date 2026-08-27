# Multi-stage build (CONTEXT.md D-48): build in node:22-alpine, copy artifacts to lean runtime.
# Final image runs as non-root `node` user, ~150MB.

# ---- Stage 1: builder ----
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

# ---- Stage 2: runtime ----
FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force

COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

# Non-root user (D-48)
USER node

EXPOSE 3000

# OCI labels (D-54)
LABEL org.opencontainers.image.title="Jira Release Notes" \
      org.opencontainers.image.description="Веб-приложение для формирования release notes из задач в Jira Server / Data Center" \
      org.opencontainers.image.source="https://github.com/aleksey/jira-release-notes" \
      org.opencontainers.image.licenses="MIT"

# Healthcheck on /health (D-46, D-47). 127.0.0.1, not localhost: busybox wget resolves
# localhost to ::1 first and does not fall back to IPv4; the app listens on 0.0.0.0 (IPv4 only).
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=10s \
  CMD wget --spider -q http://127.0.0.1:3000/health || exit 1

CMD ["node", "server/dist/server/index.js"]
