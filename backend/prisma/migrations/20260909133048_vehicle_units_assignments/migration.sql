-- CreateEnum
CREATE TYPE "vehicle_condition_code" AS ENUM ('BUENO', 'REGULAR', 'DETERIORADO', 'FUERA_DE_USO', 'INOPERABLE', 'EXTRAVIADO', 'DEVUELTO', 'BAJA');

-- DropIndex
DROP INDEX "vehicle_engine_number_key";

-- DropIndex
DROP INDEX "vehicle_internal_code_key";

-- DropIndex
DROP INDEX "vehicle_qr_token_key";

-- DropIndex
DROP INDEX "vehicle_status_idx";

-- AlterTable
ALTER TABLE "vehicle" DROP COLUMN "acquisition_date",
DROP COLUMN "current_odometer",
DROP COLUMN "fuel_type",
DROP COLUMN "internal_code",
DROP COLUMN "photo_url",
DROP COLUMN "qr_token",
DROP COLUMN "status",
DROP COLUMN "tank_capacity",
ADD COLUMN     "origin" TEXT,
ADD COLUMN     "plate_dnfr" TEXT,
ADD COLUMN     "reception_source" TEXT,
ALTER COLUMN "brand" DROP NOT NULL,
ALTER COLUMN "model" DROP NOT NULL,
ALTER COLUMN "year" DROP NOT NULL;

-- DropEnum
DROP TYPE "vehicle_status";

-- CreateTable
CREATE TABLE "vehicle_condition" (
    "id" TEXT NOT NULL,
    "code" "vehicle_condition_code" NOT NULL,
    "reason" TEXT,
    "registered_by_role" TEXT,
    "changed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vehicle_id" TEXT NOT NULL,

    CONSTRAINT "vehicle_condition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "location" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "parent_id" TEXT,

    CONSTRAINT "unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "officer" (
    "id" TEXT NOT NULL,
    "ci" TEXT NOT NULL,
    "ci_complement" TEXT NOT NULL DEFAULT '',
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "rank" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "current_unit_id" TEXT,

    CONSTRAINT "officer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_manager_assignment" (
    "id" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "reference_document" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unit_id" TEXT NOT NULL,
    "officer_id" TEXT NOT NULL,

    CONSTRAINT "transport_manager_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_assignment" (
    "id" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "reason" TEXT,
    "reference_document" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vehicle_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,

    CONSTRAINT "unit_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vehicle_condition_vehicle_id_changed_at_idx" ON "vehicle_condition"("vehicle_id", "changed_at");

-- CreateIndex
CREATE UNIQUE INDEX "unit_code_key" ON "unit"("code");

-- CreateIndex
CREATE INDEX "unit_parent_id_idx" ON "unit"("parent_id");

-- CreateIndex
CREATE INDEX "officer_current_unit_id_idx" ON "officer"("current_unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "officer_ci_ci_complement_key" ON "officer"("ci", "ci_complement");

-- CreateIndex
CREATE INDEX "transport_manager_assignment_unit_id_start_date_idx" ON "transport_manager_assignment"("unit_id", "start_date");

-- CreateIndex
CREATE INDEX "unit_assignment_vehicle_id_start_date_idx" ON "unit_assignment"("vehicle_id", "start_date");

-- CreateIndex
CREATE INDEX "unit_assignment_unit_id_idx" ON "unit_assignment"("unit_id");

-- AddForeignKey
ALTER TABLE "vehicle_condition" ADD CONSTRAINT "vehicle_condition_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit" ADD CONSTRAINT "unit_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "officer" ADD CONSTRAINT "officer_current_unit_id_fkey" FOREIGN KEY ("current_unit_id") REFERENCES "unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_manager_assignment" ADD CONSTRAINT "transport_manager_assignment_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_manager_assignment" ADD CONSTRAINT "transport_manager_assignment_officer_id_fkey" FOREIGN KEY ("officer_id") REFERENCES "officer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_assignment" ADD CONSTRAINT "unit_assignment_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_assignment" ADD CONSTRAINT "unit_assignment_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- A lo sumo una designación de encargado vigente por unidad (spec 002, RF-19/RF-20).
-- Prisma no expresa índices únicos parciales en el DSL; se agrega a mano.
CREATE UNIQUE INDEX "uq_transport_manager_assignment_unit_active"
  ON "transport_manager_assignment"("unit_id") WHERE "end_date" IS NULL;

-- A lo sumo una asignación de unidad vigente por vehículo (spec 003, RF-03/RF-04).
CREATE UNIQUE INDEX "uq_unit_assignment_vehicle_active"
  ON "unit_assignment"("vehicle_id") WHERE "end_date" IS NULL;
