-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "dotavleno" BOOLEAN DEFAULT false,
ADD COLUMN     "route_exported_at" TIMESTAMP(3),
ADD COLUMN     "stat_oplata" INTEGER DEFAULT 1;
