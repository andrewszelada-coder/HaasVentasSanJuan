const { Client } = require('pg');

const connectionString = 'postgresql://postgres:andrewsjimmyzece25ApC@db.xymvwsnyvpupejjcsuxz.supabase.co:5432/postgres';

async function run() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    const res = await client.query(`
      SELECT t.typname AS enum_name, e.enumlabel AS enum_value
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      ORDER BY enum_name, e.enumsortorder;
    `);
    console.log('Todos los valores ENUM definidos en la BD:');
    console.log(res.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
