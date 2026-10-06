-- AlterEnum
ALTER TYPE "vehicle_condition_code" ADD VALUE 'SINIESTRADO';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "vehicle_type" ADD VALUE 'CAMION_CISTERNA';
ALTER TYPE "vehicle_type" ADD VALUE 'CAMION_GRUA';
ALTER TYPE "vehicle_type" ADD VALUE 'CAMION_BOMBERO';
ALTER TYPE "vehicle_type" ADD VALUE 'CAMION_RESCATE';
ALTER TYPE "vehicle_type" ADD VALUE 'CUADRATRACK';
ALTER TYPE "vehicle_type" ADD VALUE 'FURGON';
