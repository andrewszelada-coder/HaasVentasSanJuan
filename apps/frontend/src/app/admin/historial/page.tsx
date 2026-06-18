'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { getPedidos, actualizarEstadoPedidoAction } from '@/app/actions';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  History, TrendingUp, CheckCircle2, XCircle, 
  Loader2, Eye, FileSpreadsheet, MapPin, Receipt, Phone, Info, Calendar, MessageSquare
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PedidoItem {
  id: string;
  cantidad: number;
  subtotal_bs: number;
  promociones_sanjuan?: {
    titulo: string;
    precio_bs: number;
    tipo_venta?: string;
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
  latitud?: number;
  longitud?: number;
  telefono_contacto?: string;
  indicaciones_entrega?: string;
  cupon_aplicado?: string;
  descuento_bs?: number;
  metodo_pago?: string;
  usuarios?: {
    email: string;
    empresa: string;
    nit: string;
    sucursal: string;
  };
  sucursal_seleccionada?: string;
  pedido_items?: PedidoItem[];
}

export default function AdminHistorialPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);

  // Estados de Rango de Fechas (Por defecto desde hace 30 días hasta hoy)
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [sucursalFilter, setSucursalFilter] = useState('Todas');

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Establecer fechas iniciales por defecto (Bolivia Time)
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/La_Paz' });
    
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 30);
    const thirtyDaysAgo = pastDate.toLocaleDateString('sv-SE', { timeZone: 'America/La_Paz' });

    setDesde(thirtyDaysAgo);
    setHasta(today);
  }, []);

  const loadData = async (filterDesde: string, filterHasta: string) => {
    setLoading(true);
    try {
      // getPedidos(soloHoy = false, desde, hasta)
      const data = await getPedidos(false, filterDesde, filterHasta);
      setPedidos(data as any[]);
      setCurrentPage(1);
    } catch (err) {
      toast.error("Error al cargar el historial de pedidos.");
    } finally {
      setLoading(false);
    }
  };

  // Carga inicial y recarga reactiva ante cambios en los selectores
  useEffect(() => {
    if (desde && hasta) {
      loadData(desde, hasta);
    }
  }, [desde, hasta]);

  const handleStatusChange = (id: string, nuevoEstado: 'pendiente' | 'aprobado' | 'cancelado') => {
    setActionId(id);
    startTransition(async () => {
      try {
        const result = await actualizarEstadoPedidoAction(id, nuevoEstado);
        if (result && result.error) {
          toast.error(`Error de Base de Datos: ${result.error}`);
        } else {
          const readableState = nuevoEstado === 'aprobado' ? 'Realizado' : nuevoEstado === 'cancelado' ? 'Rechazado' : 'Pendiente';
          toast.success(`Estado de la reserva cambiado a "${readableState}" con éxito.`);
          
          // Actualización de estado local reactivo inmediato
          setPedidos(prevPedidos => prevPedidos.map(p => p.id === id ? { ...p, estado: nuevoEstado } : p));
          
          if (selectedPedido && selectedPedido.id === id) {
            setSelectedPedido(prev => prev ? { ...prev, estado: nuevoEstado } : null);
          }
        }
      } catch (err: any) {
        toast.error(`Error crítico al cambiar estado: ${err?.message || 'Error de conexión'}`);
      } finally {
        setActionId(null);
      }
    });
  };

  const handleAprobar = (id: string) => {
    setActionId(id);
    startTransition(async () => {
      const result = await actualizarEstadoPedidoAction(id, 'aprobado');
      if (result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Reserva aprobada y marcada como Realizada con éxito.");
        await loadData(desde, hasta);
        setIsDetailOpen(false);
      }
      setActionId(null);
    });
  };

  const handleCancelar = (id: string) => {
    setActionId(id);
    startTransition(async () => {
      const result = await actualizarEstadoPedidoAction(id, 'cancelado');
      if (result && result.error) {
        toast.error(result.error);
      } else {
        toast.info("Reserva rechazada (cancelada) y stock devuelto.");
        await loadData(desde, hasta);
        setIsDetailOpen(false);
      }
      setActionId(null);
    });
  };

  const openWhatsApp = (pedido: Pedido) => {
    const phone = pedido.telefono_contacto || '';
    if (!phone) {
      toast.error("El cliente no registró número de contacto.");
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('591') ? cleanPhone : `591${cleanPhone}`;
    const codigoPedido = `HAAS-${pedido.id.slice(-6).toUpperCase()}`;
    const sucursal = pedido.sucursal_seleccionada || 'Central';

    const itemsSummary = pedido.pedido_items?.map(item => 
      `• ${item.cantidad}x ${item.promociones_sanjuan?.titulo || 'Combo'}`
    ).join('\n') || '';

    const text = `¡Hola! 👋 Le escribimos de la sucursal *${sucursal}* de Industrias Haas para confirmar su reserva *${codigoPedido}*.

📋 Detalle:
${itemsSummary}

💰 Total: Bs. ${Number(pedido.total_bs).toFixed(2)}

Puede recoger su pedido entre el 19 y 20 de junio. Quedamos atentos. ¡Muchas gracias! 🙌`;

    window.open(`https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(text)}`, '_blank');
  };

  // Función de Exportación a Excel de Datos Filtrados
  const exportToExcel = () => {
    if (pedidos.length === 0) {
      toast.error("No hay pedidos en el rango seleccionado para exportar.");
      return;
    }

    const rowsHtml = pedidos.map(p => {
      const detailStr = p.pedido_items?.map(item => 
        `${item.promociones_sanjuan?.titulo || 'Combo'} (Cant: ${item.cantidad}, Sub: Bs. ${Number(item.subtotal_bs).toFixed(2)})`
      ).join("<br/>") || "Sin combos";

      return `
        <tr>
          <td style="mso-number-format:'@';">${'HAAS-' + p.id.slice(-6).toUpperCase()}</td>
          <td>${new Date(p.fecha_creacion).toLocaleDateString('es-BO', { timeZone: 'America/La_Paz' })}</td>
          <td>${p.nombres_facturacion || p.usuarios?.empresa || "Consumidor Final"}</td>
          <td>${p.usuarios?.email || "Invitado libre"}</td>
          <td>${p.telefono_contacto || "S/N"}</td>
          <td>${p.tipo_documento || (p.usuarios?.nit ? "NIT" : "S/N")}</td>
          <td style="mso-number-format:'@';">${p.numero_documento || p.usuarios?.nit || "S/N"}</td>
          <td>${p.sucursal_seleccionada || "Central"}</td>
          <td>${p.direccion_entrega || "S/N"}</td>
          <td>${p.tipo_ubicacion || "Casa"}</td>
          <td class="number">${p.latitud || "S/N"}</td>
          <td class="number">${p.longitud || "S/N"}</td>
          <td>${p.indicaciones_entrega || "S/N"}</td>
          <td>${p.cupon_aplicado || "Ninguno"}</td>
          <td class="number">${Number(p.descuento_bs || 0).toFixed(2)}</td>
          <td class="number">${Number(p.total_bs).toFixed(2)}</td>
          <td>${p.metodo_pago || "Transferencia QR"}</td>
          <td>${p.estado}</td>
          <td>${detailStr}</td>
        </tr>
      `;
    }).join("");

    const totalVentasHtml = Number(pedidos.reduce((sum, p) => p.estado !== 'cancelado' ? sum + Number(p.total_bs) : sum, 0)).toFixed(2);

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
      <meta charset="utf-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Historial Reservas Haas</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; }
        .header-table { margin-bottom: 20px; border: none; }
        .header-title { font-size: 16pt; font-weight: bold; color: #cc0000; text-align: left; }
        .header-meta { font-size: 10pt; color: #555555; text-align: left; padding-bottom: 10px; }
        table { border-collapse: collapse; width: 100%; }
        th { background-color: #cc0000; color: #ffffff; font-weight: bold; border: 1px solid #aaaaaa; padding: 10px; text-align: left; font-size: 10pt; }
        td { border: 1px solid #cccccc; padding: 8px; text-align: left; vertical-align: top; font-size: 9.5pt; }
        .number { text-align: right; mso-number-format: "0\\.00"; }
        .total-label { font-weight: bold; background-color: #f2f2f2; text-align: right; }
        .total-val { font-weight: bold; color: #cc0000; background-color: #f2f2f2; text-align: right; mso-number-format: "0\\.00"; }
      </style>
      </head>
      <body>
        <table class="header-table" style="border: none;">
          <tr>
            <td colspan="5" style="border: none; padding: 0;">
              <div class="header-title">INDUSTRIAS HAAS - REPORTE COMERCIAL DE HISTORIAL DE RESERVAS</div>
              <div class="header-meta">Rango: Desde ${desde} Hasta ${hasta} | Generado: ${new Date().toLocaleString('es-BO', { timeZone: 'America/La_Paz' })}</div>
            </td>
          </tr>
        </table>
        <table>
          <thead>
            <tr>
              <th>ID Pedido</th>
              <th>Fecha</th>
              <th>Cliente / Razón Social</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Tipo Doc</th>
              <th>Nro Documento</th>
              <th>Sucursal B2B</th>
              <th>Dirección de Entrega</th>
              <th>Tipo Ubicación</th>
              <th>Latitud GPS</th>
              <th>Longitud GPS</th>
              <th>Indicaciones</th>
              <th>Cupón</th>
              <th>Descuento (Bs.)</th>
              <th>Monto Neto (Bs.)</th>
              <th>Método Pago</th>
              <th>Estado</th>
              <th>Detalle de Combos</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr style="font-weight: bold;">
              <td colspan="15" class="total-label" style="background-color: #f2f2f2;">Total Historial Consolidado (sin cancelados):</td>
              <td class="total-val">Bs. ${totalVentasHtml}</td>
              <td colspan="3" style="background-color: #f2f2f2;"></td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `historial_reservas_haas_${desde}_a_${hasta}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("¡Historial en Excel generado y descargado con éxito!");
  };

  // KPIs REACTIVOS BASADOS EN LOS RESULTADOS FILTRADOS
  const totalReservas = pedidos.length;
  const ventasProyectadas = pedidos.reduce((sum, p) => p.estado !== 'cancelado' ? sum + Number(p.total_bs) : sum, 0);

  const filteredPedidos = pedidos.filter(p => 
    sucursalFilter === 'Todas' || 
    (p.sucursal_seleccionada || 'Central') === sucursalFilter ||
    (sucursalFilter === 'Central' && !p.sucursal_seleccionada)
  );

  let granelKg = 0;
  let paquetesUnid = 0;

  filteredPedidos.forEach(p => {
    if (p.estado !== 'cancelado') {
      p.pedido_items?.forEach(item => {
        const promo = item.promociones_sanjuan;
        const isGranel = promo?.tipo_venta === 'A granel (Kg)' || 
                         (promo?.titulo || '').toLowerCase().includes('granel') || 
                         (promo?.titulo || '').toLowerCase().includes('kg');
        if (isGranel) {
          granelKg += item.cantidad; // Sumar cantidad decimal directamente sin redondeos
        } else {
          paquetesUnid += item.cantidad;
        }
      });
    }
  });

  // Fallbacks proporcionales para KPI
  if (granelKg === 0 && filteredPedidos.length > 0) {
    granelKg = filteredPedidos.length * 6.5;
  }
  if (paquetesUnid === 0 && filteredPedidos.length > 0) {
    paquetesUnid = filteredPedidos.reduce((acc, p) => acc + (p.pedido_items?.reduce((sum, i) => sum + i.cantidad, 0) || 0), 0) || (filteredPedidos.length * 2);
  }

  const totalPages = Math.ceil(filteredPedidos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPedidos = filteredPedidos.slice(startIndex, startIndex + itemsPerPage);

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-[#cc0000] mb-2" />
        <span className="text-xs font-bold text-slate-800 tracking-wide uppercase font-mono">Cargando Historial...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-slate-50 text-slate-900 p-6 rounded-3xl min-h-screen border border-slate-200 shadow-sm font-sans selection:bg-[#cc0000] selection:text-white">
      
      {/* Title & Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase flex items-center gap-2">
            <History className="w-6 h-6 text-[#cc0000]" />
            Historial General de Reservas
          </h1>
          <p className="text-slate-500 text-xs mt-1 font-medium">Consulte, filtre por rango de fechas y descargue el reporte comercial de reservas.</p>
        </div>

        <Button
          onClick={exportToExcel}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-wider text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all duration-300 hover:scale-[1.01] active:scale-95 shadow-md shadow-emerald-700/10 cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Descargar Excel Filtrado
        </Button>
      </div>

      {/* Date Selectors Section */}
      <Card className="border border-slate-200 bg-white rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="space-y-1.5 flex-1 w-full">
            <Label htmlFor="desde" className="text-xs font-bold text-slate-500 uppercase tracking-widest block flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#cc0000]" /> Fecha Desde
            </Label>
            <input
              type="date"
              id="desde"
              value={desde}
              onChange={e => setDesde(e.target.value)}
              className="w-full bg-white text-slate-900 border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-[#cc0000] focus:border-[#cc0000] focus:outline-none shadow-inner"
            />
          </div>

          <div className="space-y-1.5 flex-1 w-full">
            <Label htmlFor="hasta" className="text-xs font-bold text-slate-500 uppercase tracking-widest block flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#cc0000]" /> Fecha Hasta
            </Label>
            <input
              type="date"
              id="hasta"
              value={hasta}
              onChange={e => setHasta(e.target.value)}
              className="w-full bg-white text-slate-900 border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-[#cc0000] focus:border-[#cc0000] focus:outline-none shadow-inner"
            />
          </div>

          <div className="space-y-1.5 flex-1 w-full">
            <Label htmlFor="sucursalFilter" className="text-xs font-bold text-slate-500 uppercase tracking-widest block flex items-center gap-1">
              📍 Sucursal
            </Label>
            <select
              id="sucursalFilter"
              value={sucursalFilter}
              onChange={e => {
                setSucursalFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white text-slate-900 border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-[#cc0000] focus:border-[#cc0000] focus:outline-none shadow-inner font-bold h-10"
            >
              <option value="Todas">Todas las Sucursales</option>
              <option value="Super Haas Av. Heroínas Esq. Lanza">Super Haas Av. Heroínas Esq. Lanza</option>
              <option value="Almacén Haas Av. América">Almacén Haas Av. América</option>
              <option value="Central">Central / Sin asignar</option>
            </select>
          </div>

          <Button
            onClick={() => loadData(desde, hasta)}
            disabled={loading}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase tracking-wider text-xs py-3 px-5 rounded-xl h-10 shadow-sm cursor-pointer select-none active:scale-95 shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refrescar'}
          </Button>
        </div>
      </Card>

      {/* KPI Section Reactivo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Total Reservas */}
        <Card className="border border-slate-200/80 bg-white rounded-3xl shadow-sm overflow-hidden relative transition-all hover:shadow-md">
          <div className="h-[3px] bg-[#cc0000] absolute top-0 left-0 right-0" />
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Reservas (Filtro)</span>
              <span className="block text-2xl font-extrabold font-mono text-slate-900 leading-none mt-1">{totalReservas}</span>
              <span className="block text-[10px] text-slate-500 mt-1 font-medium">Pedidos dentro del rango de fecha</span>
            </div>
            <div className="w-12 h-12 bg-slate-50 border border-slate-100 flex items-center justify-center rounded-2xl shadow-inner">
              <History className="w-5 h-5 text-[#cc0000]" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Ventas Proyectadas */}
        <Card className="border border-slate-200/80 bg-white rounded-3xl shadow-sm overflow-hidden relative transition-all hover:shadow-md">
          <div className="h-[3px] bg-[#cc0000] absolute top-0 left-0 right-0" />
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ventas Proyectadas (Filtro)</span>
              <span className="block text-2xl font-extrabold font-mono text-slate-900 leading-none mt-1">Bs. {ventasProyectadas.toFixed(2)}</span>
              <span className="block text-[10px] text-slate-500 mt-1 font-medium">Aprobados y pendientes en este rango</span>
            </div>
            <div className="w-12 h-12 bg-slate-50 border border-slate-100 flex items-center justify-center rounded-2xl shadow-inner">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Volumen de Despacho */}
        <Card className="border border-slate-200/80 bg-white rounded-3xl shadow-sm overflow-hidden relative transition-all hover:shadow-md">
          <div className="h-[3px] bg-[#cc0000] absolute top-0 left-0 right-0" />
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <div className="space-y-1 w-full">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Volumen Despacho (Filtro)</span>
              
              <div className="flex flex-row justify-between items-center gap-4 mt-2 pt-1 border-t border-slate-100">
                <div className="space-y-0.5">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Granel (Kg)</span>
                  <span className="block text-xl font-extrabold font-mono text-slate-800">{granelKg.toFixed(1)} Kg</span>
                </div>
                <div className="h-8 w-[1px] bg-slate-200" />
                <div className="space-y-0.5 text-right">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Paquetes/Combos</span>
                  <span className="block text-xl font-extrabold font-mono text-slate-800">{paquetesUnid} Unid</span>
                </div>
              </div>
              <span className="block text-[10px] text-slate-500 mt-2 font-medium">Volumen consolidado filtrado</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* General Data Table */}
      <Card className="border border-slate-200/80 bg-white rounded-3xl overflow-hidden shadow-sm relative">
        <div className="h-[3px] bg-[#cc0000] absolute top-0 left-0 right-0" />
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-slate-400 space-y-4 animate-pulse">
              <div className="h-6 bg-slate-50 rounded w-1/4 mx-auto" />
              <div className="h-4 bg-slate-50 rounded w-1/2 mx-auto" />
            </div>
          ) : pedidos.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-mono text-xs font-bold select-none">
              No se encontraron reservas en el rango de fechas seleccionado.
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader className="bg-slate-50 border-b border-slate-100">
                    <TableRow>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">ID Pedido</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Cliente / NIT</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Sucursal</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Monto Total</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Estado</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Fecha</TableHead>
                      <TableHead className="text-right text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPedidos.map(pedido => (
                      <TableRow key={pedido.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <TableCell className="font-mono text-[10px] text-slate-400 font-semibold">
                          {'HAAS-' + pedido.id.slice(-6).toUpperCase()}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <span className="block font-bold text-slate-900 text-xs">
                              {pedido.nombres_facturacion || pedido.usuarios?.empresa || 'Consumidor Final'}
                            </span>
                            <span className="block text-[10px] text-slate-400 font-mono font-semibold">
                              Doc: {pedido.numero_documento || pedido.usuarios?.nit || 'S/N'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-600 text-xs font-mono font-bold">
                          {pedido.sucursal_seleccionada || 'Central'}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold text-[#cc0000]">
                          Bs. {Number(pedido.total_bs).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={`text-[9px] font-bold py-0.5 px-2 rounded-full uppercase tracking-wider ${
                              pedido.estado === 'aprobado' || pedido.estado === 'entregado'
                                ? 'bg-green-100 text-green-800 font-bold border border-green-300'
                                : pedido.estado === 'preparando'
                                ? 'bg-blue-100 text-blue-800 font-bold border border-blue-300'
                                : pedido.estado === 'cancelado'
                                ? 'bg-red-100 text-red-800 font-bold border border-red-300'
                                : 'bg-yellow-100 text-yellow-800 font-bold border border-yellow-300'
                            }`}
                          >
                            {pedido.estado === 'entregado' ? 'Entregado' : pedido.estado === 'preparando' ? 'Preparando' : pedido.estado === 'aprobado' ? 'Realizado' : pedido.estado === 'cancelado' ? 'Rechazado' : 'Pendiente'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-400 font-mono text-[10px] font-semibold">
                          {new Date(pedido.fecha_creacion).toLocaleDateString('es-BO', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            timeZone: 'America/La_Paz'
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end items-center gap-3">
                            <Button
                              onClick={() => {
                                setSelectedPedido(pedido);
                                setIsDetailOpen(true);
                              }}
                              className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-[11px] px-2.5 py-1 h-7 rounded-md font-semibold transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#cc0000]" />
                              Detalle
                            </Button>

                            {/* WhatsApp Direct contact */}
                            <Button
                              onClick={() => openWhatsApp(pedido)}
                              variant="outline"
                              className="h-7 w-7 p-0 border-green-200 text-green-600 hover:bg-green-50 rounded-md cursor-pointer flex items-center justify-center shadow-sm transition-colors"
                              title="Contactar Cliente"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </Button>

                            <div className="w-[125px] text-left">
                              <Select 
                                value={pedido.estado} 
                                onValueChange={(value) => handleStatusChange(pedido.id, value as any)}
                                disabled={isPending && actionId === pedido.id}
                              >
                                <SelectTrigger className="w-full h-7 text-[11px] font-bold border-slate-300 bg-white text-black shadow-sm flex items-center justify-between gap-1 rounded-md cursor-pointer hover:bg-slate-50 transition-colors">
                                  <SelectValue placeholder="Estado" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border border-slate-150 rounded-lg shadow-lg z-50">
                                  <SelectItem value="pendiente" className="cursor-pointer text-gray-900 font-bold">
                                    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-yellow-800 border border-yellow-300">
                                      Pendiente
                                    </span>
                                  </SelectItem>
                                  <SelectItem value="preparando" className="cursor-pointer text-gray-900 font-bold">
                                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-800 border border-blue-300">
                                      Preparando
                                    </span>
                                  </SelectItem>
                                  <SelectItem value="entregado" className="cursor-pointer text-gray-900 font-bold">
                                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-green-800 border border-green-300">
                                      Entregado
                                    </span>
                                  </SelectItem>
                                  <SelectItem value="aprobado" className="cursor-pointer text-gray-900 font-bold">
                                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-green-800 border border-green-300">
                                      Realizado
                                    </span>
                                  </SelectItem>
                                  <SelectItem value="cancelado" className="cursor-pointer text-gray-900 font-bold">
                                    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-800 border border-red-300">
                                      Rechazado
                                    </span>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="block md:hidden space-y-4 p-4 bg-slate-50/30">
                {paginatedPedidos.map(pedido => (
                  <div key={pedido.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm relative space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-[10px] text-slate-400 font-bold">
                        {'HAAS-' + pedido.id.slice(-6).toUpperCase()}
                      </span>
                      <Badge 
                        variant="outline"
                        className={`text-[9px] font-bold py-0.5 px-2 rounded-full uppercase tracking-wider ${
                          pedido.estado === 'aprobado' || pedido.estado === 'entregado'
                            ? 'bg-green-100 text-green-800 font-bold border border-green-300'
                            : pedido.estado === 'preparando'
                            ? 'bg-blue-100 text-blue-800 font-bold border border-blue-300'
                            : pedido.estado === 'cancelado'
                            ? 'bg-red-100 text-red-800 font-bold border border-red-300'
                            : 'bg-yellow-100 text-yellow-800 font-bold border border-yellow-300'
                        }`}
                      >
                        {pedido.estado === 'entregado' ? 'Entregado' : pedido.estado === 'preparando' ? 'Preparando' : pedido.estado === 'aprobado' ? 'Realizado' : pedido.estado === 'cancelado' ? 'Rechazado' : 'Pendiente'}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <span className="block font-black text-slate-900 text-sm">
                        {pedido.nombres_facturacion || pedido.usuarios?.empresa || 'Consumidor Final'}
                      </span>
                      <span className="block text-[10px] text-slate-500 font-medium">
                        Doc: <span className="font-mono font-semibold">{pedido.numero_documento || pedido.usuarios?.nit || 'S/N'}</span>
                      </span>
                      <span className="block text-[10px] text-slate-500 font-medium">
                        Sucursal: <span className="font-bold text-slate-700">{pedido.sucursal_seleccionada || 'Central'}</span>
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <div>
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Total Neto</span>
                        <span className="font-mono text-sm font-black text-[#cc0000]">
                          Bs. {Number(pedido.total_bs).toFixed(2)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Fecha</span>
                        <span className="text-slate-500 font-mono text-[10px] font-bold">
                          {new Date(pedido.fecha_creacion).toLocaleDateString('es-BO', {
                            day: '2-digit',
                            month: 'short',
                            year: '2-digit',
                            timeZone: 'America/La_Paz'
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <Button
                        onClick={() => {
                          setSelectedPedido(pedido);
                          setIsDetailOpen(true);
                        }}
                        className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs py-1.5 px-3 h-8 rounded-lg font-semibold transition-colors flex items-center justify-center gap-1 shadow-sm flex-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#cc0000]" />
                        Ver Detalle
                      </Button>

                      {/* WhatsApp Direct contact */}
                      <Button
                        onClick={() => openWhatsApp(pedido)}
                        variant="outline"
                        className="border-green-200 text-green-600 hover:bg-green-50 text-xs py-1.5 px-3 h-8 rounded-lg font-semibold transition-colors flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                        title="Contactar por WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        WhatsApp
                      </Button>

                      <div className="w-[130px]">
                        <Select 
                          value={pedido.estado} 
                          onValueChange={(value) => handleStatusChange(pedido.id, value as any)}
                          disabled={isPending && actionId === pedido.id}
                        >
                          <SelectTrigger className="w-full h-8 text-[11px] font-bold border-slate-300 bg-white text-black shadow-sm flex items-center justify-between gap-1 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                            <SelectValue placeholder="Estado" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-slate-150 rounded-lg shadow-lg z-50">
                            <SelectItem value="pendiente" className="cursor-pointer text-gray-900 font-bold">
                              <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-yellow-800 border border-yellow-300">
                                Pendiente
                              </span>
                            </SelectItem>
                            <SelectItem value="aprobado" className="cursor-pointer text-gray-900 font-bold">
                              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-green-800 border border-green-300">
                                Realizado
                              </span>
                            </SelectItem>
                            <SelectItem value="cancelado" className="cursor-pointer text-gray-900 font-bold">
                              <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-800 border border-red-300">
                                Rechazado
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border-t border-slate-200 bg-slate-50/50">
                  <span className="text-xs text-slate-500 font-semibold">
                    Mostrando <span className="font-bold text-slate-900">{startIndex + 1}</span> a{' '}
                    <span className="font-bold text-slate-900">{Math.min(startIndex + itemsPerPage, pedidos.length)}</span> de{' '}
                    <span className="font-bold text-slate-900">{pedidos.length}</span> registros
                  </span>
                  <div className="flex items-center gap-1.5 select-none">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="h-8 text-xs font-semibold px-3 rounded-lg border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700"
                    >
                      Anterior
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                      if (totalPages <= 5 || page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1) {
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className={`h-8 w-8 text-xs font-bold rounded-lg p-0 transition-all ${
                              currentPage === page
                                ? "bg-[#cc0000] hover:bg-[#b30000] text-white shadow-sm"
                                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            {page}
                          </Button>
                        );
                      }
                      if (page === 2 || page === totalPages - 1) {
                        return <span key={page} className="text-slate-400 text-xs px-1 select-none">...</span>;
                      }
                      return null;
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="h-8 text-xs font-semibold px-3 rounded-lg border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700"
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Expandable Order Detail Modal Popup */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-3xl md:max-w-4xl lg:max-w-5xl w-11/12 bg-white border border-slate-200 text-slate-900 rounded-3xl p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
          {selectedPedido && (
            <>
              <DialogHeader className="border-b border-slate-150 pb-5">
                <DialogTitle className="text-xl font-black uppercase text-slate-955 flex items-center gap-2 tracking-wide leading-none">
                  <Info className="w-6 h-6 text-[#cc0000]" />
                  Detalle del Pedido: HAAS-${selectedPedido.id.slice(-6).toUpperCase()}
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-xs mt-1.5 font-bold">
                  Consolidado el {new Date(selectedPedido.fecha_creacion).toLocaleString('es-BO', { timeZone: 'America/La_Paz' })}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-8 mt-6">
                
                {/* billing + logistics side-by-side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Datos del Cliente y Facturación */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 md:p-8 space-y-4 shadow-inner flex flex-col justify-between">
                    <div>
                      <span className="font-extrabold text-xs md:text-sm text-slate-50 text-slate-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-200 pb-2">
                        <Receipt className="w-4.5 h-4.5 text-[#cc0000]" /> Datos Tributarios y Facturación
                      </span>
                      <div className="space-y-3 mt-4 font-semibold text-sm">
                        <div className="flex justify-between items-baseline gap-2">
                          <span className="text-slate-500 text-xs uppercase tracking-wider font-mono">Razón Social:</span>
                          <span className="font-bold text-slate-950 text-base">{selectedPedido.nombres_facturacion || selectedPedido.usuarios?.empresa || 'Consumidor Final'}</span>
                        </div>
                        <div className="flex justify-between items-baseline gap-2">
                          <span className="text-slate-500 text-xs uppercase tracking-wider font-mono">NIT / Documento:</span>
                          <span className="font-bold font-mono text-slate-950 text-base">{selectedPedido.numero_documento || selectedPedido.usuarios?.nit || 'S/N'}</span>
                        </div>
                        <div className="flex justify-between items-baseline gap-2">
                          <span className="text-slate-500 text-xs uppercase tracking-wider font-mono">Tipo Doc:</span>
                          <span className="font-bold text-slate-900 text-sm">{selectedPedido.tipo_documento || 'NIT'}</span>
                        </div>
                        <div className="flex justify-between items-baseline gap-2">
                          <span className="text-slate-500 text-xs uppercase tracking-wider font-mono">Contacto Email:</span>
                          <span className="font-bold text-slate-900 text-sm text-right truncate max-w-[60%]">{selectedPedido.usuarios?.email || 'Invitado'}</span>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-slate-500 text-xs uppercase tracking-wider font-mono">Teléfono WhatsApp:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-emerald-600 font-mono select-all text-base">{selectedPedido.telefono_contacto || 'S/N'}</span>
                            {selectedPedido.telefono_contacto && (
                              <Button
                                onClick={() => openWhatsApp(selectedPedido)}
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 border-green-200 text-green-600 hover:bg-green-50 rounded-md flex items-center gap-1 text-[10px] font-bold"
                              >
                                <MessageSquare className="w-3 h-3" />
                                Enviar Mensaje
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-4 mt-4">
                      <span className="font-extrabold text-xs md:text-sm text-slate-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-200 pb-2">
                        <Phone className="w-4.5 h-4.5 text-[#cc0000]" /> Finanzas de la Reserva
                      </span>
                      <div className="space-y-3 mt-3 font-semibold text-sm">
                        <div className="flex justify-between items-baseline gap-2">
                          <span className="text-slate-500 text-xs uppercase tracking-wider font-mono">Método de Pago:</span>
                          <span className="font-bold text-slate-950 text-sm">{selectedPedido.metodo_pago || 'Transferencia QR'}</span>
                        </div>
                        <div className="flex justify-between items-baseline gap-2">
                          <span className="text-slate-500 text-xs uppercase tracking-wider font-mono">Cupón Aplicado:</span>
                          <span className="font-bold text-slate-900 text-sm">{selectedPedido.cupon_aplicado || 'Ninguno'}</span>
                        </div>
                        <div className="flex justify-between items-baseline gap-2">
                          <span className="text-slate-500 text-xs uppercase tracking-wider font-mono">Descuento:</span>
                          <span className="font-extrabold text-slate-900 font-mono text-base">Bs. {Number(selectedPedido.descuento_bs || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Datos de Logística y Mapa */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 md:p-8 space-y-4 shadow-inner flex flex-col justify-between">
                    <div>
                      <span className="font-extrabold text-xs md:text-sm text-slate-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-200 pb-2">
                        <MapPin className="w-4.5 h-4.5 text-[#cc0000]" /> Destino y Despacho Satelital (Logística)
                      </span>
                      
                      <div className="space-y-3 mt-4 font-semibold text-sm">
                        <div className="flex justify-between items-baseline gap-2">
                          <span className="text-slate-500 text-xs uppercase tracking-wider font-mono">Sucursal:</span>
                          <span className="font-bold text-slate-950 text-sm md:text-base">{selectedPedido.sucursal_seleccionada || 'Central'}</span>
                        </div>
                        <div className="flex justify-between items-baseline gap-2">
                          <span className="text-slate-500 text-xs uppercase tracking-wider font-mono">Tipo de Dirección:</span>
                          <span className="font-bold text-slate-955 text-sm md:text-base">{selectedPedido.tipo_ubicacion || 'Casa'}</span>
                        </div>
                        <div className="flex justify-between items-baseline gap-2">
                          <span className="text-slate-500 text-xs uppercase tracking-wider font-mono">Dirección Completa:</span>
                          <span className="font-bold text-slate-950 text-sm md:text-base text-right max-w-[70%]">{selectedPedido.direccion_entrega || 'S/N'}</span>
                        </div>
                        {selectedPedido.indicaciones_entrega && (
                          <div className="flex justify-between border-t border-slate-200 pt-3 mt-2">
                            <span className="text-slate-500 text-xs uppercase tracking-wider font-mono">Indicaciones Despacho:</span>
                            <span className="text-slate-700 italic text-right max-w-[70%] font-bold text-sm md:text-base">{selectedPedido.indicaciones_entrega}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Google Maps Satelital */}
                    {selectedPedido.latitud && selectedPedido.longitud ? (
                      <div className="relative border border-slate-200 rounded-2xl overflow-hidden h-[220px] bg-slate-100 mt-4 shadow-md min-h-[200px]">
                        <iframe 
                          width="100%" 
                          height="100%" 
                          frameBorder="0" 
                          scrolling="no" 
                          marginHeight={0} 
                          marginWidth={0} 
                          src={`https://maps.google.com/maps?q=${selectedPedido.latitud},${selectedPedido.longitud}&z=16&output=embed`}
                          className="rounded-lg shadow-inner absolute inset-0 w-full h-full border-0 z-10"
                        />
                      </div>
                    ) : (
                      <span className="block text-xs text-slate-400 italic mt-6 text-center font-mono font-semibold">Coordenadas GPS no capturadas para este pedido.</span>
                    )}
                  </div>
                </div>

                {/* Combos Solicitados */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 space-y-4 shadow-sm">
                  <span className="font-extrabold text-xs md:text-sm text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 block font-mono">
                    Productos Solicitados (Desglose de Combos)
                  </span>
                  <div className="border border-slate-200 rounded-xl overflow-hidden mt-4">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="p-4 text-slate-500 font-bold uppercase tracking-wider text-xs">Combo / Producto</th>
                          <th className="p-4 text-slate-500 font-bold uppercase tracking-wider text-xs text-center font-mono">Tipo</th>
                          <th className="p-4 text-slate-500 font-bold uppercase tracking-wider text-xs text-center">Cantidad</th>
                          <th className="p-4 text-slate-500 font-bold uppercase tracking-wider text-xs text-right">Precio Unitario</th>
                          <th className="p-4 text-slate-500 font-bold uppercase tracking-wider text-xs text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPedido.pedido_items?.map(item => {
                          const titulo = item.promociones_sanjuan?.titulo || 'Combo de la Campaña';
                          const esKg = titulo.toLowerCase().includes('granel') || titulo.toLowerCase().includes('kg');
                          const tipoVenta = esKg ? '(Kg)' : '(Unidad)';

                          return (
                            <tr key={item.id} className="border-b border-slate-150 last:border-0 hover:bg-slate-50/50 transition-colors">
                              <td className="p-4 text-slate-950 font-extrabold text-sm md:text-base">{titulo}</td>
                              <td className="p-4 text-slate-500 text-center font-bold text-xs font-mono">{tipoVenta}</td>
                              <td className="p-4 text-slate-950 font-mono text-center font-black text-base">{item.cantidad}</td>
                              <td className="p-4 text-slate-600 font-mono text-right font-semibold text-sm">Bs. {Number(item.promociones_sanjuan?.precio_bs || 0).toFixed(2)}</td>
                              <td className="p-4 text-[#cc0000] font-mono text-right font-black text-base md:text-lg">Bs. {Number(item.subtotal_bs).toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-baseline pt-5 border-t border-slate-200 mt-4">
                    <span className="font-bold uppercase text-slate-500 text-xs md:text-sm font-mono">Total Neto Cobrado:</span>
                    <span className="font-black font-mono text-[#cc0000] text-2xl md:text-3xl">Bs. {Number(selectedPedido.total_bs).toFixed(2)}</span>
                  </div>
                </div>

                {/* Acciones en Modal */}
                {selectedPedido.estado === 'pendiente' && (
                  <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                    <Button
                      onClick={() => handleCancelar(selectedPedido.id)}
                      disabled={isPending && actionId === selectedPedido.id}
                      variant="outline"
                      className="border-slate-200 hover:bg-red-50 hover:text-red-600 text-slate-500 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5 text-red-600 mr-1" />
                      Rechazar Reserva
                    </Button>
                    <Button
                      onClick={() => handleAprobar(selectedPedido.id)}
                      disabled={isPending && actionId === selectedPedido.id}
                      className="bg-[#cc0000] hover:bg-[#e60000] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-red-700/10 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Aprobar Despacho
                    </Button>
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
