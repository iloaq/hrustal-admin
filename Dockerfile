# Dockerfile для Хрусталь — Админка
FROM node:20-alpine AS base
WORKDIR /app

# Установить только prod-зависимости для запуска
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Сборка приложения
FROM base AS builder
COPY . .
RUN npm ci
RUN npm run build

# Production-образ
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Копируем только необходимые файлы
COPY --from=builder /app/.next .next
COPY --from=builder /app/public public
COPY --from=builder /app/package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.ts ./

# Применить миграции Prisma (если нужно)
# RUN npx prisma generate
# RUN npx prisma migrate deploy

EXPOSE 3000
CMD ["npm", "start"] 