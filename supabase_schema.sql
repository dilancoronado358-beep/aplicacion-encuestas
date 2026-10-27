-- ==============================================================================
-- SCHEMA SUPABASE: SISTEMA ELECTORAL CON ROLES Y GEORREFERENCIACIÓN
-- Proyecto: Dr. Fabián Robles - Sondeo Electoral Montúfar 2026
-- ==============================================================================

-- 1. TABLA DE ENCUESTADORES Y ADMINISTRADORES
CREATE TABLE IF NOT EXISTS public.encuestadores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    nombre TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    rol TEXT DEFAULT 'encuestador', -- 'admin' | 'encuestador'
    activo BOOLEAN DEFAULT true
);

COMMENT ON TABLE public.encuestadores IS 'Usuarios con roles diferenciados (admin / encuestador)';

-- 2. TABLA DE ENCUESTAS E INCIDENCIAS DE CAMPO
CREATE TABLE IF NOT EXISTS public.encuestas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    ts TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    tipo_visita TEXT DEFAULT 'efectiva', -- 'efectiva' | 'nadie_en_casa' | 'no_trabajable'
    resultado_voto TEXT, -- 'voto_seguro' (verde) | 'indeciso' (amarillo) | 'no_vota' (rojo) | 'nadie_en_casa' (blanco) | 'no_trabajable' (plomo)
    nombre TEXT,
    whatsapp TEXT,
    parroquia TEXT NOT NULL,
    candidato TEXT,
    conoce_candidato TEXT,
    votaria_candidato TEXT,
    encuestador TEXT NOT NULL,
    encuestador_id TEXT,
    lat TEXT NOT NULL,
    lng TEXT NOT NULL,
    uploaded BOOLEAN DEFAULT true
);

-- Asegurar columnas si la tabla ya había sido creada previamente
ALTER TABLE public.encuestas ADD COLUMN IF NOT EXISTS tipo_visita TEXT DEFAULT 'efectiva';
ALTER TABLE public.encuestas ADD COLUMN IF NOT EXISTS resultado_voto TEXT;
ALTER TABLE public.encuestas ADD COLUMN IF NOT EXISTS encuestador_id TEXT;
ALTER TABLE public.encuestas ADD COLUMN IF NOT EXISTS uploaded BOOLEAN DEFAULT true;

COMMENT ON TABLE public.encuestas IS 'Registros georreferenciados para monitoreo de campo en mapa y tableros';

-- 3. ÍNDICES DE ALTO RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_encuestas_lat_lng ON public.encuestas (lat, lng);
CREATE INDEX IF NOT EXISTS idx_encuestas_resultado_voto ON public.encuestas (resultado_voto);
CREATE INDEX IF NOT EXISTS idx_encuestas_tipo_visita ON public.encuestas (tipo_visita);
CREATE INDEX IF NOT EXISTS idx_encuestas_candidato ON public.encuestas (candidato);
CREATE INDEX IF NOT EXISTS idx_encuestas_parroquia ON public.encuestas (parroquia);
CREATE INDEX IF NOT EXISTS idx_encuestas_encuestador ON public.encuestas (encuestador);
CREATE INDEX IF NOT EXISTS idx_encuestas_ts ON public.encuestas (ts DESC);
CREATE INDEX IF NOT EXISTS idx_encuestadores_email ON public.encuestadores (email);

-- 4. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.encuestadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encuestas ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS RLS
DROP POLICY IF EXISTS "Acceso total encuestadores" ON public.encuestadores;
CREATE POLICY "Acceso total encuestadores" ON public.encuestadores FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total encuestas" ON public.encuestas;
CREATE POLICY "Acceso total encuestas" ON public.encuestas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 6. ASIGNAR PERMISOS
GRANT ALL ON TABLE public.encuestadores TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.encuestas TO anon, authenticated, service_role;

-- 7. USUARIOS POR DEFECTO: ADMINISTRADORES Y ENCUESTADORES

-- Superadministrador principal
INSERT INTO public.encuestadores (nombre, email, password, rol, activo)
VALUES ('Dr. Fabián Robles (Admin)', 'admin@robles2026.com', 'admin2026', 'admin', true)
ON CONFLICT (email) DO UPDATE SET rol = 'admin', password = 'admin2026';

-- Administrador de contingencia
INSERT INTO public.encuestadores (nombre, email, password, rol, activo)
VALUES ('Coordinador General', 'admin@montufar.gob.ec', 'admin2026', 'admin', true)
ON CONFLICT (email) DO UPDATE SET rol = 'admin', password = 'admin2026';

-- Encuestadores de campo iniciales
INSERT INTO public.encuestadores (nombre, email, password, rol, activo)
VALUES 
    ('Carlos Méndez', 'carlos.mendez@campo.com', 'campo2026', 'encuestador', true),
    ('Andrea Villareal', 'andrea.villareal@campo.com', 'campo2026', 'encuestador', true),
    ('Juan Pérez', 'juan.perez@campo.com', 'campo2026', 'encuestador', true),
    ('María Flores', 'maria.flores@campo.com', 'campo2026', 'encuestador', true)
ON CONFLICT (email) DO NOTHING;

-- ==============================================================================
-- VISTAS ANALÍTICAS EN TIEMPO REAL
-- ==============================================================================

-- Vista consolidada de intención de voto
CREATE OR REPLACE VIEW public.vista_resumen_candidatos AS
SELECT 
    candidato,
    COUNT(*) AS total_votos,
    ROUND((COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM public.encuestas WHERE tipo_visita = 'efectiva'), 0)), 2) AS porcentaje
FROM public.encuestas
WHERE tipo_visita = 'efectiva' AND candidato IS NOT NULL
GROUP BY candidato
ORDER BY total_votos DESC;

-- Vista consolidada de tipo de visitas en territorio
CREATE OR REPLACE VIEW public.vista_resumen_visitas AS
SELECT 
    resultado_voto,
    COUNT(*) AS total,
    ROUND((COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM public.encuestas), 0)), 2) AS porcentaje
FROM public.encuestas
GROUP BY resultado_voto
ORDER BY total DESC;

-- ==============================================================================
-- 8. TABLA PARA RASTREO GPS EN TIEMPO REAL DE ENCUESTADORES (PUNTOS AZULES)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.encuestadores_ubicaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    email TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    lat NUMERIC NOT NULL,
    lng NUMERIC NOT NULL,
    accuracy NUMERIC DEFAULT 10,
    activo BOOLEAN DEFAULT true
);

COMMENT ON TABLE public.encuestadores_ubicaciones IS 'Ubicaciones GPS en vivo de encuestadores para el Centro de Mando';

CREATE INDEX IF NOT EXISTS idx_encuestadores_ubicaciones_email ON public.encuestadores_ubicaciones (email);
CREATE INDEX IF NOT EXISTS idx_encuestadores_ubicaciones_updated_at ON public.encuestadores_ubicaciones (updated_at DESC);

ALTER TABLE public.encuestadores_ubicaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total encuestadores_ubicaciones" ON public.encuestadores_ubicaciones;
CREATE POLICY "Acceso total encuestadores_ubicaciones" ON public.encuestadores_ubicaciones FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.encuestadores_ubicaciones TO anon, authenticated, service_role;

