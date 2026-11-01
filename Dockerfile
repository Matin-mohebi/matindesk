# MatinDesk — production image (Next.js standalone + Prisma + SQLite)
FROM oven/bun:1 AS builder
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
ENV DATABASE_URL=file:/app/db/custom.db
ENV MATIN_SECRET=build-placeholder
RUN mkdir -p db && bunx prisma generate && bun run build

FROM oven/bun:1-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_URL=file:/app/db/custom.db

# standalone output + static assets + prisma engine + db folder
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
RUN mkdir -p /app/db

EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0

# first run pushes the schema, then starts the server
CMD ["sh", "-c", "bunx prisma db push --skip-generate --accept-data-loss && exec bun .next/standalone/server.js"]
