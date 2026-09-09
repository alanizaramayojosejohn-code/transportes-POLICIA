-- CreateEnum
CREATE TYPE "audit_action" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'APPROVE', 'REJECT');

-- CreateEnum
CREATE TYPE "vehicle_type" AS ENUM ('AUTOMOVIL', 'CAMIONETA', 'MOTOCICLETA', 'MINIBUS', 'CAMION', 'AMBULANCIA', 'OTRO');

-- CreateEnum
CREATE TYPE "fuel_type" AS ENUM ('GASOLINA', 'DIESEL', 'GNV', 'ELECTRICO');

-- CreateEnum
CREATE TYPE "vehicle_status" AS ENUM ('AVAILABLE', 'ASSIGNED', 'IN_MAINTENANCE', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "request_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "assignment_status" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "odometer_source" AS ENUM ('TRIP_DEPARTURE', 'TRIP_RETURN', 'FUEL', 'MAINTENANCE', 'MANUAL');

-- CreateEnum
CREATE TYPE "maintenance_type" AS ENUM ('PREVENTIVE', 'CORRECTIVE');

-- CreateEnum
CREATE TYPE "maintenance_status" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "document_type" AS ENUM ('SOAT', 'INSPECCION_TECNICA', 'RUAT', 'POLIZA_SEGURO', 'CERTIFICADO_GNV', 'OTRO');

-- CreateEnum
CREATE TYPE "incident_type" AS ENUM ('ACCIDENTE', 'AVERIA', 'ROBO', 'INFRACCION', 'OTRO');

-- CreateEnum
CREATE TYPE "incident_severity" AS ENUM ('MINOR', 'MODERATE', 'SEVERE');

-- CreateEnum
CREATE TYPE "stock_movement_type" AS ENUM ('IN', 'OUT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "alert_type" AS ENUM ('MAINTENANCE_DUE', 'DOCUMENT_EXPIRING', 'LICENSE_EXPIRING', 'LOW_STOCK', 'ODOMETER_INCONSISTENCY');

-- CreateEnum
CREATE TYPE "alert_severity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "rank" TEXT,
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "role_id" TEXT NOT NULL,
    "department_id" TEXT,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "module" TEXT NOT NULL,

    CONSTRAINT "permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permission" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,

    CONSTRAINT "role_permission_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "action" "audit_action" NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "department" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "parent_id" TEXT,

    CONSTRAINT "department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle" (
    "id" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "internal_code" TEXT NOT NULL,
    "qr_token" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "color" TEXT,
    "chassis_number" TEXT,
    "engine_number" TEXT,
    "type" "vehicle_type" NOT NULL,
    "fuel_type" "fuel_type" NOT NULL,
    "tank_capacity" DECIMAL(8,2),
    "status" "vehicle_status" NOT NULL DEFAULT 'AVAILABLE',
    "current_odometer" INTEGER NOT NULL DEFAULT 0,
    "acquisition_date" DATE,
    "observations" TEXT,
    "photo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "department_id" TEXT,

    CONSTRAINT "vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "ci" TEXT NOT NULL,
    "rank" TEXT,
    "license_number" TEXT NOT NULL,
    "license_category" TEXT NOT NULL,
    "license_expires_at" DATE NOT NULL,
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "user_id" TEXT,
    "department_id" TEXT,

    CONSTRAINT "driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_request" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "requested_from" TIMESTAMPTZ(3) NOT NULL,
    "requested_to" TIMESTAMPTZ(3) NOT NULL,
    "passengers" INTEGER NOT NULL DEFAULT 1,
    "status" "request_status" NOT NULL DEFAULT 'PENDING',
    "review_notes" TEXT,
    "reviewed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "requester_id" TEXT NOT NULL,
    "reviewed_by_id" TEXT,

    CONSTRAINT "vehicle_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment" (
    "id" TEXT NOT NULL,
    "assigned_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "assignment_status" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "request_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "assigned_by_id" TEXT NOT NULL,

    CONSTRAINT "assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip" (
    "id" TEXT NOT NULL,
    "departure_at" TIMESTAMPTZ(3) NOT NULL,
    "departure_odometer" INTEGER NOT NULL,
    "departure_fuel_level" INTEGER,
    "departure_condition_notes" TEXT,
    "return_at" TIMESTAMPTZ(3),
    "return_odometer" INTEGER,
    "return_fuel_level" INTEGER,
    "return_condition_notes" TEXT,
    "damages_found" TEXT,
    "incident_notes" TEXT,
    "distance_km" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "departure_registered_by_id" TEXT NOT NULL,
    "return_registered_by_id" TEXT,

    CONSTRAINT "trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "odometer_reading" (
    "id" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "reading_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "odometer_source" NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vehicle_id" TEXT NOT NULL,
    "registered_by_id" TEXT NOT NULL,

    CONSTRAINT "odometer_reading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_order" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "maintenance_type" NOT NULL,
    "status" "maintenance_status" NOT NULL DEFAULT 'SCHEDULED',
    "description" TEXT NOT NULL,
    "workshop_name" TEXT,
    "odometer" INTEGER NOT NULL,
    "scheduled_for" TIMESTAMPTZ(3),
    "started_at" TIMESTAMPTZ(3),
    "finished_at" TIMESTAMPTZ(3),
    "labor_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "invoice_number" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "registered_by_id" TEXT NOT NULL,

    CONSTRAINT "maintenance_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_item" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "unit_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "order_id" TEXT NOT NULL,
    "spare_part_id" TEXT,

    CONSTRAINT "maintenance_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_plan" (
    "id" TEXT NOT NULL,
    "task_name" TEXT NOT NULL,
    "interval_km" INTEGER NOT NULL,
    "last_service_odometer" INTEGER,
    "last_service_at" TIMESTAMPTZ(3),
    "next_due_odometer" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "vehicle_id" TEXT NOT NULL,

    CONSTRAINT "maintenance_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuel_record" (
    "id" TEXT NOT NULL,
    "supplied_at" TIMESTAMPTZ(3) NOT NULL,
    "fuel_type" "fuel_type" NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "total_cost" DECIMAL(12,2) NOT NULL,
    "station" TEXT,
    "ticket_number" TEXT,
    "odometer" INTEGER NOT NULL,
    "efficiency_km_per_unit" DECIMAL(8,2),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "driver_id" TEXT,
    "trip_id" TEXT,
    "registered_by_id" TEXT NOT NULL,

    CONSTRAINT "fuel_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_document" (
    "id" TEXT NOT NULL,
    "type" "document_type" NOT NULL,
    "document_number" TEXT,
    "issued_at" DATE,
    "expires_at" DATE NOT NULL,
    "file_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "vehicle_id" TEXT NOT NULL,

    CONSTRAINT "vehicle_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "incident_type" NOT NULL,
    "severity" "incident_severity" NOT NULL DEFAULT 'MINOR',
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "place" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "damages" TEXT,
    "people_involved" JSONB,
    "police_report_number" TEXT,
    "estimated_cost" DECIMAL(12,2),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "driver_id" TEXT,
    "trip_id" TEXT,
    "registered_by_id" TEXT NOT NULL,

    CONSTRAINT "incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_attachment" (
    "id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "incident_id" TEXT NOT NULL,

    CONSTRAINT "incident_attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spare_part_category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spare_part_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spare_part" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'unidad',
    "min_stock" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "current_stock" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "last_unit_cost" DECIMAL(12,2),
    "location" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "category_id" TEXT,

    CONSTRAINT "spare_part_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movement" (
    "id" TEXT NOT NULL,
    "type" "stock_movement_type" NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit_cost" DECIMAL(12,2),
    "balance_after" DECIMAL(10,2) NOT NULL,
    "reason" TEXT,
    "supplier" TEXT,
    "reference" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "spare_part_id" TEXT NOT NULL,
    "registered_by_id" TEXT NOT NULL,

    CONSTRAINT "stock_movement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert" (
    "id" TEXT NOT NULL,
    "type" "alert_type" NOT NULL,
    "severity" "alert_severity" NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_role_id_idx" ON "user"("role_id");

-- CreateIndex
CREATE INDEX "user_department_id_idx" ON "user"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_code_key" ON "role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permission_code_key" ON "permission"("code");

-- CreateIndex
CREATE INDEX "permission_module_idx" ON "permission"("module");

-- CreateIndex
CREATE INDEX "role_permission_permission_id_idx" ON "role_permission"("permission_id");

-- CreateIndex
CREATE INDEX "audit_log_entity_entity_id_idx" ON "audit_log"("entity", "entity_id");

-- CreateIndex
CREATE INDEX "audit_log_user_id_idx" ON "audit_log"("user_id");

-- CreateIndex
CREATE INDEX "audit_log_created_at_idx" ON "audit_log"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "department_code_key" ON "department"("code");

-- CreateIndex
CREATE INDEX "department_parent_id_idx" ON "department"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_plate_key" ON "vehicle"("plate");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_internal_code_key" ON "vehicle"("internal_code");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_qr_token_key" ON "vehicle"("qr_token");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_chassis_number_key" ON "vehicle"("chassis_number");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_engine_number_key" ON "vehicle"("engine_number");

-- CreateIndex
CREATE INDEX "vehicle_status_idx" ON "vehicle"("status");

-- CreateIndex
CREATE INDEX "vehicle_department_id_idx" ON "vehicle"("department_id");

-- CreateIndex
CREATE INDEX "vehicle_plate_idx" ON "vehicle"("plate");

-- CreateIndex
CREATE UNIQUE INDEX "driver_ci_key" ON "driver"("ci");

-- CreateIndex
CREATE UNIQUE INDEX "driver_license_number_key" ON "driver"("license_number");

-- CreateIndex
CREATE UNIQUE INDEX "driver_user_id_key" ON "driver"("user_id");

-- CreateIndex
CREATE INDEX "driver_department_id_idx" ON "driver"("department_id");

-- CreateIndex
CREATE INDEX "driver_is_active_idx" ON "driver"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_request_code_key" ON "vehicle_request"("code");

-- CreateIndex
CREATE INDEX "vehicle_request_status_idx" ON "vehicle_request"("status");

-- CreateIndex
CREATE INDEX "vehicle_request_requester_id_idx" ON "vehicle_request"("requester_id");

-- CreateIndex
CREATE INDEX "vehicle_request_requested_from_idx" ON "vehicle_request"("requested_from");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_request_id_key" ON "assignment"("request_id");

-- CreateIndex
CREATE INDEX "assignment_vehicle_id_idx" ON "assignment"("vehicle_id");

-- CreateIndex
CREATE INDEX "assignment_driver_id_idx" ON "assignment"("driver_id");

-- CreateIndex
CREATE INDEX "assignment_status_idx" ON "assignment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "trip_assignment_id_key" ON "trip"("assignment_id");

-- CreateIndex
CREATE INDEX "trip_departure_at_idx" ON "trip"("departure_at");

-- CreateIndex
CREATE INDEX "trip_return_at_idx" ON "trip"("return_at");

-- CreateIndex
CREATE INDEX "odometer_reading_vehicle_id_reading_at_idx" ON "odometer_reading"("vehicle_id", "reading_at");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_order_code_key" ON "maintenance_order"("code");

-- CreateIndex
CREATE INDEX "maintenance_order_vehicle_id_finished_at_idx" ON "maintenance_order"("vehicle_id", "finished_at");

-- CreateIndex
CREATE INDEX "maintenance_order_status_idx" ON "maintenance_order"("status");

-- CreateIndex
CREATE INDEX "maintenance_item_order_id_idx" ON "maintenance_item"("order_id");

-- CreateIndex
CREATE INDEX "maintenance_item_spare_part_id_idx" ON "maintenance_item"("spare_part_id");

-- CreateIndex
CREATE INDEX "maintenance_plan_next_due_odometer_idx" ON "maintenance_plan"("next_due_odometer");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_plan_vehicle_id_task_name_key" ON "maintenance_plan"("vehicle_id", "task_name");

-- CreateIndex
CREATE INDEX "fuel_record_vehicle_id_supplied_at_idx" ON "fuel_record"("vehicle_id", "supplied_at");

-- CreateIndex
CREATE INDEX "fuel_record_supplied_at_idx" ON "fuel_record"("supplied_at");

-- CreateIndex
CREATE INDEX "vehicle_document_vehicle_id_idx" ON "vehicle_document"("vehicle_id");

-- CreateIndex
CREATE INDEX "vehicle_document_expires_at_idx" ON "vehicle_document"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "incident_code_key" ON "incident"("code");

-- CreateIndex
CREATE INDEX "incident_vehicle_id_occurred_at_idx" ON "incident"("vehicle_id", "occurred_at");

-- CreateIndex
CREATE INDEX "incident_occurred_at_idx" ON "incident"("occurred_at");

-- CreateIndex
CREATE INDEX "incident_attachment_incident_id_idx" ON "incident_attachment"("incident_id");

-- CreateIndex
CREATE UNIQUE INDEX "spare_part_category_name_key" ON "spare_part_category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "spare_part_code_key" ON "spare_part"("code");

-- CreateIndex
CREATE INDEX "spare_part_category_id_idx" ON "spare_part"("category_id");

-- CreateIndex
CREATE INDEX "spare_part_is_active_idx" ON "spare_part"("is_active");

-- CreateIndex
CREATE INDEX "stock_movement_spare_part_id_created_at_idx" ON "stock_movement"("spare_part_id", "created_at");

-- CreateIndex
CREATE INDEX "stock_movement_created_at_idx" ON "stock_movement"("created_at");

-- CreateIndex
CREATE INDEX "alert_is_read_created_at_idx" ON "alert"("is_read", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "alert_type_entity_type_entity_id_resolved_at_key" ON "alert"("type", "entity_type", "entity_id", "resolved_at");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department" ADD CONSTRAINT "department_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle" ADD CONSTRAINT "vehicle_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver" ADD CONSTRAINT "driver_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver" ADD CONSTRAINT "driver_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_request" ADD CONSTRAINT "vehicle_request_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_request" ADD CONSTRAINT "vehicle_request_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "vehicle_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip" ADD CONSTRAINT "trip_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip" ADD CONSTRAINT "trip_departure_registered_by_id_fkey" FOREIGN KEY ("departure_registered_by_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip" ADD CONSTRAINT "trip_return_registered_by_id_fkey" FOREIGN KEY ("return_registered_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "odometer_reading" ADD CONSTRAINT "odometer_reading_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "odometer_reading" ADD CONSTRAINT "odometer_reading_registered_by_id_fkey" FOREIGN KEY ("registered_by_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_order" ADD CONSTRAINT "maintenance_order_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_order" ADD CONSTRAINT "maintenance_order_registered_by_id_fkey" FOREIGN KEY ("registered_by_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_item" ADD CONSTRAINT "maintenance_item_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "maintenance_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_item" ADD CONSTRAINT "maintenance_item_spare_part_id_fkey" FOREIGN KEY ("spare_part_id") REFERENCES "spare_part"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_plan" ADD CONSTRAINT "maintenance_plan_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_record" ADD CONSTRAINT "fuel_record_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_record" ADD CONSTRAINT "fuel_record_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_record" ADD CONSTRAINT "fuel_record_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_record" ADD CONSTRAINT "fuel_record_registered_by_id_fkey" FOREIGN KEY ("registered_by_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_document" ADD CONSTRAINT "vehicle_document_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident" ADD CONSTRAINT "incident_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident" ADD CONSTRAINT "incident_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident" ADD CONSTRAINT "incident_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident" ADD CONSTRAINT "incident_registered_by_id_fkey" FOREIGN KEY ("registered_by_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_attachment" ADD CONSTRAINT "incident_attachment_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spare_part" ADD CONSTRAINT "spare_part_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "spare_part_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_spare_part_id_fkey" FOREIGN KEY ("spare_part_id") REFERENCES "spare_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_registered_by_id_fkey" FOREIGN KEY ("registered_by_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
