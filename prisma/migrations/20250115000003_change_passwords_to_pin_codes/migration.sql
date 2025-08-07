-- AlterTable - сначала добавляем новые колонки
ALTER TABLE "drivers" ADD COLUMN "pin_code" VARCHAR(10);
ALTER TABLE "couriers" ADD COLUMN "pin_code" VARCHAR(10);

-- Устанавливаем дефолтные пин-коды для существующих записей
UPDATE "drivers" SET "pin_code" = '1234' WHERE "pin_code" IS NULL;
UPDATE "couriers" SET "pin_code" = '1234' WHERE "pin_code" IS NULL;

-- Делаем поля обязательными
ALTER TABLE "drivers" ALTER COLUMN "pin_code" SET NOT NULL;
ALTER TABLE "couriers" ALTER COLUMN "pin_code" SET NOT NULL;

-- Удаляем старые колонки с паролями
ALTER TABLE "drivers" DROP COLUMN "password";
ALTER TABLE "couriers" DROP COLUMN "password";