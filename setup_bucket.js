const { Client } = require('pg');

const connectionString = 'postgresql://postgres:andrewsjimmyzece25ApC@db.xymvwsnyvpupejjcsuxz.supabase.co:5432/postgres';

const sql = `
-- Insert bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('productos', 'productos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies for this bucket to avoid conflicts
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow Updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow Deletes" ON storage.objects;

-- Create policy to allow anyone to select/read objects
CREATE POLICY "Public Access" ON storage.objects
    FOR SELECT USING (bucket_id = 'productos');

-- Create policy to allow anyone to insert objects
CREATE POLICY "Allow Uploads" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'productos');

-- Create policy to allow updates
CREATE POLICY "Allow Updates" ON storage.objects
    FOR UPDATE USING (bucket_id = 'productos') WITH CHECK (bucket_id = 'productos');

-- Create policy to allow deletes
CREATE POLICY "Allow Deletes" ON storage.objects
    FOR DELETE USING (bucket_id = 'productos');
`;

async function run() {
  console.log('Creando bucket "productos" y configurando políticas de almacenamiento...');
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    await client.query(sql);
    console.log('¡Enhorabuena! El bucket y las políticas de almacenamiento se han configurado con éxito.');
  } catch (err) {
    console.error('Error al configurar el bucket:', err.message);
  } finally {
    await client.end();
  }
}

run();
