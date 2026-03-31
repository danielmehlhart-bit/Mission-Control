# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# better-sqlite3 braucht build-tools für native Binaries
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci && npm cache clean --force
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

# Runtime-Dependencies für better-sqlite3
RUN apk add --no-cache sqlite

# Add non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# /data Verzeichnis für SQLite-DB (wird als Volume gemountet)
RUN mkdir -p /data && chown nextjs:nodejs /data

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Native Binaries von better-sqlite3 aus dem Build-Stage kopieren
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV NODE_ENV production
ENV HOSTNAME "0.0.0.0"
ENV DB_PATH /data/mc.db

CMD ["node", "server.js"]
