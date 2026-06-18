'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// =========================================================================
// HELPER DE SANITIZACIÓN (recursivo, constante y seguro)
// =========================================================================
const clean = <T>(data: T): T => {
  if (data === null || data === undefined) {
    return data;
  }
  if (typeof data === 'string') {
    return (data as string).trim() as unknown as T;
  }
  if (Array.isArray(data)) {
    return data.map(item => clean(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const cleaned: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        cleaned[key] = clean((data as any)[key]);
      }
    }
    return cleaned as T;
  }
  return data;
};

// =========================================================================
// HELPER PARA VERIFICAR ROL DE ADMINISTRADOR (SEGURIDAD SERVIDOR)
// =========================================================================
async function checkAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single();

  return profile?.rol === 'admin';
}

// =========================================================================
// 1. AUTENTICACIÓN
// =========================================================================

export async function loginAction(formData: FormData) {
  let email = (formData.get('email') as string) || '';
  let password = (formData.get('password') as string) || '';

  email = clean(email);
  password = clean(password);

  if (!email || !password) {
    return { error: 'Por favor, ingrese correo electrónico y contraseña.' };
  }

  // Validación de Email (Regex de formato real)
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return { error: 'El formato del correo electrónico ingresado no es válido.' };
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
  } else if (profile?.rol === 'vendedor' || profile?.rol === 'sucursal') {
    redirect('/admin/sucursal');
  } else {
    redirect('/reservas');
  }
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/reservas');
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
  imagen_url: string;
  activo: boolean;
  categoria: string;
  tipo_venta: string;
}) {
  const cleaned = clean(data);
  const supabase = await createClient();

  if (!(await checkAdmin(supabase))) {
    return { error: 'No autorizado. Permisos insuficientes.' };
  }

  const { error } = await supabase.from('promociones_sanjuan').insert([
    {
      titulo: cleaned.titulo,
      descripcion: cleaned.descripcion,
      precio_bs: cleaned.precio_bs,
      stock_disponible: 99999,
      imagen_url: cleaned.imagen_url || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500',
      activo: cleaned.activo,
      categoria: cleaned.categoria || 'Combos San Juan',
      tipo_venta: cleaned.tipo_venta || 'Unidad/Paquete',
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
  imagen_url: string;
  activo: boolean;
  categoria: string;
  tipo_venta: string;
}) {
  const cleanedId = clean(id);
  const cleaned = clean(data);
  const supabase = await createClient();

  if (!(await checkAdmin(supabase))) {
    return { error: 'No autorizado. Permisos insuficientes.' };
  }

  const { error } = await supabase
    .from('promociones_sanjuan')
    .update({
      titulo: cleaned.titulo,
      descripcion: cleaned.descripcion,
      precio_bs: cleaned.precio_bs,
      stock_disponible: 99999,
      imagen_url: cleaned.imagen_url,
      activo: cleaned.activo,
      categoria: cleaned.categoria,
      tipo_venta: cleaned.tipo_venta,
    })
    .eq('id', cleanedId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/promos');
  revalidatePath('/reservas');
  return { success: true };
}

export async function togglePromoActivoAction(id: string, activo: boolean) {
  const cleanedId = clean(id);
  const supabase = await createClient();

  if (!(await checkAdmin(supabase))) {
    return { error: 'No autorizado. Permisos insuficientes.' };
  }

  const { error } = await supabase
    .from('promociones_sanjuan')
    .update({ activo })
    .eq('id', cleanedId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/promos');
  revalidatePath('/reservas');
  return { success: true };
}

export async function eliminarPromoAction(id: string) {
  const cleanedId = clean(id);
  const supabase = await createClient();

  if (!(await checkAdmin(supabase))) {
    return { error: 'No autorizado. Permisos insuficientes.' };
  }

  const { error } = await supabase
    .from('promociones_sanjuan')
    .delete()
    .eq('id', cleanedId);

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

export async function getPedidos(soloHoy = false, desde?: string, hasta?: string) {
  const supabase = await createClient();

  let query = supabase
    .from('pedidos')
    .select(`
      *,
      usuarios (
        email,
        empresa,
        nit,
        sucursal
      ),
      pedido_items (
        id,
        cantidad,
        subtotal_bs,
        promociones_sanjuan (
          titulo,
          precio_bs,
          tipo_venta
        )
      )
    `);

  if (soloHoy) {
    const laPazDate = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/La_Paz' });
    const startOfDay = `${laPazDate}T00:00:00.000-04:00`;
    const endOfDay = `${laPazDate}T23:59:59.999-04:00`;
    query = query.gte('fecha_creacion', startOfDay).lte('fecha_creacion', endOfDay);
  } else {
    if (desde) {
      const startOfDesde = `${desde}T00:00:00.000-04:00`;
      query = query.gte('fecha_creacion', startOfDesde);
    }
    if (hasta) {
      const endOfHasta = `${hasta}T23:59:59.999-04:00`;
      query = query.lte('fecha_creacion', endOfHasta);
    }
  }

  const { data, error } = await query.order('fecha_creacion', { ascending: false });

  if (error) {
    throw new Error(`Error al obtener pedidos: ${error.message}`);
  }

  return data || [];
}

export async function getPedidosCliente(userId: string) {
  const cleanedUserId = clean(userId);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      *,
      pedido_items (
        id,
        cantidad,
        subtotal_bs,
        promociones_sanjuan (
          id,
          titulo,
          precio_bs,
          descripcion,
          imagen_url
        )
      )
    `)
    .eq('usuario_id', cleanedUserId)
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
  // 1. Sanitización de datos de entrada mediante la constante clean
  const cleanedSucursalDestino = clean(sucursalDestino);
  const cleanedFechaRequerida = clean(fechaRequerida);
  const cleanedObservaciones = clean(observaciones);
  const cleanedItems = clean(items).map((item: any) => ({
    promoId: item.promoId,
    cantidad: typeof item.cantidad === 'string' ? parseFloat(item.cantidad) : Number(item.cantidad)
  }));
  const cleanedBilling = clean(billingData);
  const cleanedLogistica = clean(logisticaData);
  const cleanedFinanciero = clean(financieroData);

  // 2. Validaciones estrictas de datos y reglas de negocio
  
  // Teléfono: Asegura que sea un string, que tenga exactamente 8 dígitos y que empiece por '6' o '7'
  if (typeof cleanedLogistica.telefono !== 'string') {
    return { error: 'El número de teléfono debe ser una cadena de texto (string).' };
  }
  const boliviaPhoneRegex = /^[67]\d{7}$/;
  if (!boliviaPhoneRegex.test(cleanedLogistica.telefono)) {
    return { error: 'El número de teléfono de contacto debe comenzar con 6 o 7 y tener exactamente 8 dígitos.' };
  }

  // NIT: Asegura que solo contenga números y no caracteres especiales (en caso de que el tipo de documento sea NIT y esté ingresado)
  if (cleanedBilling.numeroDoc && cleanedBilling.tipoDoc && cleanedBilling.tipoDoc.toUpperCase() === 'NIT') {
    if (typeof cleanedBilling.numeroDoc !== 'string') {
      return { error: 'El número de NIT debe ser una cadena de texto.' };
    }
    const nitRegex = /^\d+$/;
    if (!nitRegex.test(cleanedBilling.numeroDoc)) {
      return { error: 'El número de NIT debe contener únicamente dígitos del 0 al 9 sin caracteres especiales.' };
    }
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  for (const item of cleanedItems) {
    const { data: promo, error: promoErr } = await supabase
      .from('promociones_sanjuan')
      .select('titulo, stock_disponible, activo, tipo_venta')
      .eq('id', item.promoId)
      .single();

    if (promoErr || !promo) {
      return { error: `La promoción seleccionada ya no existe en el catálogo.` };
    }

    if (!promo.activo) {
      return { error: `La promoción "${promo.titulo}" ya no se encuentra activa.` };
    }

    // Validación según tipo de venta (a granel vs unitario)
    if (promo.tipo_venta === 'A granel (Kg)') {
      if (typeof item.cantidad !== 'number' || isNaN(item.cantidad) || item.cantidad <= 0) {
        return { error: `La cantidad para "${promo.titulo}" debe ser un número decimal positivo.` };
      }
    } else {
      if (!Number.isInteger(item.cantidad) || item.cantidad <= 0) {
        return { error: `La cantidad para "${promo.titulo}" debe ser un número entero positivo.` };
      }
    }

    if (item.cantidad > promo.stock_disponible) {
      return {
        error: `Inconsistencia de Stock: Solicitado ${item.cantidad} de "${promo.titulo}", pero solo quedan ${promo.stock_disponible} disponibles.`
      };
    }
  }

  let subtotalBs = 0;
  const itemsConSubtotal = [];

  for (const item of cleanedItems) {
    const { data: promo } = await supabase
      .from('promociones_sanjuan')
      .select('precio_bs')
      .eq('id', item.promoId)
      .single();

    const subtotal = Number((Number(promo?.precio_bs || 0) * item.cantidad).toFixed(2));
    subtotalBs = Number((subtotalBs + subtotal).toFixed(2));
    itemsConSubtotal.push({
      promo_id: item.promoId,
      cantidad: item.cantidad,
      subtotal_bs: subtotal
    });
  }

  let serverDescuentoBs = 0;
  const today = new Date();
  const limitDate = new Date('2026-06-18T23:59:59');
  if (today <= limitDate) {
    serverDescuentoBs = Number((subtotalBs * 0.10).toFixed(2));
  }

  const finalDescuentoBs = serverDescuentoBs;
  const totalBs = Number(Math.max(0, subtotalBs - finalDescuentoBs).toFixed(2));

  const { data: pedido, error: pedidoErr } = await supabase
    .from('pedidos')
    .insert([
      {
        usuario_id: user?.id || null,
        total_bs: totalBs,
        estado: 'pendiente',
        nombres_facturacion: cleanedBilling.nombres,
        tipo_documento: cleanedBilling.tipoDoc,
        numero_documento: cleanedBilling.numeroDoc,
        tipo_ubicacion: cleanedLogistica.tipoUbicacion,
        direccion_entrega: cleanedLogistica.direccion,
        latitud: cleanedLogistica.latitud,
        longitud: cleanedLogistica.longitud,
        telefono_contacto: cleanedLogistica.telefono,
        indicaciones_entrega: cleanedLogistica.indicaciones,
        cupon_aplicado: serverDescuentoBs > 0 ? 'AUTO_10' : null,
        descuento_bs: finalDescuentoBs,
        metodo_pago: 'Transferencia QR',
        sucursal_seleccionada: cleanedSucursalDestino,
        fecha_creacion: new Date().toISOString()
      }
    ])
    .select()
    .single();

  if (pedidoErr || !pedido) {
    return { error: `Error al registrar el pedido principal: ${pedidoErr?.message || 'No se pudo crear el registro.'}` };
  }

  const itemsInsert = itemsConSubtotal.map(item => ({
    pedido_id: pedido.id,
    promo_id: item.promo_id,
    cantidad: item.cantidad,
    subtotal_bs: item.subtotal_bs
  }));

  const { error: itemsErr } = await supabase.from('pedido_items').insert(itemsInsert);

  if (itemsErr) {
    await supabase.from('pedidos').delete().eq('id', pedido.id);
    return { error: `Error al registrar los combos de la reserva: ${itemsErr.message}` };
  }

  for (const item of cleanedItems) {
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

      const newStock = Math.max(0, (currentPromo?.stock_disponible || 0) - item.cantidad);
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
  const cleanedId = clean(pedidoId);
  const supabase = await createClient();

  const { error } = await supabase
    .from('pedidos')
    .update({ estado: 'aprobado' })
    .eq('id', cleanedId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/pedidos');
  return { success: true };
}

export async function cancelarPedidoAction(pedidoId: string) {
  const cleanedId = clean(pedidoId);
  const supabase = await createClient();

  const { data: items } = await supabase
    .from('pedido_items')
    .select('promo_id, cantidad')
    .eq('pedido_id', cleanedId);

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
    .eq('id', cleanedId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/pedidos');
  return { success: true };
}

export async function actualizarEstadoPedidoAction(
  pedidoId: string,
  nuevoEstado: 'pendiente' | 'aprobado' | 'cancelado' | 'preparando' | 'entregado'
) {
  const cleanedId = clean(pedidoId);
  const cleanedEstado = clean(nuevoEstado);
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado. Debe iniciar sesión.' };

  const { data: profile } = await supabase
    .from('usuarios')
    .select('rol, sucursal')
    .eq('id', user.id)
    .single();

  if (!profile) return { error: 'No autorizado. Usuario no registrado.' };

  const isAdmin = profile.rol === 'admin';
  const isSucursalManager = ['vendedor', 'sucursal'].includes(profile.rol);

  if (!isAdmin && !isSucursalManager) {
    return { error: 'No autorizado. Permisos insuficientes.' };
  }

  const { data: pedido, error: fetchErr } = await supabase
    .from('pedidos')
    .select('estado, sucursal_seleccionada, status_pago')
    .eq('id', cleanedId)
    .single();

  if (fetchErr || !pedido) {
    return { error: 'El pedido no existe, no se pudo consultar o no tiene permisos sobre él.' };
  }

  if (isSucursalManager && profile.sucursal !== pedido.sucursal_seleccionada) {
    return { error: 'No autorizado. Este pedido pertenece a otra sucursal.' };
  }

  // Restricción de entrega si no está pagado
  if (isSucursalManager && !pedido.status_pago && cleanedEstado === 'entregado') {
    return { error: 'No se puede entregar un pedido que no ha sido pagado (status_pago es false).' };
  }

  const estadoAnterior = pedido.estado;
  if (estadoAnterior === cleanedEstado) {
    return { success: true };
  }

  if (estadoAnterior === 'cancelado' && cleanedEstado !== 'cancelado') {
    const { data: items } = await supabase
      .from('pedido_items')
      .select('promo_id, cantidad')
      .eq('pedido_id', cleanedId);

    if (items) {
      for (const item of items) {
        const { error: updateStockErr } = await supabase.rpc('decrementar_stock', {
          promo_id: item.promo_id,
          cant: item.cantidad
        });

        if (updateStockErr) {
          const { data: currentPromo } = await supabase
            .from('promociones_sanjuan')
            .select('stock_disponible')
            .eq('id', item.promo_id)
            .single();

          const newStock = Math.max(0, (currentPromo?.stock_disponible || 0) - item.cantidad);
          await supabase
            .from('promociones_sanjuan')
            .update({ stock_disponible: newStock })
            .eq('id', item.promo_id);
        }
      }
    }
  }

  if (cleanedEstado === 'cancelado' && estadoAnterior !== 'cancelado') {
    const { data: items } = await supabase
      .from('pedido_items')
      .select('promo_id, cantidad')
      .eq('pedido_id', cleanedId);

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
  }

  const { error: updateErr } = await supabase
    .from('pedidos')
    .update({ estado: cleanedEstado })
    .eq('id', cleanedId);

  if (updateErr) {
    return { error: updateErr.message };
  }

  revalidatePath('/admin/pedidos');
  revalidatePath('/admin/sucursal');
  return { success: true };
}

export async function actualizarStatusPagoAction(pedidoId: string, statusPago: boolean) {
  const cleanedId = clean(pedidoId);
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado. Debe iniciar sesión.' };

  const { data: profile } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single();

  if (profile?.rol !== 'admin') {
    return { error: 'No autorizado. Solo el Administrador de fábrica puede modificar el estado de pago.' };
  }

  const { error: updateErr } = await supabase
    .from('pedidos')
    .update({ status_pago: statusPago })
    .eq('id', cleanedId);

  if (updateErr) {
    return { error: updateErr.message };
  }

  revalidatePath('/admin/pedidos');
  revalidatePath('/admin/sucursal');
  return { success: true };
}
