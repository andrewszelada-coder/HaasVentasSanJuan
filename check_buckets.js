const { Client } = require('pg');

const connectionString = 'postgresql://postgres:andrewsjimmyzece25ApC@db.xymvwsnyvpupejjcsuxz.supabase.co:5432/postgres';

async function run() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const res = await client.query('SELECT * FROM storage.buckets');
    console.log('Buckets:', res.rows);
  } catch (err) {
    console.error('Error checking buckets:', err.message);
  } finally {
    await client.end();
  }
}

run();
