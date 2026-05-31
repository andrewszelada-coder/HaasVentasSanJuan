'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { getPedidos, aprobarPedidoAction, cancelarPedidoAction } from '@/app/actions';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { ClipboardList, TrendingUp, Anchor, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface Pedido {
  id: string;
  total_bs: number;
  estado: 'pendiente' | 'aprobado' | 'cancelado';
  fecha_creacion: string;
  usuarios?: {
    email: string;
    empresa: string;
    nit: string;
    sucursal: string;
  };
}

export default function AdminPedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
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
      }
      setActionId(null);
    });
  };

  // KPIs
  const totalReservas = pedidos.length;
  const ventasProyectadas = pedidos.reduce((sum, p) => p.estado !== 'cancelado' ? sum + Number(p.total_bs) : sum, 0);
  const kilosReservados = totalReservas * 6.5; // Estimación promedio por reserva

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard de Control Comercial</h1>
        <p className="text-slate-500 text-xs mt-1">Consolide y verifique las reservas especiales de fábrica para San Juan 2026.</p>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            title: "Total Reservas",
            value: totalReservas,
            desc: "Pedidos registrados en el portal",
            icon: <ClipboardList className="w-5 h-5 text-emerald-800" />
          },
          {
            title: "Ventas Proyectadas",
            value: `Bs. ${ventasProyectadas.toFixed(2)}`,
            desc: "Pedidos aprobados y pendientes",
            icon: <TrendingUp className="w-5 h-5 text-[#9A3412]" />
          },
          {
            title: "Volumen Comprometido",
            value: `${kilosReservados.toFixed(1)} Kg`,
            desc: "Kilos estimados para producción",
            icon: <Anchor className="w-5 h-5 text-blue-700" />
          }
        ].map((kpi, idx) => (
          <Card key={idx} className="border border-slate-100 bg-white rounded-2xl shadow-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{kpi.title}</span>
                <span className="block text-3xl font-extrabold font-mono text-slate-900 leading-none">{kpi.value}</span>
                <span className="block text-[10px] text-slate-400">{kpi.desc}</span>
              </div>
              <div className="w-12 h-12 bg-slate-50 border border-slate-100 flex items-center justify-center rounded-xl">
                {kpi.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Data Table */}
      <Card className="border border-slate-100 bg-white rounded-2xl overflow-hidden shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-slate-400 space-y-4 animate-pulse">
              <div className="h-6 bg-slate-100 rounded w-1/4 mx-auto" />
              <div className="h-4 bg-slate-100 rounded w-1/2 mx-auto" />
            </div>
          ) : pedidos.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              No hay registros de reservas en el sistema.
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50 border-b border-slate-100">
                <TableRow>
                  <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">ID</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Empresa / NIT</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Sucursal</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Monto Total</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Estado</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Fecha</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedidos.map(pedido => (
                  <TableRow key={pedido.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-mono text-[11px] text-slate-400">
                      {pedido.id.substring(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <span className="block font-bold text-slate-800 text-xs">{pedido.usuarios?.empresa || 'Consumidor Final'}</span>
                        <span className="block text-[10px] text-slate-400 font-mono">NIT: {pedido.usuarios?.nit || 'S/N'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600 text-xs font-semibold">
                      {pedido.usuarios?.sucursal || 'Central'}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-bold text-[#9A3412]">
                      Bs. {Number(pedido.total_bs).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] font-bold py-0.5 px-2 rounded-full uppercase tracking-wider ${
                        pedido.estado === 'aprobado'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                          : pedido.estado === 'cancelado'
                          ? 'bg-red-50 text-red-800 border border-red-100'
                          : 'bg-orange-50 text-orange-800 border border-orange-100'
                      }`}>
                        {pedido.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-400 font-mono text-[10px]">
                      {new Date(pedido.fecha_creacion).toLocaleDateString('es-BO', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      {pedido.estado === 'pendiente' && (
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={() => handleAprobar(pedido.id)}
                            disabled={isPending && actionId === pedido.id}
                            className="bg-[#166534] hover:bg-[#114f27] text-white text-[11px] px-2.5 py-1 h-7 rounded-md font-semibold transition-colors flex items-center gap-1"
                          >
                            {isPending && actionId === pedido.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            Aprobar
                          </Button>
                          <Button
                            onClick={() => handleCancelar(pedido.id)}
                            disabled={isPending && actionId === pedido.id}
                            variant="outline"
                            className="border-slate-200 hover:bg-red-50 hover:text-red-700 text-slate-500 text-[11px] px-2.5 py-1 h-7 rounded-md font-semibold transition-colors flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Rechazar
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
