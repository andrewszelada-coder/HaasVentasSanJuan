'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// =========================================================================
// 1. AUTENTICACIÓN
// =========================================================================

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Por favor, ingrese correo electrónico y contraseña.' };
  }

  const supabase = await createClient();

  const { error, data } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Obtener rol del usuario para redirigir
  const { data: profile } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', data.user.id)
    .single();

  if (profile?.rol === 'admin') {
    redirect('/admin/pedidos');
  } else {
    redirect('/reservas');
  }
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

// =========================================================================
// 2. PROMOCIONES (CRUD)
// =========================================================================

export async function getPromociones(soloActivas = false) {
  const supabase = await createClient();
  let query = supabase.from('promociones_sanjuan').select('*');

  if (soloActivas) {
    query = query.eq('activo', true);
  }

  const { data, error } = await query.order('titulo', { ascending: true });

  if (error) {
    throw new Error(`Error al obtener promociones: ${error.message}`);
  }

  return data || [];
}

export async function crearPromoAction(data: {
  titulo: string;
  descripcion: string;
  precio_bs: number;
  stock_disponible: number;
  imagen_url: string;
  activo: boolean;
}) {
  const supabase = await createClient();

  const { error } = await supabase.from('promociones_sanjuan').insert([
    {
      titulo: data.titulo,
      descripcion: data.descripcion,
      precio_bs: data.precio_bs,
      stock_disponible: data.stock_disponible,
      imagen_url: data.imagen_url || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500',
      activo: data.activo,
    },
  ]);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/promos');
  revalidatePath('/reservas');
  return { success: true };
}

export async function editarPromoAction(id: string, data: {
  titulo: string;
  descripcion: string;
  precio_bs: number;
  stock_disponible: number;
  imagen_url: string;
  activo: boolean;
}) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('promociones_sanjuan')
    .update({
      titulo: data.titulo,
      descripcion: data.descripcion,
      precio_bs: data.precio_bs,
      stock_disponible: data.stock_disponible,
      imagen_url: data.imagen_url,
      activo: data.activo,
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/promos');
  revalidatePath('/reservas');
  return { success: true };
}

export async function togglePromoActivoAction(id: string, activo: boolean) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('promociones_sanjuan')
    .update({ activo })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/promos');
  revalidatePath('/reservas');
  return { success: true };
}

export async function eliminarPromoAction(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('promociones_sanjuan')
    .delete()
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/promos');
  revalidatePath('/reservas');
  return { success: true };
}

// =========================================================================
// 3. PEDIDOS (RESERVAS)
// =========================================================================

export async function getPedidos() {
  const supabase = await createClient();

  // Obtener todos los pedidos con la información de los usuarios relacionales
  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      id,
      total_bs,
      estado,
      fecha_creacion,
      usuarios (
        email,
        empresa,
        nit,
        sucursal
      )
    `)
    .order('fecha_creacion', { ascending: false });

  if (error) {
    throw new Error(`Error al obtener pedidos: ${error.message}`);
  }

  return data || [];
}

export async function getPedidosCliente(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('pedidos')
    .select('*')
    .eq('usuario_id', userId)
    .order('fecha_creacion', { ascending: false });

  if (error) {
    throw new Error(`Error al obtener pedidos del cliente: ${error.message}`);
  }

  return data || [];
}

export async function crearPedidoAction(
  sucursalDestino: string,
  fechaRequerida: string,
  observaciones: string,
  items: { promoId: string; cantidad: number }[],
  billingData: { nombres: string; tipoDoc: string; numeroDoc: string },
  logisticaData: { tipoUbicacion: string; direccion: string; latitud: number; longitud: number; telefono: string; indicaciones: string },
  financieroData: { cuponAplicado: string; descuentoBs: number; metodoPago: string }
) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. VALIDACIÓN DE STOCK (Condición Crítica QA)
  for (const item of items) {
    const { data: promo, error: promoErr } = await supabase
      .from('promociones_sanjuan')
      .select('titulo, stock_disponible, activo')
      .eq('id', item.promoId)
      .single();

    if (promoErr || !promo) {
      return { error: `La promoción seleccionada ya no existe en el catálogo.` };
    }

    if (!promo.activo) {
      return { error: `La promoción "${promo.titulo}" ya no se encuentra activa.` };
    }

    if (item.cantidad > promo.stock_disponible) {
      return { 
        error: `Inconsistencia de Stock: Solicitado ${item.cantidad} de "${promo.titulo}", pero solo quedan ${promo.stock_disponible} disponibles.` 
      };
    }
  }

  // 2. INSERCIÓN DE PEDIDO EN TRANSACCIÓN
  let subtotalBs = 0;
  const itemsConSubtotal = [];

  for (const item of items) {
    const { data: promo } = await supabase
      .from('promociones_sanjuan')
      .select('precio_bs')
      .eq('id', item.promoId)
      .single();
    
    const subtotal = Number(promo.precio_bs) * item.cantidad;
    subtotalBs += subtotal;
    itemsConSubtotal.push({
      promo_id: item.promoId,
      cantidad: item.cantidad,
      subtotal_bs: subtotal
    });
  }

  // Calcular total restando descuento
  const totalBs = Math.max(0, subtotalBs - financieroData.descuentoBs);

  // Insertar pedido principal con datos de invitados y logística
  const { data: pedido, error: pedidoErr } = await supabase
    .from('pedidos')
    .insert([
      {
        usuario_id: user?.id || null, // NULLABLE para Guest Checkout
        total_bs: totalBs,
        estado: 'pendiente',
        // Facturación
        nombres_facturacion: billingData.nombres,
        tipo_documento: billingData.tipoDoc,
        numero_documento: billingData.numeroDoc,
        // Logística
        tipo_ubicacion: logisticaData.tipoUbicacion,
        direccion_entrega: logisticaData.direccion,
        latitud: logisticaData.latitud,
        longitud: logisticaData.longitud,
        telefono_contacto: logisticaData.telefono,
        indicaciones_entrega: logisticaData.indicaciones,
        // Finanzas
        cupon_aplicado: financieroData.cuponAplicado || null,
        descuento_bs: financieroData.descuentoBs,
        metodo_pago: financieroData.metodoPago,
        // Observaciones y Fecha
        fecha_creacion: new Date().toISOString()
      }
    ])
    .select()
    .single();

  if (pedidoErr || !pedido) {
    return { error: `Error al registrar el pedido principal: ${pedidoErr.message}` };
  }

  // Insertar ítems
  const itemsInsert = itemsConSubtotal.map(item => ({
    pedido_id: pedido.id,
    promo_id: item.promo_id,
    cantidad: item.cantidad,
    subtotal_bs: item.subtotal_bs
  }));

  const { error: itemsErr } = await supabase.from('pedido_items').insert(itemsInsert);

  if (itemsErr) {
    // Si falla, intentamos limpiar el pedido creado
    await supabase.from('pedidos').delete().eq('id', pedido.id);
    return { error: `Error al registrar los combos de la reserva: ${itemsErr.message}` };
  }

  // 3. REDUCCIÓN DE STOCK ATÓMICA AL CREAR
  for (const item of items) {
    const { error: updateStockErr } = await supabase.rpc('decrementar_stock', {
      promo_id: item.promoId,
      cant: item.cantidad
    });

    if (updateStockErr) {
      const { data: currentPromo } = await supabase
        .from('promociones_sanjuan')
        .select('stock_disponible')
        .eq('id', item.promoId)
        .single();
      
      const newStock = Math.max(0, currentPromo.stock_disponible - item.cantidad);
      await supabase
        .from('promociones_sanjuan')
        .update({ stock_disponible: newStock })
        .eq('id', item.promoId);
    }
  }

  revalidatePath('/reservas');
  revalidatePath('/admin/pedidos');
  
  return { success: true, pedidoId: pedido.id };
}

export async function aprobarPedidoAction(pedidoId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('pedidos')
    .update({ estado: 'aprobado' })
    .eq('id', pedidoId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/pedidos');
  return { success: true };
}

export async function cancelarPedidoAction(pedidoId: string) {
  const supabase = await createClient();

  // Si cancelamos, idealmente devolvemos el stock
  const { data: items } = await supabase
    .from('pedido_items')
    .select('promo_id, cantidad')
    .eq('pedido_id', pedidoId);

  if (items) {
    for (const item of items) {
      const { data: promo } = await supabase
        .from('promociones_sanjuan')
        .select('stock_disponible')
        .eq('id', item.promo_id)
        .single();

      if (promo) {
        await supabase
          .from('promociones_sanjuan')
          .update({ stock_disponible: promo.stock_disponible + item.cantidad })
          .eq('id', item.promo_id);
      }
    }
  }

  const { error } = await supabase
    .from('pedidos')
    .update({ estado: 'cancelado' })
    .eq('id', pedidoId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/pedidos');
  return { success: true };
}
