# Multi-stage build (CONTEXT.md D-48): build in node:22-alpine, copy artifacts to lean runtime.
# Final image runs as non-root `node` user, ~150MB.

# ---- Stage 1: builder ----
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Stage 2: runtime ----
FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

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

# Healthcheck on /health (D-46, D-47)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=10s \
  CMD wget --spider -q http://localhost:3000/health || exit 1

CMD ["node", "server/dist/server/index.js"]
