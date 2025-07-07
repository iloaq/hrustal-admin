-- CreateTable
CREATE TABLE "truck_loadings" (
    "id" BIGSERIAL NOT NULL,
    "loading_date" DATE NOT NULL,
    "truck_name" VARCHAR(100) NOT NULL,
    "truck_area" VARCHAR(100) NOT NULL,
    "time_slot" VARCHAR(50) NOT NULL,
    "hrustalnaya_orders" INTEGER NOT NULL DEFAULT 0,
    "malysh_orders" INTEGER NOT NULL DEFAULT 0,
    "selen_orders" INTEGER NOT NULL DEFAULT 0,
    "hrustalnaya_free" INTEGER NOT NULL DEFAULT 0,
    "malysh_free" INTEGER NOT NULL DEFAULT 0,
    "selen_free" INTEGER NOT NULL DEFAULT 0,
    "notes" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(100),

    CONSTRAINT "truck_loadings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_sessions" (
    "id" BIGSERIAL NOT NULL,
    "date" DATE NOT NULL,
    "time_slot" VARCHAR(20) NOT NULL,
    "hrustalnaya_produced" INTEGER NOT NULL DEFAULT 0,
    "malysh_produced" INTEGER NOT NULL DEFAULT 0,
    "selen_produced" INTEGER NOT NULL DEFAULT 0,
    "bottles_19l_free" INTEGER NOT NULL DEFAULT 100,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "truck_loadings_loading_date_idx" ON "truck_loadings"("loading_date");

-- CreateIndex
CREATE UNIQUE INDEX "truck_loadings_loading_date_truck_name_time_slot_key" ON "truck_loadings"("loading_date", "truck_name", "time_slot");

-- CreateIndex
CREATE UNIQUE INDEX "production_sessions_date_time_slot_key" ON "production_sessions"("date", "time_slot");
