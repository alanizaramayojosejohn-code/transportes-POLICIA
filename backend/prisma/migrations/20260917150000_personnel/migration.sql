-- Fusiona "driver" (spec 005) y "officer" (spec 002) en una sola tabla
-- "personnel" con banderas de rol independientes (is_driver/is_officer/
-- is_admin): representan la misma realidad (una persona del Comando) en dos
-- tablas sin relación, y una persona puede ganar o perder un rol sin dejar
-- de ser la misma ficha.

-- CreateTable
CREATE TABLE "personnel" (
    "id" TEXT NOT NULL,
    "ci" TEXT NOT NULL,
    "ci_complement" TEXT NOT NULL DEFAULT '',
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "rank" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_driver" BOOLEAN NOT NULL DEFAULT false,
    "is_officer" BOOLEAN NOT NULL DEFAULT false,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "license_number" TEXT,
    "license_category" TEXT,
    "license_expires_at" DATE,
    "observations" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "unit_id" TEXT,
    "user_id" TEXT,

    CONSTRAINT "personnel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "personnel_ci_ci_complement_key" ON "personnel"("ci", "ci_complement");

-- CreateIndex
CREATE UNIQUE INDEX "personnel_user_id_key" ON "personnel"("user_id");

-- CreateIndex
CREATE INDEX "personnel_unit_id_idx" ON "personnel"("unit_id");

-- CreateIndex
CREATE INDEX "personnel_is_active_idx" ON "personnel"("is_active");

-- AddForeignKey
ALTER TABLE "personnel" ADD CONSTRAINT "personnel_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personnel" ADD CONSTRAINT "personnel_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- MigrateData: conductores existentes conservan su id, para que assignment/
-- fuel_record/incident no necesiten reescribir su driver_id.
INSERT INTO "personnel" (
  "id", "ci", "ci_complement", "first_name", "last_name", "rank", "phone",
  "is_active", "is_driver", "license_number", "license_category",
  "license_expires_at", "observations", "created_at", "updated_at",
  "unit_id", "user_id"
)
SELECT
  "id", "ci", '', "first_name", "last_name", "rank", "phone",
  "is_active", true, "license_number", "license_category",
  "license_expires_at", "observations", "created_at", "updated_at",
  "unit_id", "user_id"
FROM "driver";

-- MigrateData: personal policial existente. Si la cédula ya llegó desde
-- "driver" (misma persona registrada en ambos padrones), se fusiona sobre
-- esa fila en vez de duplicarla; si no, conserva su id original.
INSERT INTO "personnel" (
  "id", "ci", "ci_complement", "first_name", "last_name", "rank", "phone",
  "email", "is_active", "is_officer", "created_at", "updated_at", "unit_id"
)
SELECT
  "id", "ci", "ci_complement", "first_name", "last_name", "rank", "phone",
  "email", "is_active", true, "created_at", "updated_at", "current_unit_id"
FROM "officer"
ON CONFLICT ("ci", "ci_complement") DO UPDATE SET
  "is_officer" = true,
  "rank" = COALESCE("personnel"."rank", "excluded"."rank"),
  "phone" = COALESCE("personnel"."phone", "excluded"."phone"),
  "email" = COALESCE("personnel"."email", "excluded"."email"),
  "unit_id" = COALESCE("personnel"."unit_id", "excluded"."unit_id");

-- MigrateData: backfill de transport_manager_assignment.officer_id para el
-- caso (hoy no esperado en desarrollo: no hay filas sembradas de driver ni
-- de officer) en que una cédula existía en ambos padrones — la fila fusionada
-- quedó con el id de "driver", no el id original de "officer".
CREATE TEMP TABLE "_officer_id_map" AS
SELECT "o"."id" AS "old_officer_id", "p"."id" AS "new_personnel_id"
FROM "officer" "o"
JOIN "personnel" "p" ON "p"."ci" = "o"."ci" AND "p"."ci_complement" = "o"."ci_complement"
WHERE "p"."id" <> "o"."id";

UPDATE "transport_manager_assignment" "tma"
SET "officer_id" = "map"."new_personnel_id"
FROM "_officer_id_map" "map"
WHERE "tma"."officer_id" = "map"."old_officer_id";

DROP TABLE "_officer_id_map";

-- A lo sumo un número de licencia por persona, pero sólo cuando existe: no
-- toda la ficha de personal conduce. Prisma no expresa índices únicos
-- parciales en el DSL; mismo patrón que "uq_transport_manager_assignment_unit_active".
CREATE UNIQUE INDEX "uq_personnel_license_number"
  ON "personnel"("license_number") WHERE "license_number" IS NOT NULL;

-- Repuntar las FKs de driver_id/officer_id hacia "personnel" antes de poder
-- eliminar "driver" y "officer".
ALTER TABLE "assignment" DROP CONSTRAINT "assignment_driver_id_fkey";
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "fuel_record" DROP CONSTRAINT "fuel_record_driver_id_fkey";
ALTER TABLE "fuel_record" ADD CONSTRAINT "fuel_record_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "personnel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "incident" DROP CONSTRAINT "incident_driver_id_fkey";
ALTER TABLE "incident" ADD CONSTRAINT "incident_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "personnel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "transport_manager_assignment" DROP CONSTRAINT "transport_manager_assignment_officer_id_fkey";
ALTER TABLE "transport_manager_assignment" ADD CONSTRAINT "transport_manager_assignment_officer_id_fkey" FOREIGN KEY ("officer_id") REFERENCES "personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropTable
DROP TABLE "driver";

-- DropTable
DROP TABLE "officer";
