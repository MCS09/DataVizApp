# 1. Install dependencies
FROM node:20-slim AS deps
WORKDIR /app
COPY datavizapp/package.json datavizapp/package-lock.json ./
RUN npm ci

# 2. Build the app
FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY datavizapp/ ./
RUN npm run build

# 3. Run the app in production
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npx", "next", "start", "-H", "0.0.0.0"]