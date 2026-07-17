# Living Nexus — Production Dockerfile
# Extends the default node:22-slim base with ffmpeg for AI music video generation.
# ffmpeg is required by musicVideoService.ts to stitch AI frames into a looping MP4.

FROM node:22-slim AS base

# Install ffmpeg (and ca-certificates for HTTPS requests)
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends ffmpeg ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# ── Build stage ──────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Copy manifests first for layer caching
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm build

# ── Production stage ─────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

RUN npm install -g pnpm@9

# Copy built artefacts and production deps
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

# Expose the port the Express server listens on (injected at runtime)
EXPOSE 3000

CMD ["node", "dist/index.js"]
