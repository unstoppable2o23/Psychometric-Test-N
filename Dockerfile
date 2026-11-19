FROM node:20-slim AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json bun.lock* ./
RUN npm install --legacy-peer-deps

# Build application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate Prisma client
RUN npx prisma generate
# Build Next.js
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy standalone build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/scripts/out ./scripts/out
COPY --from=builder /app/package.json ./

# Create directories for generated files
RUN mkdir -p var/reports download

# Expose port
EXPOSE 3000

# Set environment
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run database migration and start server
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node server.js"]
