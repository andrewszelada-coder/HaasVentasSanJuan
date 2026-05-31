'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { crearPedidoAction } from '@/app/actions';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShoppingBag, ArrowLeft, Loader2, CalendarCheck, FileText, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface CartItem {
  promotion: {
    id: string;
    titulo: string;
    descripcion: string;
    precio_bs: number;
    stock_disponible: number;
  };
  cantidad: number;
}

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const router = useRouter();

  // Campos de formulario
  const [sucursal, setSucursal] = useState('Sucursal Central LPZ');
  const [fecha, setFecha] = useState('');
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    const savedCart = localStorage.getItem('haas_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch {}
    }
  }, []);

  const totalBs = cart.reduce((sum, item) => sum + item.promotion.precio_bs * item.cantidad, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      toast.error("Tu reserva está vacía. Regresa al catálogo para añadir combos.");
      return;
    }

    if (!fecha) {
      toast.error("Por favor, seleccione una fecha programada de entrega.");
      return;
    }

    const itemsPayload = cart.map(item => ({
      promoId: item.promotion.id,
      cantidad: item.cantidad
    }));

    startTransition(async () => {
      const result = await crearPedidoAction(
        sucursal,
        fecha,
        observaciones,
        itemsPayload
      );

      if (result && result.error) {
        // En caso de fallo de stock (Condición Crítica QA), se muestra un Toast detallado
        toast.error(result.error);
        return;
      }

      if (result && result.success) {
        toast.success("¡Reserva procesada con éxito!");
        setIsSuccess(true);
        setCreatedOrderId(result.pedidoId || '');
        localStorage.removeItem('haas_cart'); // Vaciar carrito
      }
    });
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <Card className="border border-slate-100 shadow-xl shadow-slate-100/50 bg-white rounded-2xl text-center p-8">
            <div className="mx-auto w-16 h-16 bg-emerald-50 text-emerald-800 flex items-center justify-center rounded-2xl mb-6">
              <CheckCircle2 className="w-10 h-10 text-[#166534]" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">¡Reserva Programada!</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              Tu reserva ha sido registrada y consolidada para la producción de fábrica Haas. Un supervisor comercial validará el despacho de inmediato.
            </p>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-8 text-left space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-mono">Código Reserva:</span>
                <span className="font-bold font-mono text-slate-800 shrink">{createdOrderId?.substring(0, 8)}...</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-mono">Monto Total:</span>
                <span className="font-bold text-[#9A3412]">Bs. {totalBs.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-mono">Sucursal Destino:</span>
                <span className="font-bold text-slate-800">{sucursal}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-mono">Fecha Entrega:</span>
                <span className="font-bold text-slate-800">{fecha}</span>
              </div>
            </div>

            <Button
              onClick={() => router.push('/reservas')}
              className="w-full bg-[#166534] hover:bg-[#114f27] text-white py-2.5 rounded-lg font-medium transition-colors"
            >
              Volver al Catálogo
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-6 h-16 flex justify-between items-center">
          <Link href="/reservas" className="text-slate-500 hover:text-[#166534] flex items-center gap-1 text-sm font-semibold transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Catálogo
          </Link>
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-800" />
            <span className="font-bold text-slate-900 tracking-tight text-sm">Checkout Reserva</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 mt-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Finalizar tu Reserva</h1>
        <p className="text-slate-500 text-xs mb-8">Confirme la fecha programada de despacho para la consolidación del pedido.</p>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Left Side: Form Details */}
          <div className="md:col-span-7 space-y-6">
            <Card className="border border-slate-100 bg-white rounded-2xl">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Sucursal Destino
                  </Label>
                  <select
                    value={sucursal}
                    onChange={(e) => setSucursal(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm text-slate-800 focus:ring-1 focus:ring-[#166534] focus:outline-none"
                  >
                    <option value="Sucursal Central LPZ">Sucursal Central (La Paz)</option>
                    <option value="Sucursal El Alto">Sucursal El Alto (El Alto)</option>
                    <option value="Distribuidora Santa Cruz">Distribuidora Santa Cruz (Santa Cruz)</option>
                    <option value="Sucursal Cochabamba">Sucursal Cochabamba (Cochabamba)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fecha" className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <CalendarCheck className="w-3.5 h-3.5 text-[#166534]" /> Fecha Programada de Despacho
                  </Label>
                  <Input
                    id="fecha"
                    type="date"
                    required
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="border-slate-200 bg-slate-50 focus-visible:ring-[#166534] rounded-lg"
                  />
                  <span className="block text-[10px] text-slate-400">
                    * Haas garantiza el despacho exacto el día programado. Reservas del 20 al 23 de Junio.
                  </span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observaciones" className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-[#166534]" /> Observaciones de Despacho
                  </Label>
                  <textarea
                    id="observaciones"
                    rows={4}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Instrucciones particulares sobre el andén de frío, carguío o entrega..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm text-slate-800 focus:ring-1 focus:ring-[#166534] focus:outline-none placeholder:text-slate-400"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Side: Order Summary */}
          <div className="md:col-span-5">
            <Card className="border border-slate-100 shadow-md shadow-slate-100/30 bg-white rounded-2xl">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Tu Reserva Consolidada
                </CardTitle>
              </CardHeader>
              
              <CardContent className="p-6 space-y-4">
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {cart.map(item => (
                    <div key={item.promotion.id} className="flex justify-between items-start text-xs border-b border-slate-50 pb-2.5 last:border-0 last:pb-0">
                      <div className="space-y-0.5 max-w-[70%]">
                        <span className="block font-bold text-slate-800 leading-tight">{item.promotion.titulo}</span>
                        <span className="block text-[10px] text-slate-400 font-mono">Cantidad: {item.cantidad}</span>
                      </div>
                      <span className="font-bold font-mono text-[#9A3412]">
                        Bs. {(item.promotion.precio_bs * item.cantidad).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Monto Total:</span>
                    <span className="text-xl font-bold font-mono text-[#9A3412]">Bs. {totalBs.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-6 pt-0">
                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-[#9A3412] hover:bg-[#7c2a0e] text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Registrando Reserva...
                    </>
                  ) : (
                    'Confirmar Reserva'
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>

        </form>
      </div>
    </div>
  );
}
