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

# Проверяем, что все файлы скопированы
RUN echo "=== Проверяем структуру src ==="
RUN ls -la /app/src/
RUN echo "=== Проверяем компоненты ==="
RUN ls -la /app/src/components/
RUN echo "=== Проверяем NotificationService ==="
RUN ls -la /app/src/components/NotificationService.tsx || echo "NotificationService.tsx не найден"
RUN echo "=== Проверяем содержимое NotificationService ==="
RUN head -5 /app/src/components/NotificationService.tsx || echo "Не удалось прочитать файл"
RUN echo "=== Проверяем импорт в driver/page.tsx ==="
RUN grep -n "NotificationService" /app/src/app/driver/page.tsx || echo "Импорт не найден"
RUN echo "=== Проверяем структуру app ==="
RUN ls -la /app/src/app/driver/ || echo "driver не найден"
RUN echo "=== Проверяем файл driver/page.tsx ==="
RUN ls -la /app/src/app/driver/page.tsx || echo "page.tsx не найден"
RUN echo "=== Проверяем содержимое driver/page.tsx ==="
RUN head -10 /app/src/app/driver/page.tsx || echo "Не удалось прочитать файл"
RUN echo "=== Проверяем все файлы в src ==="
RUN find /app/src -name "*.tsx" -o -name "*.ts" | head -20 || echo "Файлы не найдены"

# Генерируем Prisma клиент
RUN npx prisma generate

# Проверяем, что Prisma клиент сгенерирован
RUN echo "=== Проверяем структуру src/generated ==="
RUN ls -la /app/src/generated/
RUN echo "=== Проверяем содержимое src/generated/prisma ==="
RUN ls -la /app/src/generated/prisma/
RUN echo "=== Проверяем компоненты ==="
RUN ls -la /app/src/components/ || echo "components не найден"

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
COPY --from=builder /app/src ./src

# Проверяем, что файлы на месте
RUN echo "=== Проверяем структуру в production образе ==="
RUN ls -la /app/src/
RUN echo "=== Проверяем компоненты ==="
RUN ls -la /app/src/components/ || echo "components не найден"
RUN echo "=== Проверяем NotificationService ==="
RUN ls -la /app/src/components/NotificationService.tsx || echo "NotificationService.tsx не найден"
RUN echo "=== Проверяем содержимое NotificationService ==="
RUN head -5 /app/src/components/NotificationService.tsx || echo "Не удалось прочитать файл"
RUN echo "=== Проверяем импорт в driver/page.tsx ==="
RUN grep -n "NotificationService" /app/src/app/driver/page.tsx || echo "Импорт не найден"
RUN echo "=== Проверяем структуру app ==="
RUN ls -la /app/src/app/driver/ || echo "driver не найден"
RUN echo "=== Проверяем файл driver/page.tsx ==="
RUN ls -la /app/src/app/driver/page.tsx || echo "page.tsx не найден"
RUN echo "=== Проверяем содержимое driver/page.tsx ==="
RUN head -10 /app/src/app/driver/page.tsx || echo "Не удалось прочитать файл"
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
