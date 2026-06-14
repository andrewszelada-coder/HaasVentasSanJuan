'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { getPedidos, actualizarEstadoPedidoAction } from '@/app/actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { 
  ClipboardList, CheckCircle2, Loader2, Eye, Phone, Info, Search, 
  Clock, Package, Check, MessageSquare, Printer, Calendar
} from 'lucide-react';

interface PedidoItem {
  id: string;
  cantidad: number;
  subtotal_bs: number;
  promociones_sanjuan?: {
    titulo: string;
    precio_bs: number;
  };
}

interface Pedido {
  id: string;
  total_bs: number;
  estado: 'pendiente' | 'aprobado' | 'cancelado' | 'preparando' | 'entregado';
  fecha_creacion: string;
  nombres_facturacion?: string;
  tipo_documento?: string;
  numero_documento?: string;
  tipo_ubicacion?: string;
  direccion_entrega?: string;
  telefono_contacto?: string;
  indicaciones_entrega?: string;
  cupon_aplicado?: string;
  descuento_bs?: number;
  metodo_pago?: string;
  usuarios?: {
    email: string;
    empresa: string;
    nit: string;
  };
  sucursal_seleccionada?: string;
  pedido_items?: PedidoItem[];
  status_pago: boolean;
}

export default function SucursalDashboardPage() {
  const supabase = createClient();
  const router = useRouter();

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);

  // User Profile from Supabase public.usuarios
  const [profile, setProfile] = useState<{ rol: string; sucursal: string } | null>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'hoy' | 'todos'>('hoy');

  const loadProfileAndData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sesión no iniciada.");
        router.push('/login');
        return;
      }

      const { data: userProfile, error: profileErr } = await supabase
        .from('usuarios')
        .select('rol, sucursal')
        .eq('id', user.id)
        .single();

      if (profileErr || !userProfile) {
        toast.error("Error al obtener perfil.");
        return;
      }

      setProfile(userProfile);

      // Fetch orders
      const data = await getPedidos(dateFilter === 'hoy');
      setPedidos(data as any[]);
    } catch (err) {
      toast.error("Error al cargar datos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileAndData();
  }, [dateFilter]);

  useEffect(() => {
    const channel = supabase
      .channel('realtime-sucursal-pedidos')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pedidos' },
        (payload) => {
          const updated = payload.new as any;
          setPedidos(prev => 
            prev.map(p => 
              p.id === updated.id 
                ? { ...p, estado: updated.estado, status_pago: updated.status_pago } 
                : p
            )
          );
          setSelectedPedido(prev => {
            if (prev && prev.id === updated.id) {
              return { ...prev, estado: updated.estado, status_pago: updated.status_pago };
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleStatusChange = (id: string, nuevoEstado: 'pendiente' | 'aprobado' | 'cancelado' | 'preparando' | 'entregado') => {
    setActionId(id);
    startTransition(async () => {
      try {
        const result = await actualizarEstadoPedidoAction(id, nuevoEstado);
        if (result && result.error) {
          toast.error(`Error: ${result.error}`);
        } else {
          toast.success(`Pedido actualizado a estado: "${nuevoEstado}"`);
          // Refresh locally
          setPedidos(prev => 
            prev.map(p => p.id === id ? { ...p, estado: nuevoEstado } : p)
          );
          if (selectedPedido && selectedPedido.id === id) {
            setSelectedPedido(prev => prev ? { ...prev, estado: nuevoEstado } : null);
          }
        }
      } catch (err) {
        toast.error("Error al cambiar estado.");
      } finally {
        setActionId(null);
      }
    });
  };

  // WhatsApp Link Direct generator
  const openWhatsApp = (pedido: Pedido) => {
    const phone = pedido.telefono_contacto || '';
    if (!phone) {
      toast.error("El cliente no registró número de contacto.");
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('591') ? cleanPhone : `591${cleanPhone}`;
    const codigoPedido = `HAAS-${pedido.id.slice(-6).toUpperCase()}`;
    const sucursal = pedido.sucursal_seleccionada || profile?.sucursal || 'Nuestra sucursal';

    const itemsSummary = pedido.pedido_items?.map(item => 
      `• ${item.cantidad}x ${item.promociones_sanjuan?.titulo || 'Combo'}`
    ).join('\n') || '';

    const text = `¡Hola! 👋 Le escribimos de la sucursal *${sucursal}* de Industrias Haas para confirmar su reserva *${codigoPedido}*.

📋 Detalle:
${itemsSummary}

💰 Total: Bs. ${Number(pedido.total_bs).toFixed(2)}

¿En qué horario aproximado pasará a realizar el retiro de sus productos? Quedamos atentos para tener todo listo. ¡Muchas gracias! 🙌`;

    window.open(`https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(text)}`, '_blank');
  };

  // Ticket Printing logic
  const handlePrintTicket = () => {
    if (!selectedPedido) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("No se pudo abrir la ventana de impresión.");
      return;
    }

    const code = `HAAS-${selectedPedido.id.slice(-6).toUpperCase()}`;
    const clientName = selectedPedido.nombres_facturacion || selectedPedido.usuarios?.empresa || 'Consumidor Final';
    const dateStr = new Date(selectedPedido.fecha_creacion).toLocaleString('es-BO', { timeZone: 'America/La_Paz' });

    const itemsHtml = selectedPedido.pedido_items?.map(item => `
      <tr>
        <td style="padding: 4px 0; text-align: left;">${item.promociones_sanjuan?.titulo || 'Combo'} x${item.cantidad}</td>
        <td style="padding: 4px 0; text-align: right;">Bs. ${Number(item.subtotal_bs).toFixed(2)}</td>
      </tr>
    `).join('') || '';

    const html = `
      <html>
        <head>
          <title>Ticket Reserva ${code}</title>
          <style>
            @media print {
              body { width: 80mm; font-family: monospace; font-size: 11px; margin: 0; padding: 5px; }
              .center { text-align: center; }
              .divider { border-top: 1px dashed #000; margin: 8px 0; }
              table { width: 100%; border-collapse: collapse; }
              .bold { font-weight: bold; }
              .text-right { text-align: right; }
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="center">
            <h3 style="margin: 0 0 5px 0;">INDUSTRIAS HAAS</h3>
            <span style="font-size: 9px;">Comprobante de Reserva</span><br/>
            <span style="font-size: 9px; font-weight: bold;">${selectedPedido.sucursal_seleccionada || 'Retiro'}</span>
          </div>
          
          <div class="divider"></div>
          
          <div>
            <strong>Ticket:</strong> ${code}<br/>
            <strong>Fecha:</strong> ${dateStr}<br/>
            <strong>Cliente:</strong> ${clientName}<br/>
            <strong>Celular:</strong> ${selectedPedido.telefono_contacto || 'S/N'}<br/>
            <strong>Factura Doc:</strong> ${selectedPedido.tipo_documento || 'CI'}: ${selectedPedido.numero_documento || 'S/N'}
          </div>
          
          <div class="divider"></div>
          
          <table>
            <thead>
              <tr>
                <th style="text-align: left;">Detalle</th>
                <th style="text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div class="divider"></div>
          
          <div class="text-right bold" style="font-size: 12px;">
            Total con 10% desc: Bs. ${Number(selectedPedido.total_bs).toFixed(2)}
          </div>
          
          <div class="divider"></div>
          
          <div class="center" style="font-size: 8px; margin-top: 10px;">
            ¡Muchas gracias por su preferencia!
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Client-side search and fail-safe sucursal filter
  const filteredPedidos = pedidos.filter(p => {
    // Fail-safe filtering by branch if loaded in page
    if (profile && ['vendedor', 'sucursal'].includes(profile.rol) && p.sucursal_seleccionada !== profile.sucursal) {
      return false;
    }

    const code = `HAAS-${p.id.slice(-6).toUpperCase()}`;
    const customer = (p.nombres_facturacion || p.usuarios?.empresa || 'Consumidor Final').toLowerCase();
    const search = searchTerm.toLowerCase();

    return code.toLowerCase().includes(search) || customer.includes(search) || (p.telefono_contacto && p.telefono_contacto.includes(search));
  });

  const countPending = filteredPedidos.filter(p => p.estado === 'pendiente' || p.estado === 'aprobado').length;
  const countPreparing = filteredPedidos.filter(p => p.estado === 'preparando').length;
  const countDelivered = filteredPedidos.filter(p => p.estado === 'entregado').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto selection:bg-[#cc0000] selection:text-white pb-12">
      
      {/* Upper Status Welcome banner */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-600 animate-pulse" />
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              Dashboard de Sucursal
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-semibold font-mono">
            {profile ? `📍 ${profile.sucursal}` : 'Cargando Sucursal...'}
          </p>
        </div>

        {/* Quick Date Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <Button
            size="sm"
            variant={dateFilter === 'hoy' ? 'default' : 'ghost'}
            onClick={() => setDateFilter('hoy')}
            className={`text-xs font-bold px-3 py-1.5 h-8 rounded-lg uppercase ${
              dateFilter === 'hoy' ? 'bg-[#cc0000] hover:bg-[#a30000] text-white' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 mr-1" /> Hoy
          </Button>
          <Button
            size="sm"
            variant={dateFilter === 'todos' ? 'default' : 'ghost'}
            onClick={() => setDateFilter('todos')}
            className={`text-xs font-bold px-3 py-1.5 h-8 rounded-lg uppercase ${
              dateFilter === 'todos' ? 'bg-[#cc0000] hover:bg-[#a30000] text-white' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Ver Todos
          </Button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-slate-200/80 bg-white shadow-sm rounded-2xl relative overflow-hidden">
          <div className="h-1 bg-yellow-500 absolute top-0 left-0 right-0" />
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Reservas Pendientes</span>
              <span className="text-2xl font-black text-slate-900 leading-none block">{countPending}</span>
            </div>
            <Clock className="w-8 h-8 text-yellow-500 opacity-60" />
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 bg-white shadow-sm rounded-2xl relative overflow-hidden">
          <div className="h-1 bg-blue-500 absolute top-0 left-0 right-0" />
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">En Preparación</span>
              <span className="text-2xl font-black text-slate-900 leading-none block">{countPreparing}</span>
            </div>
            <Package className="w-8 h-8 text-blue-500 opacity-60" />
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 bg-white shadow-sm rounded-2xl relative overflow-hidden">
          <div className="h-1 bg-emerald-500 absolute top-0 left-0 right-0" />
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Entregados / Listos</span>
              <span className="text-2xl font-black text-slate-900 leading-none block">{countDelivered}</span>
            </div>
            <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-60" />
          </CardContent>
        </Card>
      </div>

      {/* Orders Filter & Table List */}
      <Card className="border border-slate-200/80 bg-white shadow-md rounded-3xl overflow-hidden relative">
        <div className="h-[3px] bg-[#cc0000] absolute top-0 left-0 right-0" />
        
        {/* Table Search Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/20 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="space-y-0.5">
            <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">Pedidos de la Sucursal</CardTitle>
            <CardDescription className="text-[10px] font-medium text-slate-400">Panel operativo para despachar productos y notificar clientes.</CardDescription>
          </div>

          <div className="relative w-full md:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente, ID o Celular..."
              className="bg-white text-xs text-black border-slate-250 placeholder:text-slate-400 pl-9 rounded-xl h-9 focus-visible:ring-[#cc0000] focus-visible:border-[#cc0000] shadow-sm"
            />
          </div>
        </div>

        {/* Orders Table rendering */}
        <CardContent className="p-0">
          {loading ? (
            <div className="p-16 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#cc0000] mx-auto mb-2" />
              <span className="text-xs font-bold text-slate-600 uppercase font-mono tracking-wider">Cargando pedidos de sucursal...</span>
            </div>
          ) : filteredPedidos.length === 0 ? (
            <div className="p-16 text-center text-slate-400 text-xs font-mono">
              No se encontraron reservas registradas para esta vista.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50 border-b border-slate-100 select-none">
                  <TableRow>
                    <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono px-6">Código</TableHead>
                    <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Cliente</TableHead>
                    <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Productos</TableHead>
                    <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Monto</TableHead>
                    <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Estado</TableHead>
                    <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Estado Pago</TableHead>
                    <TableHead className="text-right text-xs font-bold text-slate-500 uppercase tracking-wider font-mono px-6">Acción Operativa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPedidos.map(pedido => {
                    const formattedCode = `HAAS-${pedido.id.slice(-6).toUpperCase()}`;
                    const isUpdating = actionId === pedido.id;
                    const phoneNum = pedido.telefono_contacto;
                    
                    return (
                      <TableRow key={pedido.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <TableCell className="font-mono text-xs font-bold text-slate-500 px-6">
                          {formattedCode}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <span className="block font-bold text-slate-900 text-xs">
                              {pedido.nombres_facturacion || pedido.usuarios?.empresa || 'Consumidor Final'}
                            </span>
                            {phoneNum && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-mono font-semibold">
                                <Phone className="w-3 h-3 text-[#cc0000]" /> {phoneNum}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate">
                          {pedido.pedido_items?.map((item, idx) => (
                            <div key={item.id || idx} className="text-[11px] text-slate-600 font-medium truncate">
                              {item.promociones_sanjuan?.titulo || 'Combo'} <span className="font-bold text-slate-400">x{item.cantidad}</span>
                            </div>
                          ))}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-black text-[#cc0000]">
                          Bs. {Number(pedido.total_bs).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={`text-[9px] font-bold py-0.5 px-2.5 rounded-full uppercase tracking-wider ${
                              pedido.estado === 'entregado'
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : pedido.estado === 'preparando'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : pedido.estado === 'cancelado'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                            }`}
                          >
                            {pedido.estado === 'entregado' ? 'Entregado' : pedido.estado === 'preparando' ? 'Preparando' : pedido.estado === 'cancelado' ? 'Cancelado' : 'Pendiente'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={`text-[9px] font-bold py-0.5 px-2.5 rounded-full uppercase tracking-wider ${
                              pedido.status_pago
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}
                          >
                            {pedido.status_pago ? 'Pagado' : 'Pendiente'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right px-6">
                          <div className="flex items-center justify-end gap-2">
                            {/* Ver detalle modal */}
                            <Button
                              onClick={() => {
                                setSelectedPedido(pedido);
                                setIsDetailOpen(true);
                              }}
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg cursor-pointer"
                              title="Ver Detalle"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            {/* Quick Action transition */}
                            {pedido.estado !== 'cancelado' ? (
                              <div className="w-[125px] text-left">
                                <Select 
                                  value={pedido.estado === 'entregado' ? 'entregado' : 'pendiente'} 
                                  onValueChange={(value) => handleStatusChange(pedido.id, value as any)}
                                  disabled={isPending && actionId === pedido.id}
                                >
                                  <SelectTrigger className="w-full h-8 text-[11px] font-bold border-slate-350 bg-white text-black shadow-sm flex items-center justify-between gap-1 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                                    <SelectValue placeholder="Estado" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-white border border-slate-150 rounded-lg shadow-lg z-50">
                                    <SelectItem value="pendiente" className="cursor-pointer text-gray-900 font-bold">
                                      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-yellow-800 border border-yellow-300">
                                        Pendiente
                                      </span>
                                    </SelectItem>
                                    <SelectItem 
                                      value="entregado" 
                                      disabled={!pedido.status_pago}
                                      className="cursor-pointer text-gray-900 font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                                      title={!pedido.status_pago ? "Requiere pago" : ""}
                                    >
                                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-green-800 border border-green-300">
                                        Entregado
                                      </span>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            ) : (
                              <Badge className="bg-red-100 text-red-800 border-none rounded-lg h-8 px-3 flex items-center gap-1 text-[10px] font-bold uppercase select-none">
                                Cancelado
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expandable Order Detail Modal Popup */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-3xl md:max-w-4xl w-11/12 bg-white border border-slate-200 text-slate-900 rounded-3xl p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[85vh]">
          {selectedPedido && (
            <>
              <DialogHeader className="border-b border-slate-150 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <DialogTitle className="text-lg font-black uppercase text-slate-950 flex items-center gap-2 tracking-wide leading-none">
                      <Info className="w-5.5 h-5.5 text-[#cc0000]" />
                      Detalle del Pedido: HAAS-{selectedPedido.id.slice(-6).toUpperCase()}
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 text-xs mt-1 font-bold">
                      Consolidado el {new Date(selectedPedido.fecha_creacion).toLocaleString('es-BO', { timeZone: 'America/La_Paz' })}
                    </DialogDescription>
                  </div>
                  
                  {/* Print ticket button */}
                  <Button
                    onClick={handlePrintTicket}
                    variant="outline"
                    size="sm"
                    className="h-8 border-slate-250 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 rounded-lg text-xs font-bold"
                  >
                    <Printer className="w-4 h-4 text-[#cc0000]" /> Imprimir Ticket
                  </Button>
                </div>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                
                {/* Invoice and Client card */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-3 shadow-inner">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Información del Cliente y Facturación</span>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between border-b border-slate-200/40 pb-1.5">
                      <span className="text-slate-500">Razon Social/Nombre:</span>
                      <span className="font-bold text-slate-900">{selectedPedido.nombres_facturacion || selectedPedido.usuarios?.empresa || 'Consumidor Final'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/40 pb-1.5">
                      <span className="text-slate-500">Documento:</span>
                      <span className="font-mono font-bold text-slate-900">{selectedPedido.tipo_documento || 'CI'}: {selectedPedido.numero_documento || 'S/N'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/40 pb-1.5">
                      <span className="text-slate-500">Celular de Contacto:</span>
                      <span className="font-mono font-bold text-slate-900">{selectedPedido.telefono_contacto || 'S/N'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/40 pb-1.5">
                      <span className="text-slate-500">Email:</span>
                      <span className="font-mono font-bold text-slate-900">{selectedPedido.usuarios?.email || 'Invitado'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Sucursal:</span>
                      <span className="font-bold text-[#cc0000]">{selectedPedido.sucursal_seleccionada || 'Central'}</span>
                    </div>
                  </div>
                </div>

                {/* Logistics details card */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-3 shadow-inner">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Indicaciones de Logística</span>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between border-b border-slate-200/40 pb-1.5">
                      <span className="text-slate-500">Modo:</span>
                      <span className="font-bold text-slate-900">Reserva y Recojo</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/40 pb-1.5">
                      <span className="text-slate-500">Método de Pago:</span>
                      <span className="font-bold text-slate-900">{selectedPedido.metodo_pago || 'Transferencia QR'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/40 pb-1.5">
                      <span className="text-slate-500">Estado de Pago:</span>
                      <span className={`font-bold uppercase tracking-wider ${selectedPedido.status_pago ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedPedido.status_pago ? 'Pagado' : 'Pendiente'}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-500 block">Indicaciones / Sucursal de retiro:</span>
                      <span className="block font-medium text-slate-700 bg-white/80 border border-slate-200/40 rounded-lg p-2 font-mono text-[10px] leading-relaxed">
                        {selectedPedido.indicaciones_entrega || 'Recojo en la sucursal seleccionada'}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Combos list card */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden mt-6 shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50 select-none">
                    <TableRow>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Combo / Promoción San Juan</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Precio Unitario</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Cantidad</TableHead>
                      <TableHead className="text-right text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPedido.pedido_items?.map((item, idx) => (
                      <TableRow key={item.id || idx} className="hover:bg-slate-50/40 transition-colors">
                        <TableCell className="font-bold text-slate-900 text-xs">
                          {item.promociones_sanjuan?.titulo || 'Combo San Juan'}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-600">
                          Bs. {Number(item.promociones_sanjuan?.precio_bs || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-600 font-bold">
                          {item.cantidad} combos
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-black text-[#cc0000]">
                          Bs. {Number(item.subtotal_bs).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Subtotals and Net amounts card */}
                <div className="bg-slate-50 border-t border-slate-200 p-6 flex justify-end">
                  <div className="w-full md:max-w-xs space-y-2 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Monto Combos:</span>
                      <span className="font-mono">Bs. {Number(Number(selectedPedido.total_bs) + Number(selectedPedido.descuento_bs || 0)).toFixed(2)}</span>
                    </div>
                    {Number(selectedPedido.descuento_bs || 0) > 0 && (
                      <div className="flex justify-between text-emerald-600 font-bold">
                        <span>Descuento aplicado (10%):</span>
                        <span className="font-mono">- Bs. {Number(selectedPedido.descuento_bs).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 text-sm font-bold">
                      <span className="text-slate-900 uppercase">Total a Cobrar:</span>
                      <span className="text-base font-black font-mono text-[#cc0000]">Bs. {Number(selectedPedido.total_bs).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons in Modal footer */}
              <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end gap-3">
                <Button
                  onClick={() => setIsDetailOpen(false)}
                  className="bg-white border border-slate-250 text-slate-700 hover:bg-slate-50 text-xs font-bold px-4 py-2 rounded-lg cursor-pointer"
                >
                  Cerrar
                </Button>

                {selectedPedido.estado !== 'cancelado' && (
                  <div className="w-[150px] text-left">
                    <Select 
                      value={selectedPedido.estado === 'entregado' ? 'entregado' : 'pendiente'} 
                      onValueChange={(value) => handleStatusChange(selectedPedido.id, value as any)}
                      disabled={isPending}
                    >
                      <SelectTrigger className="w-full h-9 text-xs font-bold border-slate-350 bg-white text-black shadow-sm flex items-center justify-between gap-1 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-slate-150 rounded-lg shadow-lg z-50">
                        <SelectItem value="pendiente" className="cursor-pointer text-gray-900 font-bold">
                          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-yellow-800 border border-yellow-300">
                            Pendiente
                          </span>
                        </SelectItem>
                        <SelectItem 
                          value="entregado" 
                          disabled={!selectedPedido.status_pago}
                          className="cursor-pointer text-gray-900 font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                          title={!selectedPedido.status_pago ? "Requiere pago" : ""}
                        >
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-800 border border-green-300">
                            Entregado
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
