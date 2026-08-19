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

# Use the project-pinned pnpm version through Corepack. The managed deploy image
# receives no local node_modules or dist directory, so this stage owns the full
# dependency install and application build.
RUN npm install -g corepack@latest && corepack enable

# Copy manifests AND patches dir before install — pnpm requires patches to be
# present when reading pnpm-lock.yaml (patchedDependencies: wouter@3.7.1)
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/
RUN corepack pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN corepack pnpm build

# ── Production stage ─────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

# Copy built artefacts and production deps
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

# Expose the port the Express server listens on (injected at runtime)
EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
