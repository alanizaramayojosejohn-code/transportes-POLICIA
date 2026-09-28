-- CreateTable
CREATE TABLE "vehicle_photo" (
    "id" TEXT NOT NULL,
    "slot_key" TEXT NOT NULL,
    "data_url" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "vehicle_id" TEXT NOT NULL,

    CONSTRAINT "vehicle_photo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_photo_vehicle_id_slot_key_key" ON "vehicle_photo"("vehicle_id", "slot_key");

-- AddForeignKey
ALTER TABLE "vehicle_photo" ADD CONSTRAINT "vehicle_photo_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
