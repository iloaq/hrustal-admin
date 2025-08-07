-- CreateTable
CREATE TABLE "drivers" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20),
    "login" VARCHAR(50) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "license_number" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_vehicles" (
    "id" BIGSERIAL NOT NULL,
    "driver_id" BIGINT NOT NULL,
    "vehicle_id" BIGINT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "driver_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_districts" (
    "id" BIGSERIAL NOT NULL,
    "driver_id" BIGINT NOT NULL,
    "district_id" BIGINT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "driver_districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_assignments" (
    "id" BIGSERIAL NOT NULL,
    "driver_id" BIGINT NOT NULL,
    "lead_id" BIGINT NOT NULL,
    "vehicle_id" BIGINT,
    "delivery_date" DATE NOT NULL,
    "delivery_time" VARCHAR(50),
    "status" VARCHAR(50) NOT NULL DEFAULT 'assigned',
    "accepted_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "driver_notes" VARCHAR(1000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "drivers_login_key" ON "drivers"("login");

-- CreateIndex
CREATE UNIQUE INDEX "driver_vehicles_driver_id_vehicle_id_key" ON "driver_vehicles"("driver_id", "vehicle_id");

-- CreateIndex
CREATE UNIQUE INDEX "driver_districts_driver_id_district_id_key" ON "driver_districts"("driver_id", "district_id");

-- CreateIndex
CREATE UNIQUE INDEX "driver_assignments_driver_id_lead_id_delivery_date_key" ON "driver_assignments"("driver_id", "lead_id", "delivery_date");

-- CreateIndex
CREATE INDEX "driver_assignments_driver_id_delivery_date_idx" ON "driver_assignments"("driver_id", "delivery_date");

-- CreateIndex
CREATE INDEX "driver_assignments_lead_id_idx" ON "driver_assignments"("lead_id");

-- AddForeignKey
ALTER TABLE "driver_vehicles" ADD CONSTRAINT "driver_vehicles_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_vehicles" ADD CONSTRAINT "driver_vehicles_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_districts" ADD CONSTRAINT "driver_districts_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_districts" ADD CONSTRAINT "driver_districts_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_assignments" ADD CONSTRAINT "driver_assignments_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_assignments" ADD CONSTRAINT "driver_assignments_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("lead_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_assignments" ADD CONSTRAINT "driver_assignments_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;