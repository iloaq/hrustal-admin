-- CreateTable
CREATE TABLE "orders" (
    "id" BIGSERIAL NOT NULL,
    "external_id" VARCHAR(100),
    "customer_name" VARCHAR(255) NOT NULL,
    "customer_phone" VARCHAR(20),
    "customer_address" VARCHAR(500) NOT NULL,
    "region" VARCHAR(100) NOT NULL,
    "products" JSONB NOT NULL,
    "total_amount" DECIMAL(10,2),
    "delivery_date" DATE NOT NULL,
    "delivery_time" VARCHAR(50),
    "status" VARCHAR(50) NOT NULL DEFAULT 'new',
    "driver_id" BIGINT,
    "vehicle_id" BIGINT,
    "assigned_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reason" VARCHAR(500),
    "driver_notes" VARCHAR(1000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "region_overrides" (
    "id" BIGSERIAL NOT NULL,
    "date" DATE NOT NULL,
    "region" VARCHAR(100) NOT NULL,
    "vehicle_id" BIGINT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(100),
    "notes" VARCHAR(500),

    CONSTRAINT "region_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_external_id_key" ON "orders"("external_id");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_delivery_date_idx" ON "orders"("delivery_date");

-- CreateIndex
CREATE INDEX "orders_driver_id_idx" ON "orders"("driver_id");

-- CreateIndex
CREATE INDEX "orders_region_idx" ON "orders"("region");

-- CreateIndex
CREATE UNIQUE INDEX "region_overrides_date_region_key" ON "region_overrides"("date", "region");

-- CreateIndex
CREATE INDEX "region_overrides_date_idx" ON "region_overrides"("date");

-- CreateIndex
CREATE INDEX "region_overrides_region_idx" ON "region_overrides"("region");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "region_overrides" ADD CONSTRAINT "region_overrides_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
