-- CreateEnum
CREATE TYPE "procedure_action" AS ENUM ('VEHICLE_REGISTRATION', 'FUEL_VOUCHER', 'SPARE_PART_DELIVERY', 'MAINTENANCE_ORDER');

-- AlterTable
ALTER TABLE "stock_movement" ADD COLUMN     "maintenance_order_id" TEXT;

-- CreateTable
CREATE TABLE "procedure_type" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "action" "procedure_action" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "procedure_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedure_checklist_item" (
    "id" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "document_code" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "procedure_type_id" TEXT NOT NULL,
    "vehicle_id" TEXT,
    "fuel_record_id" TEXT,
    "stock_movement_id" TEXT,
    "maintenance_order_id" TEXT,

    CONSTRAINT "procedure_checklist_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_movement_maintenance_order_id_idx" ON "stock_movement"("maintenance_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "procedure_type_name_action_key" ON "procedure_type"("name", "action");

-- CreateIndex
CREATE INDEX "procedure_type_action_is_active_idx" ON "procedure_type"("action", "is_active");

-- CreateIndex
CREATE INDEX "procedure_checklist_item_procedure_type_id_idx" ON "procedure_checklist_item"("procedure_type_id");

-- CreateIndex
CREATE INDEX "procedure_checklist_item_vehicle_id_idx" ON "procedure_checklist_item"("vehicle_id");

-- CreateIndex
CREATE INDEX "procedure_checklist_item_fuel_record_id_idx" ON "procedure_checklist_item"("fuel_record_id");

-- CreateIndex
CREATE INDEX "procedure_checklist_item_stock_movement_id_idx" ON "procedure_checklist_item"("stock_movement_id");

-- CreateIndex
CREATE INDEX "procedure_checklist_item_maintenance_order_id_idx" ON "procedure_checklist_item"("maintenance_order_id");

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_maintenance_order_id_fkey" FOREIGN KEY ("maintenance_order_id") REFERENCES "maintenance_order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_checklist_item" ADD CONSTRAINT "procedure_checklist_item_procedure_type_id_fkey" FOREIGN KEY ("procedure_type_id") REFERENCES "procedure_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_checklist_item" ADD CONSTRAINT "procedure_checklist_item_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_checklist_item" ADD CONSTRAINT "procedure_checklist_item_fuel_record_id_fkey" FOREIGN KEY ("fuel_record_id") REFERENCES "fuel_record"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_checklist_item" ADD CONSTRAINT "procedure_checklist_item_stock_movement_id_fkey" FOREIGN KEY ("stock_movement_id") REFERENCES "stock_movement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_checklist_item" ADD CONSTRAINT "procedure_checklist_item_maintenance_order_id_fkey" FOREIGN KEY ("maintenance_order_id") REFERENCES "maintenance_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
