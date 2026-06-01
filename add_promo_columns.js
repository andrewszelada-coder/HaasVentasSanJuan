const { Client } = require('pg');

const connectionString = 'postgresql://postgres:andrewsjimmyzece25ApC@db.xymvwsnyvpupejjcsuxz.supabase.co:5432/postgres';

const migrationSQL = `
-- 1. Agregar las nuevas columnas a la tabla promociones_sanjuan
ALTER TABLE public.promociones_sanjuan 
  ADD COLUMN IF NOT EXISTS categoria VARCHAR(100) DEFAULT 'Combos San Juan',
  ADD COLUMN IF NOT EXISTS tipo_venta VARCHAR(50) DEFAULT 'Unidad/Paquete';

-- 2. Asegurar que RLS esté habilitado
ALTER TABLE public.promociones_sanjuan ENABLE ROW LEVEL SECURITY;

-- 3. Eliminar políticas antiguas para evitar conflictos
DROP POLICY IF EXISTS promos_lectura_publica ON public.promociones_sanjuan;
DROP POLICY IF EXISTS promos_lectura_todos ON public.promociones_sanjuan;
DROP POLICY IF EXISTS promos_insert_policy ON public.promociones_sanjuan;
DROP POLICY IF EXISTS promos_update_policy ON public.promociones_sanjuan;
DROP POLICY IF EXISTS promos_delete_policy ON public.promociones_sanjuan;

-- 4. Crear nuevas políticas integrales
CREATE POLICY promos_lectura_todos ON public.promociones_sanjuan
    FOR SELECT USING (true);

CREATE POLICY promos_insert_policy ON public.promociones_sanjuan
    FOR INSERT WITH CHECK (true);

CREATE POLICY promos_update_policy ON public.promociones_sanjuan
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY promos_delete_policy ON public.promociones_sanjuan
    FOR DELETE USING (true);
`;

async function run() {
  console.log('Iniciando la migración del esquema de promociones y actualización de RLS...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    await client.query(migrationSQL);
    console.log('¡Enhorabuena! Las columnas "categoria", "tipo_venta" y las nuevas políticas RLS han sido configuradas con éxito.');
  } catch (err) {
    console.error('Error al aplicar la migración de base de datos:', err.message);
  } finally {
    await client.end();
  }
}

run();
