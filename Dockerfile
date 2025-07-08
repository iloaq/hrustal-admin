# Dockerfile для Хрусталь — Админка
FROM node:20-alpine AS base
WORKDIR /app

# Установка зависимостей
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Сборка приложения
FROM base AS builder
COPY package.json package-lock.json ./
RUN npm ci

# Копируем исходный код
COPY . .

# Генерируем Prisma клиент
RUN npx prisma generate

# Проверяем, что Prisma клиент сгенерирован
RUN echo "=== Проверяем структуру src/generated ==="
RUN ls -la /app/src/generated/
RUN echo "=== Проверяем содержимое src/generated/prisma ==="
RUN ls -la /app/src/generated/prisma/

# Собираем приложение
RUN npm run build

# Проверяем, что сборка прошла успешно
RUN echo "=== Проверяем результат сборки ==="
RUN ls -la /app/.next/
RUN echo "=== Проверяем standalone ==="
RUN ls -la /app/.next/standalone/ || echo "Standalone не найден"

# Production-образ
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Создаем пользователя для безопасности
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Копируем все необходимые файлы
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/generated ./src/generated

# Проверяем, что файлы на месте
RUN echo "=== Проверяем структуру в production образе ==="
RUN ls -la /app/src/generated/prisma/
RUN echo "=== Проверяем server.js ==="
RUN ls -la /app/server.js || echo "server.js не найден"
RUN ls -la /app/.next/standalone/server.js || echo "standalone/server.js не найден"

# Устанавливаем правильные права
USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Пробуем разные пути к server.js
CMD ["sh", "-c", "if [ -f 'server.js' ]; then node server.js; elif [ -f '.next/standalone/server.js' ]; then node .next/standalone/server.js; else echo 'server.js не найден'; exit 1; fi"]
