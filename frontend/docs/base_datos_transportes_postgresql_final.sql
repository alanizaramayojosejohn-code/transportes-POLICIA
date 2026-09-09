-- ============================================================
-- SISTEMA DE GESTIÓN VEHICULAR - ÁREA DE TRANSPORTES
-- Comando Departamental de Policía - Oruro
-- Modelo lógico / físico PostgreSQL - Versión 2
--
-- Principio:
-- Centraliza y da trazabilidad a la información institucional,
-- pero no reemplaza actas, firmas, hojas de ruta, POA,
-- autorizaciones ni procedimientos administrativos.
-- ============================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS transportes;
SET search_path TO transportes, public;

-- ============================================================
-- 1. ORGANIZACIÓN INSTITUCIONAL
-- ============================================================

CREATE TABLE unidad (
    id_unidad BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_unidad_superior BIGINT REFERENCES unidad(id_unidad),
    codigo VARCHAR(30),
    nombre VARCHAR(150) NOT NULL,
    tipo VARCHAR(80),
    ubicacion VARCHAR(180),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_unidad_codigo
    ON unidad (LOWER(codigo))
    WHERE codigo IS NOT NULL;


CREATE TABLE personal_policial (
    id_personal BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_unidad_actual BIGINT REFERENCES unidad(id_unidad),
    ci VARCHAR(20) NOT NULL,
    complemento VARCHAR(10),
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(120) NOT NULL,
    grado VARCHAR(80),
    telefono VARCHAR(30),
    email VARCHAR(150),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_personal_ci
    ON personal_policial (ci, COALESCE(complemento, ''));


CREATE TABLE licencia_conducir (
    id_licencia BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_personal BIGINT NOT NULL REFERENCES personal_policial(id_personal),
    numero_licencia VARCHAR(50),
    categoria VARCHAR(30),
    fecha_emision DATE,
    fecha_vencimiento DATE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    observaciones TEXT,
    CONSTRAINT ck_licencia_fechas
        CHECK (
            fecha_emision IS NULL
            OR fecha_vencimiento IS NULL
            OR fecha_vencimiento >= fecha_emision
        )
);

CREATE UNIQUE INDEX uq_licencia_personal_activa
    ON licencia_conducir(id_personal)
    WHERE activo = TRUE;


-- ============================================================
-- 2. USUARIOS, ROLES Y PERMISOS
-- ============================================================

CREATE TABLE rol (
    id_rol BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE permiso (
    id_permiso BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(80) NOT NULL UNIQUE,
    nombre VARCHAR(120) NOT NULL,
    descripcion TEXT
);

CREATE TABLE usuario (
    id_usuario BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_personal BIGINT REFERENCES personal_policial(id_personal),
    username VARCHAR(80) NOT NULL,
    password_hash TEXT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_acceso TIMESTAMPTZ,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_usuario_username
    ON usuario(LOWER(username));

CREATE TABLE usuario_rol (
    id_usuario BIGINT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    id_rol BIGINT NOT NULL REFERENCES rol(id_rol) ON DELETE CASCADE,
    PRIMARY KEY (id_usuario, id_rol)
);

CREATE TABLE rol_permiso (
    id_rol BIGINT NOT NULL REFERENCES rol(id_rol) ON DELETE CASCADE,
    id_permiso BIGINT NOT NULL REFERENCES permiso(id_permiso) ON DELETE CASCADE,
    PRIMARY KEY (id_rol, id_permiso)
);


-- ============================================================
-- 3. VEHÍCULOS Y ESTADOS
-- ============================================================

CREATE TABLE estado_vehiculo (
    id_estado BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(40) NOT NULL UNIQUE,
    nombre VARCHAR(80) NOT NULL,
    descripcion TEXT,
    es_operativo BOOLEAN
);

CREATE TABLE vehiculo (
    id_vehiculo BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    placa VARCHAR(20),
    placa_dnfr VARCHAR(30),
    clase VARCHAR(80),
    tipo_modelo VARCHAR(120),
    marca VARCHAR(80),
    modelo VARCHAR(100),
    anio_modelo SMALLINT,
    nro_chasis VARCHAR(100),
    nro_motor VARCHAR(100),
    origen VARCHAR(100),
    color VARCHAR(60),
    fuente_recepcion VARCHAR(120),
    codigo_qr VARCHAR(150),
    observaciones TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_vehiculo_anio
        CHECK (anio_modelo IS NULL OR anio_modelo BETWEEN 1900 AND 2200)
);

CREATE UNIQUE INDEX uq_vehiculo_placa
    ON vehiculo(LOWER(placa))
    WHERE placa IS NOT NULL;

CREATE UNIQUE INDEX uq_vehiculo_chasis
    ON vehiculo(LOWER(nro_chasis))
    WHERE nro_chasis IS NOT NULL;

CREATE UNIQUE INDEX uq_vehiculo_qr
    ON vehiculo(codigo_qr)
    WHERE codigo_qr IS NOT NULL;


-- ============================================================
-- 4. DOCUMENTACIÓN / EXPEDIENTE DIGITAL
-- ============================================================

CREATE TABLE tipo_documento (
    id_tipo_documento BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(60) NOT NULL UNIQUE,
    nombre VARCHAR(120) NOT NULL,
    tiene_vencimiento BOOLEAN NOT NULL DEFAULT FALSE,
    descripcion TEXT
);

CREATE TABLE documento (
    id_documento BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_vehiculo BIGINT REFERENCES vehiculo(id_vehiculo),
    id_tipo_documento BIGINT NOT NULL REFERENCES tipo_documento(id_tipo_documento),
    id_usuario_registro BIGINT REFERENCES usuario(id_usuario),
    numero_documento VARCHAR(100),
    titulo VARCHAR(180),
    descripcion TEXT,
    fecha_documento DATE,
    fecha_emision DATE,
    fecha_vencimiento DATE,
    ruta_archivo TEXT,
    hash_archivo VARCHAR(128),
    observaciones TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_documento_vencimiento
        CHECK (
            fecha_emision IS NULL
            OR fecha_vencimiento IS NULL
            OR fecha_vencimiento >= fecha_emision
        )
);


-- ============================================================
-- 5. HISTORIAL DEL ESTADO DEL VEHÍCULO
-- ============================================================

CREATE TABLE historial_estado_vehiculo (
    id_historial BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_vehiculo BIGINT NOT NULL REFERENCES vehiculo(id_vehiculo),
    id_estado BIGINT NOT NULL REFERENCES estado_vehiculo(id_estado),
    id_usuario BIGINT REFERENCES usuario(id_usuario),
    fecha_cambio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    motivo TEXT,
    documento_referencia VARCHAR(120),
    observaciones TEXT
);

CREATE INDEX ix_historial_estado_vehiculo_fecha
    ON historial_estado_vehiculo(id_vehiculo, fecha_cambio DESC);


-- ============================================================
-- 6. RECEPCIÓN E INCORPORACIÓN
-- ============================================================

CREATE TABLE entidad_proveedora (
    id_entidad BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(180) NOT NULL,
    tipo VARCHAR(100),
    descripcion TEXT,
    contacto VARCHAR(180),
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE recepcion_vehiculo (
    id_recepcion BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_vehiculo BIGINT NOT NULL REFERENCES vehiculo(id_vehiculo),
    id_entidad BIGINT REFERENCES entidad_proveedora(id_entidad),
    fecha_recepcion DATE,
    fecha_verificacion DATE,
    fecha_conformidad DATE,
    fecha_asentamiento DATE,
    observaciones TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE recepcion_documento (
    id_recepcion BIGINT NOT NULL REFERENCES recepcion_vehiculo(id_recepcion) ON DELETE CASCADE,
    id_documento BIGINT NOT NULL REFERENCES documento(id_documento),
    PRIMARY KEY (id_recepcion, id_documento)
);


-- ============================================================
-- 7. ASIGNACIÓN DE VEHÍCULOS A UNIDADES
-- ============================================================

CREATE TABLE asignacion_unidad (
    id_asignacion BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_vehiculo BIGINT NOT NULL REFERENCES vehiculo(id_vehiculo),
    id_unidad BIGINT NOT NULL REFERENCES unidad(id_unidad),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    motivo TEXT,
    documento_referencia VARCHAR(120),
    observaciones TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_asignacion_unidad_fechas
        CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);

CREATE UNIQUE INDEX uq_asignacion_unidad_vehiculo_activa
    ON asignacion_unidad(id_vehiculo)
    WHERE fecha_fin IS NULL;

CREATE INDEX ix_asignacion_unidad_historial
    ON asignacion_unidad(id_vehiculo, fecha_inicio DESC);

CREATE TABLE asignacion_unidad_documento (
    id_asignacion BIGINT NOT NULL REFERENCES asignacion_unidad(id_asignacion) ON DELETE CASCADE,
    id_documento BIGINT NOT NULL REFERENCES documento(id_documento),
    PRIMARY KEY (id_asignacion, id_documento)
);


-- ============================================================
-- 8. ENCARGADOS DE TRANSPORTES POR UNIDAD
-- ============================================================

CREATE TABLE encargado_transportes_unidad (
    id_encargado BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_unidad BIGINT NOT NULL REFERENCES unidad(id_unidad),
    id_personal BIGINT NOT NULL REFERENCES personal_policial(id_personal),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    documento_referencia VARCHAR(120),
    observaciones TEXT,
    CONSTRAINT ck_encargado_fechas
        CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);

CREATE UNIQUE INDEX uq_encargado_transportes_unidad_activo
    ON encargado_transportes_unidad(id_unidad)
    WHERE fecha_fin IS NULL;


-- ============================================================
-- 9. ASIGNACIÓN DE CONDUCTORES
-- ============================================================

CREATE TABLE asignacion_conductor (
    id_asignacion_conductor BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_personal BIGINT NOT NULL REFERENCES personal_policial(id_personal),
    id_vehiculo BIGINT NOT NULL REFERENCES vehiculo(id_vehiculo),
    id_unidad BIGINT NOT NULL REFERENCES unidad(id_unidad),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    motivo_fin TEXT,
    documento_referencia VARCHAR(120),
    observaciones TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_asignacion_conductor_fechas
        CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);

CREATE UNIQUE INDEX uq_asignacion_conductor_vehiculo_activa
    ON asignacion_conductor(id_vehiculo)
    WHERE fecha_fin IS NULL;

CREATE INDEX ix_asignacion_conductor_historial
    ON asignacion_conductor(id_vehiculo, fecha_inicio DESC);

CREATE TABLE asignacion_conductor_documento (
    id_asignacion_conductor BIGINT NOT NULL
        REFERENCES asignacion_conductor(id_asignacion_conductor) ON DELETE CASCADE,
    id_documento BIGINT NOT NULL REFERENCES documento(id_documento),
    PRIMARY KEY (id_asignacion_conductor, id_documento)
);


-- ============================================================
-- 10. OPERACIÓN, BITÁCORAS Y RECORRIDOS
-- ============================================================

CREATE TABLE bitacora (
    id_bitacora BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_vehiculo BIGINT NOT NULL REFERENCES vehiculo(id_vehiculo),
    id_personal BIGINT NOT NULL REFERENCES personal_policial(id_personal),
    id_unidad BIGINT NOT NULL REFERENCES unidad(id_unidad),
    fecha DATE NOT NULL,
    hora_salida TIME,
    hora_llegada TIME,
    kilometraje_inicial NUMERIC(12,1) NOT NULL,
    kilometraje_final NUMERIC(12,1) NOT NULL,
    distancia_recorrida NUMERIC(12,1)
        GENERATED ALWAYS AS (kilometraje_final - kilometraje_inicial) STORED,
    destino VARCHAR(250),
    documento_referencia VARCHAR(120),
    observaciones TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_bitacora_km
        CHECK (
            kilometraje_inicial >= 0
            AND kilometraje_final >= kilometraje_inicial
        )
);

CREATE INDEX ix_bitacora_vehiculo_fecha
    ON bitacora(id_vehiculo, fecha DESC);

CREATE TABLE pasajero_bitacora (
    id_pasajero BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_bitacora BIGINT NOT NULL REFERENCES bitacora(id_bitacora) ON DELETE CASCADE,
    nombre_completo VARCHAR(180) NOT NULL
);


-- ============================================================
-- 11. COMBUSTIBLE
-- ============================================================

CREATE TABLE entidad_combustible (
    id_entidad_combustible BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(180) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE tipo_combustible (
    id_tipo_combustible BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(40) NOT NULL UNIQUE,
    nombre VARCHAR(80) NOT NULL
);

CREATE TABLE vale_combustible (
    id_vale BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_entidad_combustible BIGINT NOT NULL
        REFERENCES entidad_combustible(id_entidad_combustible),
    id_vehiculo BIGINT REFERENCES vehiculo(id_vehiculo),
    id_unidad BIGINT REFERENCES unidad(id_unidad),
    numero_vale VARCHAR(80),
    capacidad_litros NUMERIC(10,2) NOT NULL,
    fecha_emision DATE,
    estado VARCHAR(40),
    documento_referencia VARCHAR(120),
    observaciones TEXT,
    CONSTRAINT ck_vale_litros CHECK (capacidad_litros > 0)
);

CREATE TABLE abastecimiento_combustible (
    id_abastecimiento BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_vehiculo BIGINT NOT NULL REFERENCES vehiculo(id_vehiculo),
    id_vale BIGINT REFERENCES vale_combustible(id_vale),
    id_personal BIGINT REFERENCES personal_policial(id_personal),
    id_tipo_combustible BIGINT REFERENCES tipo_combustible(id_tipo_combustible),
    fecha TIMESTAMPTZ NOT NULL,
    estacion_surtidor VARCHAR(180),
    cantidad_litros NUMERIC(10,2) NOT NULL,
    kilometraje NUMERIC(12,1) NOT NULL,
    precio_unitario NUMERIC(12,2),
    costo_total NUMERIC(14,2)
        GENERATED ALWAYS AS (
            CASE
                WHEN precio_unitario IS NULL THEN NULL
                ELSE cantidad_litros * precio_unitario
            END
        ) STORED,
    documento_referencia VARCHAR(120),
    observaciones TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_abastecimiento_litros CHECK (cantidad_litros > 0),
    CONSTRAINT ck_abastecimiento_km CHECK (kilometraje >= 0)
);

CREATE INDEX ix_abastecimiento_vehiculo_fecha
    ON abastecimiento_combustible(id_vehiculo, fecha DESC);


-- ============================================================
-- 12. INVENTARIO, REPUESTOS Y DOTACIONES
-- ============================================================

CREATE TABLE categoria_producto (
    id_categoria BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT
);

CREATE TABLE unidad_medida (
    id_unidad_medida BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(80) NOT NULL,
    abreviatura VARCHAR(20)
);

CREATE TABLE producto (
    id_producto BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_categoria BIGINT NOT NULL REFERENCES categoria_producto(id_categoria),
    id_unidad_medida BIGINT NOT NULL REFERENCES unidad_medida(id_unidad_medida),
    codigo VARCHAR(60),
    nombre VARCHAR(160) NOT NULL,
    marca VARCHAR(100),
    descripcion TEXT,
    stock_minimo NUMERIC(12,2) NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_producto_stock_minimo CHECK (stock_minimo >= 0)
);

CREATE UNIQUE INDEX uq_producto_codigo
    ON producto(LOWER(codigo))
    WHERE codigo IS NOT NULL;

CREATE TABLE tipo_movimiento_inventario (
    id_tipo_movimiento BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    factor_stock SMALLINT NOT NULL,
    descripcion TEXT,
    CONSTRAINT ck_tipo_movimiento_factor
        CHECK (factor_stock IN (-1, 1))
);

CREATE TABLE dotacion (
    id_dotacion BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_unidad BIGINT NOT NULL REFERENCES unidad(id_unidad),
    id_vehiculo BIGINT REFERENCES vehiculo(id_vehiculo),
    id_usuario BIGINT REFERENCES usuario(id_usuario),
    acta_numero VARCHAR(100),
    fecha DATE NOT NULL,
    documento_referencia VARCHAR(120),
    observaciones TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 13. MANTENIMIENTO Y TALLERES
-- ============================================================

CREATE TABLE tipo_mantenimiento (
    id_tipo_mantenimiento BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT
);

CREATE TABLE taller (
    id_taller BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(180) NOT NULL,
    tipo VARCHAR(30) NOT NULL,
    direccion VARCHAR(250),
    telefono VARCHAR(40),
    contacto VARCHAR(150),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_taller_tipo
        CHECK (tipo IN ('PROPIO', 'EXTERNO'))
);

CREATE TABLE mantenimiento (
    id_mantenimiento BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_vehiculo BIGINT NOT NULL REFERENCES vehiculo(id_vehiculo),
    id_taller BIGINT REFERENCES taller(id_taller),
    id_tipo_mantenimiento BIGINT NOT NULL
        REFERENCES tipo_mantenimiento(id_tipo_mantenimiento),
    fecha_solicitud DATE,
    fecha_ingreso DATE,
    fecha_salida DATE,
    kilometraje NUMERIC(12,1),
    diagnostico TEXT,
    trabajo_realizado TEXT,
    costo_mano_obra NUMERIC(14,2),
    costo_total NUMERIC(14,2),
    proximo_mantenimiento_fecha DATE,
    proximo_mantenimiento_km NUMERIC(12,1),
    documento_referencia VARCHAR(120),
    observaciones TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_mantenimiento_fechas
        CHECK (
            fecha_ingreso IS NULL
            OR fecha_salida IS NULL
            OR fecha_salida >= fecha_ingreso
        ),
    CONSTRAINT ck_mantenimiento_km
        CHECK (kilometraje IS NULL OR kilometraje >= 0),
    CONSTRAINT ck_mantenimiento_costos
        CHECK (
            (costo_mano_obra IS NULL OR costo_mano_obra >= 0)
            AND (costo_total IS NULL OR costo_total >= 0)
        )
);


-- ============================================================
-- 14. MOVIMIENTOS DE INVENTARIO
--     Esta tabla es la fuente del STOCK.
-- ============================================================

CREATE TABLE movimiento_inventario (
    id_movimiento BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_producto BIGINT NOT NULL REFERENCES producto(id_producto),
    id_tipo_movimiento BIGINT NOT NULL
        REFERENCES tipo_movimiento_inventario(id_tipo_movimiento),
    id_unidad BIGINT REFERENCES unidad(id_unidad),
    id_vehiculo BIGINT REFERENCES vehiculo(id_vehiculo),
    id_dotacion BIGINT REFERENCES dotacion(id_dotacion),
    id_mantenimiento BIGINT REFERENCES mantenimiento(id_mantenimiento),
    id_usuario BIGINT REFERENCES usuario(id_usuario),
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cantidad NUMERIC(12,2) NOT NULL,
    costo_unitario NUMERIC(14,2),
    documento_referencia VARCHAR(120),
    observaciones TEXT,
    CONSTRAINT ck_movimiento_cantidad CHECK (cantidad > 0),
    CONSTRAINT ck_movimiento_costo
        CHECK (costo_unitario IS NULL OR costo_unitario >= 0)
);

CREATE INDEX ix_movimiento_producto_fecha
    ON movimiento_inventario(id_producto, fecha DESC);

CREATE INDEX ix_movimiento_vehiculo
    ON movimiento_inventario(id_vehiculo)
    WHERE id_vehiculo IS NOT NULL;


CREATE TABLE mantenimiento_item (
    id_item BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_mantenimiento BIGINT NOT NULL
        REFERENCES mantenimiento(id_mantenimiento) ON DELETE CASCADE,
    id_producto BIGINT REFERENCES producto(id_producto),
    id_movimiento_inventario BIGINT REFERENCES movimiento_inventario(id_movimiento),
    descripcion VARCHAR(250) NOT NULL,
    cantidad NUMERIC(12,2) NOT NULL DEFAULT 1,
    costo_unitario NUMERIC(14,2),
    origen VARCHAR(30),
    observaciones TEXT,
    CONSTRAINT ck_mantenimiento_item_cantidad CHECK (cantidad > 0),
    CONSTRAINT ck_mantenimiento_item_origen
        CHECK (
            origen IS NULL
            OR origen IN ('INVENTARIO', 'TALLER_EXTERNO', 'OTRO')
        )
);

CREATE TABLE mantenimiento_documento (
    id_mantenimiento BIGINT NOT NULL
        REFERENCES mantenimiento(id_mantenimiento) ON DELETE CASCADE,
    id_documento BIGINT NOT NULL REFERENCES documento(id_documento),
    PRIMARY KEY (id_mantenimiento, id_documento)
);


-- ============================================================
-- 15. INCIDENTES Y ACCIDENTES
-- ============================================================

CREATE TABLE tipo_incidente (
    id_tipo_incidente BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT
);

CREATE TABLE incidente (
    id_incidente BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_vehiculo BIGINT NOT NULL REFERENCES vehiculo(id_vehiculo),
    id_personal BIGINT REFERENCES personal_policial(id_personal),
    id_unidad BIGINT REFERENCES unidad(id_unidad),
    id_tipo_incidente BIGINT REFERENCES tipo_incidente(id_tipo_incidente),
    fecha TIMESTAMPTZ NOT NULL,
    lugar VARCHAR(250),
    descripcion TEXT NOT NULL,
    danos TEXT,
    personas_involucradas TEXT,
    estado_vehiculo_posterior VARCHAR(100),
    documento_referencia VARCHAR(120),
    observaciones TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_incidente_vehiculo_fecha
    ON incidente(id_vehiculo, fecha DESC);

CREATE TABLE incidente_documento (
    id_incidente BIGINT NOT NULL REFERENCES incidente(id_incidente) ON DELETE CASCADE,
    id_documento BIGINT NOT NULL REFERENCES documento(id_documento),
    PRIMARY KEY (id_incidente, id_documento)
);



-- ============================================================
-- 16. AUDITORÍA
-- ============================================================

CREATE TABLE auditoria (
    id_auditoria BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario BIGINT REFERENCES usuario(id_usuario),
    accion VARCHAR(30) NOT NULL,
    tabla_afectada VARCHAR(100) NOT NULL,
    registro_id VARCHAR(100),
    valor_anterior JSONB,
    valor_nuevo JSONB,
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip INET,
    observaciones TEXT
);

CREATE INDEX ix_auditoria_usuario_fecha
    ON auditoria(id_usuario, fecha_hora DESC);

CREATE INDEX ix_auditoria_tabla_registro
    ON auditoria(tabla_afectada, registro_id);


-- ============================================================
-- 17. CATÁLOGOS INICIALES
-- ============================================================

INSERT INTO estado_vehiculo (codigo, nombre, es_operativo) VALUES
    ('BUENO', 'Bueno', TRUE),
    ('REGULAR', 'Regular', TRUE),
    ('DETERIORADO', 'Deteriorado', FALSE),
    ('FUERA_USO', 'Fuera de uso', FALSE),
    ('INOPERABLE', 'Inoperable', FALSE),
    ('EN_MANTENIMIENTO', 'En mantenimiento', FALSE),
    ('SEPARADO_INCIDENTE', 'Separado por incidente', FALSE),
    ('EXTRAVIADO', 'Extraviado', FALSE),
    ('DEVUELTO', 'Devuelto', FALSE),
    ('BAJA', 'Dado de baja', FALSE)
ON CONFLICT (codigo) DO NOTHING;


INSERT INTO rol (codigo, nombre) VALUES
    ('ADMINISTRADOR', 'Administrador'),
    ('TRANSPORTES', 'Área de Transportes'),
    ('COMBUSTIBLE', 'Combustible'),
    ('MANTENIMIENTO', 'Mantenimiento'),
    ('ALMACEN', 'Almacén'),
    ('CONSULTA', 'Consulta')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO tipo_documento (codigo, nombre, tiene_vencimiento) VALUES
    ('ACTA_PROVISIONAL', 'Acta provisional', FALSE),
    ('ACTA_ENTREGA', 'Acta de entrega', FALSE),
    ('INFORME_CONFORMIDAD', 'Informe de conformidad', FALSE),
    ('FICHA_KARDEX', 'Ficha Kardex', FALSE),
    ('HOJA_RUTA', 'Hoja de ruta', FALSE),
    ('INFORME_TECNICO', 'Informe técnico', FALSE),
    ('VALE_COMBUSTIBLE', 'Vale de combustible', FALSE),
    ('ORDEN_MANTENIMIENTO', 'Orden de mantenimiento', FALSE),
    ('INFORME_INCIDENTE', 'Informe de incidente', FALSE),
    ('OTRO', 'Otro documento', FALSE)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO tipo_combustible (codigo, nombre) VALUES
    ('GASOLINA', 'Gasolina'),
    ('DIESEL', 'Diésel'),
    ('OTRO', 'Otro')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO categoria_producto (codigo, nombre) VALUES
    ('LUBRICANTE', 'Lubricantes'),
    ('FILTRO', 'Filtros'),
    ('REPUESTO', 'Repuestos'),
    ('REFACCION', 'Refacciones'),
    ('FLUIDO', 'Fluidos'),
    ('MATERIAL', 'Materiales'),
    ('OTRO', 'Otros')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO unidad_medida (codigo, nombre, abreviatura) VALUES
    ('UNIDAD', 'Unidad', 'u'),
    ('LITRO', 'Litro', 'L'),
    ('GALON', 'Galón', 'gal'),
    ('JUEGO', 'Juego', 'jgo'),
    ('PAR', 'Par', 'par')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO tipo_movimiento_inventario
    (codigo, nombre, factor_stock) VALUES
    ('ENTRADA', 'Entrada', 1),
    ('DEVOLUCION', 'Devolución', 1),
    ('AJUSTE_ENTRADA', 'Ajuste de entrada', 1),
    ('SALIDA_DOTACION', 'Salida por dotación', -1),
    ('SALIDA_MANTENIMIENTO', 'Salida por mantenimiento', -1),
    ('AJUSTE_SALIDA', 'Ajuste de salida', -1),
    ('BAJA', 'Baja de inventario', -1)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO tipo_mantenimiento (codigo, nombre) VALUES
    ('PREVENTIVO', 'Preventivo'),
    ('CORRECTIVO', 'Correctivo'),
    ('REPARACION', 'Reparación'),
    ('DIAGNOSTICO', 'Diagnóstico'),
    ('CAMBIO_LUBRICANTES', 'Cambio de lubricantes'),
    ('OTRO', 'Otro')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO tipo_incidente (codigo, nombre) VALUES
    ('ACCIDENTE_TRANSITO', 'Accidente de tránsito'),
    ('INCIDENTE_MECANICO', 'Incidente mecánico'),
    ('DANO', 'Daño'),
    ('OTRO', 'Otro')
ON CONFLICT (codigo) DO NOTHING;


-- ============================================================
-- 18. VISTAS PARA CONSULTA
-- ============================================================

-- Stock calculado: no se mantiene manualmente.
CREATE OR REPLACE VIEW vw_stock_actual AS
SELECT
    p.id_producto,
    p.codigo,
    p.nombre,
    um.nombre AS unidad_medida,
    p.stock_minimo,
    COALESCE(
        SUM(mi.cantidad * tmi.factor_stock),
        0
    )::NUMERIC(14,2) AS stock_actual,
    CASE
        WHEN COALESCE(SUM(mi.cantidad * tmi.factor_stock), 0) <= p.stock_minimo
            THEN TRUE
        ELSE FALSE
    END AS requiere_reposicion
FROM producto p
JOIN unidad_medida um
    ON um.id_unidad_medida = p.id_unidad_medida
LEFT JOIN movimiento_inventario mi
    ON mi.id_producto = p.id_producto
LEFT JOIN tipo_movimiento_inventario tmi
    ON tmi.id_tipo_movimiento = mi.id_tipo_movimiento
GROUP BY
    p.id_producto,
    p.codigo,
    p.nombre,
    um.nombre,
    p.stock_minimo;


-- Último kilometraje registrado desde distintas fuentes.
CREATE OR REPLACE VIEW vw_ultimo_kilometraje AS
WITH lecturas AS (
    SELECT
        b.id_vehiculo,
        b.fecha::TIMESTAMP AS fecha_evento,
        b.kilometraje_final AS kilometraje,
        'BITACORA'::VARCHAR(30) AS fuente
    FROM bitacora b

    UNION ALL

    SELECT
        a.id_vehiculo,
        a.fecha::TIMESTAMP AS fecha_evento,
        a.kilometraje,
        'COMBUSTIBLE'::VARCHAR(30) AS fuente
    FROM abastecimiento_combustible a

    UNION ALL

    SELECT
        m.id_vehiculo,
        COALESCE(m.fecha_salida, m.fecha_ingreso, m.fecha_solicitud)::TIMESTAMP AS fecha_evento,
        m.kilometraje,
        'MANTENIMIENTO'::VARCHAR(30) AS fuente
    FROM mantenimiento m
    WHERE m.kilometraje IS NOT NULL
)
SELECT DISTINCT ON (id_vehiculo)
    id_vehiculo,
    fecha_evento,
    kilometraje,
    fuente
FROM lecturas
WHERE fecha_evento IS NOT NULL
ORDER BY id_vehiculo, fecha_evento DESC;


-- Estado, unidad y conductor vigentes de cada vehículo.
CREATE OR REPLACE VIEW vw_vehiculo_actual AS
SELECT
    v.id_vehiculo,
    v.placa,
    v.placa_dnfr,
    v.clase,
    v.tipo_modelo,
    v.marca,
    v.modelo,
    v.anio_modelo,
    v.nro_chasis,
    v.nro_motor,
    v.color,
    ev.nombre AS estado_actual,
    u.id_unidad AS id_unidad_actual,
    u.nombre AS unidad_actual,
    pc.id_personal AS id_conductor_actual,
    CONCAT_WS(' ', pc.grado, pc.nombres, pc.apellidos) AS conductor_actual,
    uk.kilometraje AS kilometraje_actual,
    uk.fecha_evento AS fecha_ultimo_kilometraje,
    uk.fuente AS fuente_ultimo_kilometraje
FROM vehiculo v

LEFT JOIN LATERAL (
    SELECT h.id_estado
    FROM historial_estado_vehiculo h
    WHERE h.id_vehiculo = v.id_vehiculo
    ORDER BY h.fecha_cambio DESC, h.id_historial DESC
    LIMIT 1
) he ON TRUE

LEFT JOIN estado_vehiculo ev
    ON ev.id_estado = he.id_estado

LEFT JOIN LATERAL (
    SELECT au.id_unidad
    FROM asignacion_unidad au
    WHERE au.id_vehiculo = v.id_vehiculo
      AND au.fecha_fin IS NULL
    ORDER BY au.fecha_inicio DESC, au.id_asignacion DESC
    LIMIT 1
) aua ON TRUE

LEFT JOIN unidad u
    ON u.id_unidad = aua.id_unidad

LEFT JOIN LATERAL (
    SELECT ac.id_personal
    FROM asignacion_conductor ac
    WHERE ac.id_vehiculo = v.id_vehiculo
      AND ac.fecha_fin IS NULL
    ORDER BY ac.fecha_inicio DESC, ac.id_asignacion_conductor DESC
    LIMIT 1
) aca ON TRUE

LEFT JOIN personal_policial pc
    ON pc.id_personal = aca.id_personal

LEFT JOIN vw_ultimo_kilometraje uk
    ON uk.id_vehiculo = v.id_vehiculo;


-- Último mantenimiento por vehículo.
CREATE OR REPLACE VIEW vw_ultimo_mantenimiento AS
SELECT DISTINCT ON (m.id_vehiculo)
    m.id_vehiculo,
    m.id_mantenimiento,
    tm.nombre AS tipo_mantenimiento,
    COALESCE(m.fecha_salida, m.fecha_ingreso, m.fecha_solicitud) AS fecha_mantenimiento,
    m.kilometraje,
    m.proximo_mantenimiento_fecha,
    m.proximo_mantenimiento_km,
    m.trabajo_realizado
FROM mantenimiento m
JOIN tipo_mantenimiento tm
    ON tm.id_tipo_mantenimiento = m.id_tipo_mantenimiento
ORDER BY
    m.id_vehiculo,
    COALESCE(m.fecha_salida, m.fecha_ingreso, m.fecha_solicitud) DESC NULLS LAST,
    m.id_mantenimiento DESC;


-- Ficha resumida del vehículo para búsqueda por placa.
CREATE OR REPLACE VIEW vw_ficha_vehiculo AS
SELECT
    va.*,
    um.id_mantenimiento AS ultimo_mantenimiento_id,
    um.tipo_mantenimiento AS ultimo_mantenimiento_tipo,
    um.fecha_mantenimiento AS ultimo_mantenimiento_fecha,
    um.proximo_mantenimiento_fecha,
    um.proximo_mantenimiento_km
FROM vw_vehiculo_actual va
LEFT JOIN vw_ultimo_mantenimiento um
    ON um.id_vehiculo = va.id_vehiculo;


-- ============================================================
-- 19. ÍNDICES DE CONSULTA FRECUENTE
-- ============================================================

CREATE INDEX ix_documento_vehiculo
    ON documento(id_vehiculo);

CREATE INDEX ix_documento_vencimiento
    ON documento(fecha_vencimiento)
    WHERE fecha_vencimiento IS NOT NULL;


CREATE INDEX ix_mantenimiento_vehiculo_fecha
    ON mantenimiento(
        id_vehiculo,
        fecha_salida DESC NULLS LAST,
        fecha_ingreso DESC NULLS LAST
    );

CREATE INDEX ix_dotacion_unidad_fecha
    ON dotacion(id_unidad, fecha DESC);


-- ============================================================
-- 20. COMENTARIOS DE REGLAS IMPORTANTES
-- ============================================================

COMMENT ON TABLE vehiculo IS
'Entidad central del expediente vehicular. La unidad, conductor, estado y kilometraje actuales se obtienen de historiales/vistas, no se duplican como campos manuales.';

COMMENT ON TABLE asignacion_unidad IS
'Historial de asignación de un vehículo a una unidad. No depende de solicitudes dentro del sistema. Una fila con fecha_fin NULL representa la asignación vigente.';

COMMENT ON TABLE asignacion_conductor IS
'Historial de conductores responsables de un vehículo. Permite identificar quién estaba a cargo en una fecha determinada.';

COMMENT ON TABLE bitacora IS
'Digitaliza la información del control de recorrido; no sustituye el formulario o firma institucional cuando estos sean exigidos.';

COMMENT ON TABLE movimiento_inventario IS
'Fuente de verdad para existencias. El stock actual se calcula con movimientos de entrada y salida.';



COMMENT ON TABLE incidente IS
'Registra incidentes o accidentes vinculados al vehículo, conductor y unidad. El sistema no gestiona procesos disciplinarios.';

COMMIT;
