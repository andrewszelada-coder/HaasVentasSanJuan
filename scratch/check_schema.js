const { Client } = require('pg');

const connectionString = 'postgresql://postgres:andrewsjimmyzece25ApC@db.xymvwsnyvpupejjcsuxz.supabase.co:5432/postgres';

async function main() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // Query table information
    const res = await client.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name IN ('pedido_items', 'detalle_pedido', 'pedidos', 'promociones_sanjuan')
      ORDER BY table_name, column_name;
    `);
    
    console.log(JSON.stringify(res.rows, null, 2));

    // Also get functions/procedures containing decrementar_stock to see if they check quantity types
    const funcRes = await client.query(`
      SELECT routine_name, routine_type 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' AND routine_name LIKE '%stock%';
    `);
    console.log("Functions/Procedures related to stock:");
    console.log(JSON.stringify(funcRes.rows, null, 2));

    // Get definition of decrementar_stock function
    const defRes = await client.query(`
      SELECT pg_get_functiondef(p.oid) as def
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'decrementar_stock';
    `);
    if (defRes.rows.length > 0) {
      console.log("\nDefinition of decrementar_stock:");
      console.log(defRes.rows[0].def);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

main();
