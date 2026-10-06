-- CreateTable
CREATE TABLE "vehicle_driver_assignment" (
    "id" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "reference_document" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vehicle_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,

    CONSTRAINT "vehicle_driver_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vehicle_driver_assignment_vehicle_id_start_date_idx" ON "vehicle_driver_assignment"("vehicle_id", "start_date");

-- CreateIndex
CREATE INDEX "vehicle_driver_assignment_driver_id_idx" ON "vehicle_driver_assignment"("driver_id");

-- AddForeignKey
ALTER TABLE "vehicle_driver_assignment" ADD CONSTRAINT "vehicle_driver_assignment_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_driver_assignment" ADD CONSTRAINT "vehicle_driver_assignment_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A lo sumo un conductor encargado vigente por vehículo, y un vehículo a cargo
-- vigente por conductor: Prisma no expresa índices únicos parciales en el DSL;
-- mismo patrón que "uq_transport_manager_assignment_unit_active" y
-- "uq_unit_assignment_vehicle_active" (spec 002/003).
CREATE UNIQUE INDEX "uq_vehicle_driver_assignment_vehicle_active"
  ON "vehicle_driver_assignment"("vehicle_id") WHERE "end_date" IS NULL;

CREATE UNIQUE INDEX "uq_vehicle_driver_assignment_driver_active"
  ON "vehicle_driver_assignment"("driver_id") WHERE "end_date" IS NULL;
