const { Client } = require('pg');

const connectionString = 'postgresql://postgres:andrewsjimmyzece25ApC@db.xymvwsnyvpupejjcsuxz.supabase.co:5432/postgres';

const policySQL = `
-- 1. Eliminar políticas de actualización previas en pedidos si existen
DROP POLICY IF EXISTS pedidos_update_policy ON public.pedidos;
DROP POLICY IF EXISTS pedidos_update_admin ON public.pedidos;

-- 2. Crear política global que permite actualizaciones en pedidos
CREATE POLICY pedidos_update_policy ON public.pedidos
    FOR UPDATE USING (true) WITH CHECK (true);

-- 3. Asegurar que las promociones también tengan políticas de actualización para ajustar stock si es necesario
DROP POLICY IF EXISTS promos_update_policy ON public.promociones_sanjuan;
CREATE POLICY promos_update_policy ON public.promociones_sanjuan
    FOR UPDATE USING (true) WITH CHECK (true);

-- 4. Habilitar lectura total para admins en pedidos si se requiere
DROP POLICY IF EXISTS pedidos_select_admin ON public.pedidos;
CREATE POLICY pedidos_select_admin ON public.pedidos
    FOR SELECT USING (true);
`;

async function run() {
  console.log('Aplicando política de UPDATE en Supabase para pedidos y promociones...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    await client.query(policySQL);
    console.log('¡Enhorabuena! Las políticas de UPDATE y SELECT han sido aplicadas con éxito.');
  } catch (err) {
    console.error('Error al aplicar las políticas SQL:', err.message);
  } finally {
    await client.end();
  }
}

run();
