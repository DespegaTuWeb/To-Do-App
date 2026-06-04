-- 0. Limpiar la tabla si ya existe para asegurar que se cree con la estructura correcta (incluyendo owner_id)
DROP TABLE IF EXISTS categorias_compartidas CASCADE;

-- 1. Crear la tabla de Categorías Compartidas con owner_id para evitar recursión RLS
CREATE TABLE categorias_compartidas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  categoria_id uuid NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
  email_usuario text NOT NULL,
  owner_id uuid DEFAULT auth.uid() NOT NULL,
  UNIQUE(categoria_id, email_usuario)
);

-- Habilitar RLS en la tabla puente
ALTER TABLE categorias_compartidas ENABLE ROW LEVEL SECURITY;

-- 2. Políticas para categorias_compartidas (Sin consultar la tabla categorias para evitar recursión circular)
DROP POLICY IF EXISTS "Lectura de compartidos" ON categorias_compartidas;
DROP POLICY IF EXISTS "Gestión de compartidos para dueños" ON categorias_compartidas;

-- Dueño de la categoría o invitado puede leer con quién está compartida
CREATE POLICY "Lectura de compartidos"
ON categorias_compartidas
FOR SELECT
USING (
  auth.uid() = owner_id
  OR lower(auth.jwt()->>'email') = lower(email_usuario)
);

-- Solo el dueño de la categoría puede compartir o eliminar acceso
CREATE POLICY "Gestión de compartidos para dueños"
ON categorias_compartidas
FOR ALL
USING (
  auth.uid() = owner_id
);

-- 3. Políticas para Categorías (Evita recursión ya que categorias_compartidas no consulta categorias)
DROP POLICY IF EXISTS "Permitir todo a dueños de categorías" ON categorias;
DROP POLICY IF EXISTS "Permitir lectura a dueños y usuarios compartidos" ON categorias;
DROP POLICY IF EXISTS "Lectura de categorias compartidas y propias" ON categorias;
DROP POLICY IF EXISTS "Gestión de categorias propia para dueños" ON categorias;

-- Lectura de categorías (propietario o invitado)
CREATE POLICY "Lectura de categorias compartidas y propias"
ON categorias
FOR SELECT
USING (
  auth.uid() = user_id
  OR id IN (
    SELECT categoria_id 
    FROM categorias_compartidas 
    WHERE lower(email_usuario) = lower(auth.jwt()->>'email')
  )
);

-- Escritura/Modificación/Eliminación de categorías (solo el propietario)
CREATE POLICY "Gestión de categorias propia para dueños"
ON categorias
FOR ALL
USING (
  auth.uid() = user_id
);

-- 4. Políticas para Pendientes (Tareas y Subcategorías)
DROP POLICY IF EXISTS "Permitir todo a dueños de pendientes" ON pendientes;
DROP POLICY IF EXISTS "Permitir lectura de pendientes compartidos" ON pendientes;
DROP POLICY IF EXISTS "Permitir mutación de pendientes compartidos" ON pendientes;
DROP POLICY IF EXISTS "Lectura de tareas propias y compartidas" ON pendientes;
DROP POLICY IF EXISTS "Colaboración total en tareas" ON pendientes;

-- Lectura de tareas (propietario o invitado de la categoría)
CREATE POLICY "Lectura de tareas propias y compartidas"
ON pendientes
FOR SELECT
USING (
  auth.uid() = user_id
  OR categoria_id IN (
    SELECT id 
    FROM categorias 
    WHERE user_id = auth.uid()
    OR id IN (
      SELECT categoria_id 
      FROM categorias_compartidas 
      WHERE lower(email_usuario) = lower(auth.jwt()->>'email')
    )
  )
);

-- Escritura/Modificación/Eliminación de tareas (dueño o invitado con permiso de colaboración)
CREATE POLICY "Colaboración total en tareas"
ON pendientes
FOR ALL
USING (
  auth.uid() = user_id
  OR categoria_id IN (
    SELECT id 
    FROM categorias 
    WHERE user_id = auth.uid()
    OR id IN (
      SELECT categoria_id 
      FROM categorias_compartidas 
      WHERE lower(email_usuario) = lower(auth.jwt()->>'email')
    )
  )
);
