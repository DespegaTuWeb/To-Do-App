-- 1. Crear la tabla de rutinas
CREATE TABLE IF NOT EXISTS rutinas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id uuid DEFAULT auth.uid() NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  color text DEFAULT '#8b5cf6',
  dias_semana integer[] DEFAULT '{1,2,3,4,5,6,0}'::integer[], -- 0=Domingo, 1=Lunes, etc.
  categoria_id uuid REFERENCES categorias(id) ON DELETE SET NULL
);

-- 2. Crear la tabla de items de la rutina
CREATE TABLE IF NOT EXISTS items_rutina (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  rutina_id uuid NOT NULL REFERENCES rutinas(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  completado boolean DEFAULT false NOT NULL,
  orden integer DEFAULT 0 NOT NULL
);

-- 3. Crear la tabla de registros/logs históricos de rutina
CREATE TABLE IF NOT EXISTS registro_rutinas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id uuid DEFAULT auth.uid() NOT NULL,
  rutina_id uuid NOT NULL REFERENCES rutinas(id) ON DELETE CASCADE,
  item_titulo text NOT NULL,
  fecha date DEFAULT CURRENT_DATE NOT NULL
);

-- Habilitar RLS en todas las tablas
ALTER TABLE rutinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_rutina ENABLE ROW LEVEL SECURITY;
ALTER TABLE registro_rutinas ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS
-- rutinas: gestión total para el creador
DROP POLICY IF EXISTS "Gestión de rutinas propias" ON rutinas;
CREATE POLICY "Gestión de rutinas propias"
ON rutinas FOR ALL
USING (auth.uid() = user_id);

-- items_rutina: gestión a través de la pertenencia de la rutina a su creador
DROP POLICY IF EXISTS "Gestión de items de rutinas propias" ON items_rutina;
CREATE POLICY "Gestión de items de rutinas propias"
ON items_rutina FOR ALL
USING (
  rutina_id IN (SELECT id FROM rutinas WHERE user_id = auth.uid())
);

-- registro_rutinas: gestión total para el creador
DROP POLICY IF EXISTS "Gestión de registros de rutinas propios" ON registro_rutinas;
CREATE POLICY "Gestión de registros de rutinas propios"
ON registro_rutinas FOR ALL
USING (auth.uid() = user_id);
