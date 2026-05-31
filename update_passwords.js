const { Client } = require('pg');

const connectionString = 'postgresql://postgres:andrewsjimmyzece25ApC@db.xymvwsnyvpupejjcsuxz.supabase.co:5432/postgres';

const updateSQL = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE auth.users
SET encrypted_password = crypt('123456', gen_salt('bf', 10))
WHERE email IN ('admin@haas.com.bo', 'vendedor@haas.com.bo');
`;

async function run() {
  console.log('Actualizando contraseñas de usuarios a 123456 en la base de datos...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const res = await client.query(updateSQL);
    console.log(`¡Contraseñas actualizadas con éxito! Filas afectadas: ${res.rowCount}`);
    console.log('\n================================================================');
    console.log('NUEVAS CREDENCIALES ACTIVADAS (Contraseña: 123456):');
    console.log('================================================================');
    console.log('1. ADMINISTRADOR COMERCIAL:');
    console.log('   - Correo: admin@haas.com.bo');
    console.log('   - Contraseña: 123456');
    console.log('----------------------------------------------------------------');
    console.log('2. VENDEDOR B2B (CLIENTE):');
    console.log('   - Correo: vendedor@haas.com.bo');
    console.log('   - Contraseña: 123456');
    console.log('================================================================');
  } catch (err) {
    console.error('Error al actualizar contraseñas:', err.message);
  } finally {
    await client.end();
  }
}

run();
