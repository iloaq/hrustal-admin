-- CreateTable
CREATE TABLE "vehicle_district_schedule" (
    "id" BIGSERIAL NOT NULL,
    "vehicle_id" BIGINT NOT NULL,
    "district_id" BIGINT NOT NULL,
    "date" DATE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(100),
    "notes" VARCHAR(500),

    CONSTRAINT "vehicle_district_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courier_vehicle_schedule" (
    "id" BIGSERIAL NOT NULL,
    "courier_id" BIGINT NOT NULL,
    "vehicle_id" BIGINT NOT NULL,
    "date" DATE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(100),
    "notes" VARCHAR(500),

    CONSTRAINT "courier_vehicle_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vehicle_district_schedule_date_idx" ON "vehicle_district_schedule"("date");

-- CreateIndex
CREATE INDEX "vehicle_district_schedule_vehicle_id_date_idx" ON "vehicle_district_schedule"("vehicle_id", "date");

-- CreateIndex
CREATE INDEX "vehicle_district_schedule_district_id_date_idx" ON "vehicle_district_schedule"("district_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_district_schedule_vehicle_id_district_id_date_key" ON "vehicle_district_schedule"("vehicle_id", "district_id", "date");

-- CreateIndex
CREATE INDEX "courier_vehicle_schedule_date_idx" ON "courier_vehicle_schedule"("date");

-- CreateIndex
CREATE INDEX "courier_vehicle_schedule_courier_id_date_idx" ON "courier_vehicle_schedule"("courier_id", "date");

-- CreateIndex
CREATE INDEX "courier_vehicle_schedule_vehicle_id_date_idx" ON "courier_vehicle_schedule"("vehicle_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "courier_vehicle_schedule_courier_id_vehicle_id_date_key" ON "courier_vehicle_schedule"("courier_id", "vehicle_id", "date");

-- AddForeignKey
ALTER TABLE "vehicle_district_schedule" ADD CONSTRAINT "vehicle_district_schedule_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_district_schedule" ADD CONSTRAINT "vehicle_district_schedule_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_vehicle_schedule" ADD CONSTRAINT "courier_vehicle_schedule_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "couriers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_vehicle_schedule" ADD CONSTRAINT "courier_vehicle_schedule_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;