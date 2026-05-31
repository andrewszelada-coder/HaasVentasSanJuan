const { Client } = require('pg');

const connectionString = 'postgresql://postgres:andrewsjimmyzece25ApC@db.xymvwsnyvpupejjcsuxz.supabase.co:5432/postgres';

async function check() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Conectado a la base de datos.');

    console.log('Consultando la tabla public.usuarios...');
    const res = await client.query('SELECT * FROM public.usuarios;');
    console.log(`¡Encontrados ${res.rows.length} usuarios en la tabla publica!`);
    console.table(res.rows);

  } catch (err) {
    console.error('Error al consultar usuarios:', err.message);
  } finally {
    await client.end();
  }
}

check();
