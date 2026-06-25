-- Migration: add_clinica_base
-- Adds: Diagnostico, DiagnosticoAtencion, Tratamiento, TratamientoAtencion, InsumoAtencion

-- ===== DIAGNÓSTICO CATALOG =====
CREATE TABLE "Diagnostico" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "esDatoPrueba" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Diagnostico_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Diagnostico_codigo_key" ON "Diagnostico"("codigo");
CREATE UNIQUE INDEX "Diagnostico_nombre_key" ON "Diagnostico"("nombre");

-- ===== DIAGNÓSTICO ↔ ATENCIÓN JUNCTION =====
CREATE TABLE "DiagnosticoAtencion" (
    "idAtencion" INTEGER NOT NULL,
    "idDiagnostico" INTEGER NOT NULL,

    CONSTRAINT "DiagnosticoAtencion_pkey" PRIMARY KEY ("idAtencion","idDiagnostico")
);

CREATE INDEX "DiagnosticoAtencion_idAtencion_idx" ON "DiagnosticoAtencion"("idAtencion");
CREATE INDEX "DiagnosticoAtencion_idDiagnostico_idx" ON "DiagnosticoAtencion"("idDiagnostico");

ALTER TABLE "DiagnosticoAtencion" ADD CONSTRAINT "DiagnosticoAtencion_idAtencion_fkey"
    FOREIGN KEY ("idAtencion") REFERENCES "AtencionPodologica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DiagnosticoAtencion" ADD CONSTRAINT "DiagnosticoAtencion_idDiagnostico_fkey"
    FOREIGN KEY ("idDiagnostico") REFERENCES "Diagnostico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ===== TRATAMIENTO CATALOG =====
CREATE TABLE "Tratamiento" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "esDatoPrueba" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tratamiento_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tratamiento_nombre_key" ON "Tratamiento"("nombre");

-- ===== TRATAMIENTO ↔ ATENCIÓN JUNCTION =====
CREATE TABLE "TratamientoAtencion" (
    "idAtencion" INTEGER NOT NULL,
    "idTratamiento" INTEGER NOT NULL,

    CONSTRAINT "TratamientoAtencion_pkey" PRIMARY KEY ("idAtencion","idTratamiento")
);

CREATE INDEX "TratamientoAtencion_idAtencion_idx" ON "TratamientoAtencion"("idAtencion");
CREATE INDEX "TratamientoAtencion_idTratamiento_idx" ON "TratamientoAtencion"("idTratamiento");

ALTER TABLE "TratamientoAtencion" ADD CONSTRAINT "TratamientoAtencion_idAtencion_fkey"
    FOREIGN KEY ("idAtencion") REFERENCES "AtencionPodologica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TratamientoAtencion" ADD CONSTRAINT "TratamientoAtencion_idTratamiento_fkey"
    FOREIGN KEY ("idTratamiento") REFERENCES "Tratamiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ===== INSUMOS CONSUMIDOS EN ATENCIÓN =====
CREATE TABLE "InsumoAtencion" (
    "id" SERIAL NOT NULL,
    "idAtencion" INTEGER NOT NULL,
    "idProducto" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsumoAtencion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InsumoAtencion_idAtencion_idx" ON "InsumoAtencion"("idAtencion");
CREATE INDEX "InsumoAtencion_idProducto_idx" ON "InsumoAtencion"("idProducto");

ALTER TABLE "InsumoAtencion" ADD CONSTRAINT "InsumoAtencion_idAtencion_fkey"
    FOREIGN KEY ("idAtencion") REFERENCES "AtencionPodologica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InsumoAtencion" ADD CONSTRAINT "InsumoAtencion_idProducto_fkey"
    FOREIGN KEY ("idProducto") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ===== SEED: Common podology diagnoses =====
INSERT INTO "Diagnostico" ("nombre", "codigo", "descripcion", "activo") VALUES
('Onicomicosis', 'B35.1', 'Infección fúngica de las uñas', true),
('Pie diabético', 'E11.52', 'Complicación podológica de la diabetes mellitus tipo 2', true),
('Hallux Valgus', 'M20.1', 'Juanete - desviación del dedo gordo del pie', true),
('Heloma duro', 'L84', 'Callo o clavos en el pie', true),
('Verruca plantar', 'B07.0', 'Verruga plantar causada por VPH', true),
('Pie plano', 'M21.4', 'Pie plano adquirido', true),
('Fascitis plantar', 'M72.2', 'Inflamación de la fascia plantar', true),
('Hiperhidrosis plantar', 'L74.510', 'Sudoración excesiva en la planta del pie', true),
('Uña encarnada', 'L60.0', 'Onicocriptosis - uña incrustada en el tejido', true),
('Dermatitis por contacto', 'L25.9', 'Irritación cutánea de los pies', true)
ON CONFLICT (nombre) DO NOTHING;

-- ===== SEED: Common podology treatments =====
INSERT INTO "Tratamiento" ("nombre", "descripcion", "activo") VALUES
('Fresado de onicomicosis', 'Tratamiento mecánico de hongos en uñas con fresadora podológica', true),
('Quiropodia completa', 'Tratamiento integral de los pies: callos, durezas, uñas', true),
('Infiltración local', 'Aplicación de anestésico o medicamento local en el pie', true),
('Vendaje funcional', 'Vendaje corrector o protector del pie', true),
('Crioterapia verruga', 'Congelación de verrugas plantares con nitrógeno líquido', true),
('Resección uña encarnada', 'Cirugía menor para corrección de onicocriptosis', true),
('Plantilla ortopédica', 'Fabricación o adaptación de plantilla podológica personalizada', true),
('Cuidado pie diabético', 'Protocolo completo de atención y prevención para pie diabético', true),
('Aplicación antifúngico', 'Tratamiento tópico o sistémico contra hongos en pies/uñas', true),
('Electrocirugía', 'Tratamiento eléctrico de verrugas y tejidos anómalos', true)
ON CONFLICT (nombre) DO NOTHING;
