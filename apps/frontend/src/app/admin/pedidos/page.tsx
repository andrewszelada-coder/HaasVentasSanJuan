'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { getPedidos, aprobarPedidoAction, cancelarPedidoAction } from '@/app/actions';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { 
  ClipboardList, TrendingUp, Anchor, CheckCircle2, XCircle, 
  Loader2, Eye, FileSpreadsheet, MapPin, Receipt, Phone, Info
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
  estado: 'pendiente' | 'aprobado' | 'cancelado';
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
  pedido_items?: PedidoItem[];
}

export default function AdminPedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const data = await getPedidos();
      setPedidos(data as any[]);
    } catch (err) {
      toast.error("Error al cargar los pedidos del Backoffice.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAprobar = (id: string) => {
    setActionId(id);
    startTransition(async () => {
      const result = await aprobarPedidoAction(id);
      if (result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Reserva aprobada con éxito.");
        await loadData();
        // Cerrar modal de detalle si estaba abierto
        setIsDetailOpen(false);
      }
      setActionId(null);
    });
  };

  const handleCancelar = (id: string) => {
    setActionId(id);
    startTransition(async () => {
      const result = await cancelarPedidoAction(id);
      if (result && result.error) {
        toast.error(result.error);
      } else {
        toast.info("Reserva cancelada y stock devuelto.");
        await loadData();
        // Cerrar modal de detalle si estaba abierto
        setIsDetailOpen(false);
      }
      setActionId(null);
    });
  };

  // Función de Exportación a Excel (CSV)
  const exportToExcel = () => {
    if (pedidos.length === 0) {
      toast.error("No hay pedidos registrados para exportar.");
      return;
    }

    // Encabezados del CSV
    const headers = [
      "ID Pedido", "Fecha", "Cliente/Razon Social", "Email", "Telefono", 
      "Tipo Doc", "NIT/Documento", "Sucursal B2B", "Direccion de Entrega", 
      "Tipo Ubicacion", "Latitud GPS", "Longitud GPS", "Indicaciones Entrega",
      "Cupon", "Descuento (Bs.)", "Monto Neto (Bs.)", "Metodo Pago", 
      "Estado", "Detalle de Combos"
    ];

    // Mapear filas
    const rows = pedidos.map(p => {
      // Concatenar ítems
      const detailStr = p.pedido_items?.map(item => 
        `${item.promociones_sanjuan?.titulo || 'Combo'} (Cant: ${item.cantidad}, Sub: Bs.${Number(item.subtotal_bs).toFixed(2)})`
      ).join(" | ") || "Sin combos";

      return [
        p.id,
        new Date(p.fecha_creacion).toLocaleDateString('es-BO'),
        p.nombres_facturacion || p.usuarios?.empresa || "Consumidor Final",
        p.usuarios?.email || "Invitado libre",
        p.telefono_contacto || "S/N",
        p.tipo_documento || p.usuarios?.nit ? "NIT" : "S/N",
        p.numero_documento || p.usuarios?.nit || "S/N",
        p.usuarios?.sucursal || "Central",
        `"${(p.direccion_entrega || "").replace(/"/g, '""')}"`,
        p.tipo_ubicacion || "Casa",
        p.latitud || "",
        p.longitud || "",
        `"${(p.indicaciones_entrega || "").replace(/"/g, '""')}"`,
        p.cupon_aplicado || "Ninguno",
        Number(p.descuento_bs || 0).toFixed(2),
        Number(p.total_bs).toFixed(2),
        p.metodo_pago || "Transferencia QR",
        p.estado,
        `"${detailStr.replace(/"/g, '""')}"`
      ];
    });

    // Construir contenido CSV
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    // Crear elemento de descarga
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `reservas_haas_sanjuan_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("¡Archivo Excel (CSV) generado y descargado con éxito!");
  };

  // KPIs
  const totalReservas = pedidos.length;
  const ventasProyectadas = pedidos.reduce((sum, p) => p.estado !== 'cancelado' ? sum + Number(p.total_bs) : sum, 0);
  const kilosReservados = totalReservas * 6.5; // Estimación promedio por reserva

  return (
    <div className="space-y-8 bg-[#0b0f19] text-white p-6 rounded-2xl min-h-screen border border-[#2c354a]">
      {/* Page Title & Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-[#2c354a]">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-[#cc0000]" />
            Dashboard de Control Comercial
          </h1>
          <p className="text-gray-400 text-xs mt-1">Consolide, verifique y gestione las reservas de fábrica para San Juan 2026.</p>
        </div>

        <Button
          onClick={exportToExcel}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-wider text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all duration-300 hover:scale-[1.01] active:scale-95 shadow-lg shadow-emerald-900/10"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Descargar Excel (CSV)
        </Button>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            title: "Total Reservas",
            value: totalReservas,
            desc: "Pedidos registrados en el portal",
            icon: <ClipboardList className="w-5 h-5 text-[#cc0000]" />
          },
          {
            title: "Ventas Proyectadas",
            value: `Bs. ${ventasProyectadas.toFixed(2)}`,
            desc: "Pedidos aprobados y pendientes",
            icon: <TrendingUp className="w-5 h-5 text-emerald-500" />
          },
          {
            title: "Volumen Comprometido",
            value: `${kilosReservados.toFixed(1)} Kg`,
            desc: "Kilos estimados para producción",
            icon: <Anchor className="w-5 h-5 text-blue-500" />
          }
        ].map((kpi, idx) => (
          <Card key={idx} className="border border-[#2c354a] bg-[#1e2536] rounded-2xl shadow-xl overflow-hidden relative">
            <div className="h-[2px] bg-gradient-to-r from-transparent via-[#cc0000] to-transparent" />
            <CardContent className="p-6 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{kpi.title}</span>
                <span className="block text-2xl font-extrabold font-mono text-white leading-none mt-1">{kpi.value}</span>
                <span className="block text-[10px] text-gray-400 mt-1">{kpi.desc}</span>
              </div>
              <div className="w-12 h-12 bg-[#171c2a] border border-[#2c354a] flex items-center justify-center rounded-xl">
                {kpi.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Data Table */}
      <Card className="border border-[#2c354a] bg-[#1e2536] rounded-2xl overflow-hidden shadow-2xl relative">
        <div className="h-[2px] bg-gradient-to-r from-transparent via-[#cc0000] to-transparent" />
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-gray-400 space-y-4 animate-pulse">
              <div className="h-6 bg-[#21283a] rounded w-1/4 mx-auto" />
              <div className="h-4 bg-[#21283a] rounded w-1/2 mx-auto" />
            </div>
          ) : pedidos.length === 0 ? (
            <div className="p-12 text-center text-gray-500 font-mono text-xs">
              No hay registros de reservas en el sistema comercial.
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-[#171c2a] border-b border-[#2c354a]">
                <TableRow>
                  <TableHead className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">ID Pedido</TableHead>
                  <TableHead className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Cliente / NIT</TableHead>
                  <TableHead className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Sucursal</TableHead>
                  <TableHead className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Monto Total</TableHead>
                  <TableHead className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Estado</TableHead>
                  <TableHead className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Fecha</TableHead>
                  <TableHead className="text-right text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedidos.map(pedido => (
                  <TableRow key={pedido.id} className="border-b border-[#2c354a] hover:bg-[#21283a]/40 transition-colors">
                    <TableCell className="font-mono text-[10px] text-gray-500">
                      {pedido.id.substring(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <span className="block font-bold text-white text-xs">
                          {pedido.nombres_facturacion || pedido.usuarios?.empresa || 'Consumidor Final'}
                        </span>
                        <span className="block text-[10px] text-gray-500 font-mono">
                          Doc: {pedido.numero_documento || pedido.usuarios?.nit || 'S/N'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-300 text-xs font-mono">
                      {pedido.usuarios?.sucursal || 'Central'}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-bold text-[#cc0000]">
                      Bs. {Number(pedido.total_bs).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[9px] font-bold py-0.5 px-2 rounded-full uppercase tracking-wider ${
                        pedido.estado === 'aprobado'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : pedido.estado === 'cancelado'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                      }`}>
                        {pedido.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-500 font-mono text-[10px]">
                      {new Date(pedido.fecha_creacion).toLocaleDateString('es-BO', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {/* Botón Ver Detalle */}
                        <Button
                          onClick={() => {
                            setSelectedPedido(pedido);
                            setIsDetailOpen(true);
                          }}
                          className="bg-[#21283a] hover:bg-[#2c354a] border border-[#2c354a] text-white text-[11px] px-2.5 py-1 h-7 rounded-md font-semibold transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#cc0000]" />
                          Detalle
                        </Button>

                        {pedido.estado === 'pendiente' && (
                          <>
                            <Button
                              onClick={() => handleAprobar(pedido.id)}
                              disabled={isPending && actionId === pedido.id}
                              className="bg-[#cc0000] hover:bg-[#e60000] text-white text-[11px] px-2.5 py-1 h-7 rounded-md font-semibold transition-colors flex items-center gap-1"
                            >
                              {isPending && actionId === pedido.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              Aprobar
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Expandable Order Detail Modal Popup */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl bg-[#121724] border border-[#2c354a] text-white rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
          {selectedPedido && (
            <>
              <DialogHeader className="border-b border-[#2c354a] pb-4">
                <DialogTitle className="text-lg font-black uppercase text-white flex items-center gap-2 tracking-wide leading-none">
                  <Info className="w-5 h-5 text-[#cc0000]" />
                  Detalle del Pedido: #{selectedPedido.id.substring(0, 8)}
                </DialogTitle>
                <DialogDescription className="text-gray-400 text-xs mt-1 leading-relaxed">
                  Consolidado el {new Date(selectedPedido.fecha_creacion).toLocaleString('es-BO')}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                
                {/* 1. Cliente & Facturación */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#1e2536] border border-[#2c354a] rounded-xl p-4 space-y-2 text-xs">
                    <span className="font-bold text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-1">
                      <Receipt className="w-3.5 h-3.5 text-[#cc0000]" /> Facturación y Cliente
                    </span>
                    <div className="space-y-1 mt-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Razón Social:</span>
                        <span className="font-bold text-white">{selectedPedido.nombres_facturacion || selectedPedido.usuarios?.empresa || 'Consumidor Final'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">NIT / Documento:</span>
                        <span className="font-bold font-mono text-white">{selectedPedido.numero_documento || selectedPedido.usuarios?.nit || 'S/N'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Tipo Doc:</span>
                        <span className="font-bold text-white">{selectedPedido.tipo_documento || 'NIT'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Correo Electrónico:</span>
                        <span className="font-bold text-white text-right truncate max-w-[60%]">{selectedPedido.usuarios?.email || 'Invitado'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Contacto & Finanzas */}
                  <div className="bg-[#1e2536] border border-[#2c354a] rounded-xl p-4 space-y-2 text-xs">
                    <span className="font-bold text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-[#cc0000]" /> Contacto y Finanzas
                    </span>
                    <div className="space-y-1 mt-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Teléfono WhatsApp:</span>
                        <span className="font-bold text-emerald-400 font-mono select-all">{selectedPedido.telefono_contacto || 'S/N'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Método de Pago:</span>
                        <span className="font-bold text-white">{selectedPedido.metodo_pago || 'Transferencia QR'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Cupón Aplicado:</span>
                        <span className="font-bold text-white">{selectedPedido.cupon_aplicado || 'Ninguno'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Descuento:</span>
                        <span className="font-bold text-white font-mono">Bs. {Number(selectedPedido.descuento_bs || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Combos y Productos Solicitados */}
                <div className="bg-[#1e2536] border border-[#2c354a] rounded-xl p-4 space-y-2 text-xs">
                  <span className="font-bold text-[10px] text-gray-500 uppercase tracking-widest">
                    Productos Solicitados (Combos)
                  </span>
                  <div className="border border-[#2c354a] rounded-lg overflow-hidden mt-2">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#171c2a] border-b border-[#2c354a]">
                          <th className="p-2 text-gray-400 font-bold uppercase tracking-wider text-[10px]">Combo</th>
                          <th className="p-2 text-gray-400 font-bold uppercase tracking-wider text-[10px] text-center">Cant.</th>
                          <th className="p-2 text-gray-400 font-bold uppercase tracking-wider text-[10px] text-right">Precio U.</th>
                          <th className="p-2 text-gray-400 font-bold uppercase tracking-wider text-[10px] text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPedido.pedido_items?.map(item => (
                          <tr key={item.id} className="border-b border-[#2c354a] last:border-0 hover:bg-[#21283a]/30">
                            <td className="p-2 text-white font-semibold">{item.promociones_sanjuan?.titulo || 'Combo'}</td>
                            <td className="p-2 text-white font-mono text-center font-bold">{item.cantidad}</td>
                            <td className="p-2 text-white font-mono text-right">Bs. {Number(item.promociones_sanjuan?.precio_bs || 0).toFixed(2)}</td>
                            <td className="p-2 text-[#cc0000] font-mono text-right font-bold">Bs. {Number(item.subtotal_bs).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-baseline pt-3 border-t border-[#2c354a] text-sm">
                    <span className="font-bold uppercase text-gray-400 text-xs">Total Neto Cobrado:</span>
                    <span className="font-black font-mono text-[#cc0000] text-lg">Bs. {Number(selectedPedido.total_bs).toFixed(2)}</span>
                  </div>
                </div>

                {/* 4. Logística y Geolocalización con Mapa OSM Real */}
                <div className="bg-[#1e2536] border border-[#2c354a] rounded-xl p-4 space-y-3 text-xs">
                  <span className="font-bold text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#cc0000]" /> Destino y Despacho Satelital
                  </span>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Tipo de Dirección:</span>
                      <span className="font-bold text-white">{selectedPedido.tipo_ubicacion || 'Casa'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Dirección:</span>
                      <span className="font-bold text-white text-right max-w-[80%]">{selectedPedido.direccion_entrega || 'S/N'}</span>
                    </div>
                    {selectedPedido.indicaciones_entrega && (
                      <div className="flex justify-between border-t border-[#2c354a] pt-1.5 mt-1">
                        <span className="text-gray-400">Indicaciones:</span>
                        <span className="text-gray-300 italic text-right max-w-[80%]">{selectedPedido.indicaciones_entrega}</span>
                      </div>
                    )}
                  </div>

                  {/* Renderizado de Mapa OSM Real interactivo en base a las coordenadas reales guardadas */}
                  {selectedPedido.latitud && selectedPedido.longitud ? (
                    <div className="relative border border-[#2c354a] rounded-xl overflow-hidden h-48 bg-[#0d0d0d] mt-2 shadow-inner">
                      <iframe 
                        width="100%" 
                        height="100%" 
                        frameBorder="0" 
                        scrolling="no" 
                        marginHeight={0} 
                        marginWidth={0} 
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedPedido.longitud - 0.003}%2C${selectedPedido.latitud - 0.002}%2C${selectedPedido.longitud + 0.003}%2C${selectedPedido.latitud + 0.002}&layer=mapnik&marker=${selectedPedido.latitud}%2C${selectedPedido.longitud}`}
                        className="rounded-lg shadow-inner absolute inset-0 w-full h-full"
                      />
                    </div>
                  ) : (
                    <span className="block text-[10px] text-gray-500 italic mt-2 text-center">Coordenadas GPS no capturadas para este pedido.</span>
                  )}
                </div>

                {/* Acciones en Modal */}
                {selectedPedido.estado === 'pendiente' && (
                  <div className="flex justify-end gap-3 pt-2 border-t border-[#2c354a]">
                    <Button
                      onClick={() => handleCancelar(selectedPedido.id)}
                      disabled={isPending && actionId === selectedPedido.id}
                      variant="outline"
                      className="border-[#2c354a] hover:bg-red-500/10 hover:text-red-400 text-gray-400 text-xs font-semibold px-4 py-2 rounded-xl transition-all"
                    >
                      <XCircle className="w-3.5 h-3.5 text-red-500 mr-1" />
                      Rechazar Reserva
                    </Button>
                    <Button
                      onClick={() => handleAprobar(selectedPedido.id)}
                      disabled={isPending && actionId === selectedPedido.id}
                      className="bg-[#cc0000] hover:bg-[#e60000] text-white text-xs font-semibold px-5 py-2 rounded-xl transition-all"
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
