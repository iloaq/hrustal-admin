-- CreateTable
CREATE TABLE "vehicles" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "brand" VARCHAR(100),
    "license_plate" VARCHAR(20),
    "capacity" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "couriers" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20),
    "login" VARCHAR(50) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "couriers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "districts" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courier_vehicles" (
    "id" BIGSERIAL NOT NULL,
    "courier_id" BIGINT NOT NULL,
    "vehicle_id" BIGINT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "courier_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courier_districts" (
    "id" BIGSERIAL NOT NULL,
    "courier_id" BIGINT NOT NULL,
    "district_id" BIGINT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "courier_districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_districts" (
    "id" BIGSERIAL NOT NULL,
    "vehicle_id" BIGINT NOT NULL,
    "district_id" BIGINT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "vehicle_districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courier_tasks" (
    "id" BIGSERIAL NOT NULL,
    "courier_id" BIGINT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" VARCHAR(1000),
    "address" VARCHAR(500),
    "client_name" VARCHAR(100),
    "client_phone" VARCHAR(20),
    "task_date" DATE NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "priority" VARCHAR(50) NOT NULL DEFAULT 'normal',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "notes" VARCHAR(1000),

    CONSTRAINT "courier_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_name_key" ON "vehicles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "couriers_login_key" ON "couriers"("login");

-- CreateIndex
CREATE UNIQUE INDEX "districts_name_key" ON "districts"("name");

-- CreateIndex
CREATE UNIQUE INDEX "courier_vehicles_courier_id_vehicle_id_key" ON "courier_vehicles"("courier_id", "vehicle_id");

-- CreateIndex
CREATE UNIQUE INDEX "courier_districts_courier_id_district_id_key" ON "courier_districts"("courier_id", "district_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_districts_vehicle_id_district_id_key" ON "vehicle_districts"("vehicle_id", "district_id");

-- CreateIndex
CREATE INDEX "courier_tasks_courier_id_task_date_idx" ON "courier_tasks"("courier_id", "task_date");

-- AddForeignKey
ALTER TABLE "courier_vehicles" ADD CONSTRAINT "courier_vehicles_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "couriers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_vehicles" ADD CONSTRAINT "courier_vehicles_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_districts" ADD CONSTRAINT "courier_districts_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "couriers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_districts" ADD CONSTRAINT "courier_districts_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_districts" ADD CONSTRAINT "vehicle_districts_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_districts" ADD CONSTRAINT "vehicle_districts_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_tasks" ADD CONSTRAINT "courier_tasks_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "couriers"("id") ON DELETE CASCADE ON UPDATE CASCADE;