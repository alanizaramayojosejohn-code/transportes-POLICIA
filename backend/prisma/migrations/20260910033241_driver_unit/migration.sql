-- AlterTable
ALTER TABLE "driver" ADD COLUMN     "unit_id" TEXT;

-- CreateIndex
CREATE INDEX "driver_unit_id_idx" ON "driver"("unit_id");

-- AddForeignKey
ALTER TABLE "driver" ADD CONSTRAINT "driver_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
