-- AlterEnum
ALTER TYPE "audit_action" ADD VALUE 'STATUS_CHANGE';

-- AlterTable
ALTER TABLE "audit_log" ADD COLUMN     "entity_label" TEXT;
