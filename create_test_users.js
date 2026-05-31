const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xymvwsnyvpupejjcsuxz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5bXZ3c255dnB1cGVqamNzdXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDgzNTEsImV4cCI6MjA5NTgyNDM1MX0.qcJavCRGlWZC68ZrP6p_1WMBghfolVqrHY8TIv6jiCk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const testUsers = [
  {
    email: 'admin@haas.com.bo',
    password: 'HaasAdmin2026!',
    rol: 'admin',
    empresa: 'Industrias Haas Ltda.',
    nit: '1020405060',
    sucursal: 'Central La Paz'
  },
  {
    email: 'vendedor@haas.com.bo',
    password: 'HaasVendedor2026!',
    rol: 'vendedor',
    empresa: 'Distribuidora San Juan',
    nit: '987654321',
    sucursal: 'Sucursal El Alto'
  }
];

async function createUsers() {
  console.log('Iniciando creación de usuarios de prueba en Supabase Auth con credenciales reales...');
  
  for (const user of testUsers) {
    console.log(`Intentando registrar: ${user.email} (Rol: ${user.rol})...`);
    
    const { data, error } = await supabase.auth.signUp({
      email: user.email,
      password: user.password,
      options: {
        data: {
          rol: user.rol,
          empresa: user.empresa,
          nit: user.nit,
          sucursal: user.sucursal
        }
      }
    });

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('user already exists') || error.message.includes('Email already in use')) {
        console.log(`-> El usuario ${user.email} ya se encuentra registrado.`);
      } else {
        console.error(`-> Error al registrar ${user.email}:`, error.message);
      }
    } else {
      console.log(`-> ¡Usuario ${user.email} creado con éxito!`);
    }
  }

  console.log('\n================================================================');
  console.log('LISTOS PARA INICIAR SESIÓN:');
  console.log('================================================================');
  console.log('1. ADMINISTRADOR COMERCIAL:');
  console.log('   - Correo: admin@haas.com.bo');
  console.log('   - Contraseña: HaasAdmin2026!');
  console.log('   - Acceso: /admin/pedidos');
  console.log('----------------------------------------------------------------');
  console.log('2. VENDEDOR B2B (CLIENTE):');
  console.log('   - Correo: vendedor@haas.com.bo');
  console.log('   - Contraseña: HaasVendedor2026!');
  console.log('   - Acceso: /reservas');
  console.log('================================================================');
}

createUsers();
