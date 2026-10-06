-- CreateEnum
CREATE TYPE "spare_part_type" AS ENUM ('LIQUIDO', 'LLANTA', 'PIEZA', 'OTRO');

-- AlterTable
ALTER TABLE "spare_part" ADD COLUMN     "tire_size" TEXT,
ADD COLUMN     "type" "spare_part_type" NOT NULL DEFAULT 'OTRO',
ADD COLUMN     "weight" DECIMAL(10,3);

-- AlterTable
ALTER TABLE "stock_movement" ADD COLUMN     "lot_expires_at" TIMESTAMPTZ(3),
ADD COLUMN     "lot_number" TEXT,
ADD COLUMN     "vehicle_id" TEXT;

-- CreateIndex
CREATE INDEX "spare_part_type_idx" ON "spare_part"("type");

-- CreateIndex
CREATE INDEX "stock_movement_vehicle_id_idx" ON "stock_movement"("vehicle_id");

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
