-- CreateTable
CREATE TABLE "leads" (
    "lead_id" BIGINT NOT NULL,
    "name" VARCHAR(255),
    "status_id" BIGINT,
    "status_name" VARCHAR(255),
    "responsible_user_id" BIGINT,
    "responsible_user_name" VARCHAR(255),
    "created_at" TIMESTAMP(0),
    "updated_at" TIMESTAMP(0),
    "delivery_date" DATE,
    "products" JSONB,
    "total_liters" DECIMAL(65,30),
    "info" JSONB,
    "delivery_time" VARCHAR(255),
    "na_zamenu" BOOLEAN,
    "oplata" VARCHAR(255),
    "comment" VARCHAR(600),
    "odin_s" VARCHAR(255),

    CONSTRAINT "leads_pkey" PRIMARY KEY ("lead_id")
);

-- CreateTable
CREATE TABLE "truck_assignments" (
    "id" BIGSERIAL NOT NULL,
    "lead_id" BIGINT NOT NULL,
    "truck_name" VARCHAR(100) NOT NULL,
    "delivery_date" DATE NOT NULL,
    "delivery_time" VARCHAR(50) NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" VARCHAR(100),
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "notes" VARCHAR(500),

    CONSTRAINT "truck_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "truck_assignments_lead_id_delivery_date_key" ON "truck_assignments"("lead_id", "delivery_date");

-- AddForeignKey
ALTER TABLE "truck_assignments" ADD CONSTRAINT "truck_assignments_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("lead_id") ON DELETE CASCADE ON UPDATE CASCADE;
