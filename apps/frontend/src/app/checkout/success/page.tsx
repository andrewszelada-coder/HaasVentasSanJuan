'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, Home, MessageSquare, Copy, ClipboardCheck, Loader2 
} from 'lucide-react';
import { toast } from 'sonner';

// =========================================================================
// CONFIGURACIÓN DE PUNTOS DE CONTACTO
// =========================================================================
const NUMERO_WHATSAPP = "59170000000"; // Reemplazar con el número real de Haas

interface OrderData {
  orderId: string;
  totalBs: number;
  razonSocial: string;
  nit: string;
  direccion: string;
  metodoPago: string;
  sucursalSeleccionada?: string;
  celular?: string;
  detalleItems?: string;
}

export default function CheckoutSuccessPage() {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const savedOrder = sessionStorage.getItem('haas_success_order');
    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder);
        setOrder(parsed);
      } catch {}
    }
  }, []);

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-900">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#cc0000] mx-auto" />
          <p className="text-xs text-gray-500 font-mono">Cargando detalles de su pedido exitoso...</p>
        </div>
      </div>
    );
  }

  const formattedItems = order.detalleItems
    ? order.detalleItems.split(', ').map(item => `• ${item}`).join('\n')
    : '• S/N';

  // Plantilla del mensaje formateado para WhatsApp
  const messageText = `¡Hola! 👋
Acabo de realizar una reserva en Industrias Haas.

📍 Sucursal: ${order.sucursalSeleccionada || 'S/N'}

🛒 Detalle del pedido:
${formattedItems}

💰 Total con 10% de descuento: Bs. ${order.totalBs.toFixed(2)}

📸 Ya realicé el pago mediante QR. Adjunto el comprobante para confirmar mi pedido.

✅ Quedo atento(a) a la confirmación y coordinación de entrega o recojo.

¡Muchas gracias! 🙌`;

  const whatsappUrl = `https://api.whatsapp.com/send?phone=${NUMERO_WHATSAPP}&text=${encodeURIComponent(messageText)}`;

  const handleCopyText = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    toast.success('¡Mensaje copiado al portapapeles! Listo para enviar.');
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-gray-900 py-12 px-4 selection:bg-[#cc0000] selection:text-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-xl"
      >
        <Card className="border border-slate-200 shadow-2xl bg-white rounded-3xl p-6 md:p-8 relative overflow-hidden">
          <div className="h-[3px] bg-[#cc0000] absolute top-0 left-0 right-0" />
          
          {/* Header */}
          <div className="text-center space-y-3 mb-8">
            <div className="mx-auto w-16 h-16 bg-[#cc0000]/10 border border-[#cc0000]/15 text-[#cc0000] flex items-center justify-center rounded-2xl shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-gray-900 uppercase leading-none">
              ¡Pedido Pre-Registrado!
            </h2>
            <p className="text-gray-500 text-xs max-w-sm mx-auto leading-relaxed font-medium">
              Su orden ha sido guardada en nuestra base de datos de fábrica de forma exitosa. A continuación se detallan los pasos de pago.
            </p>
          </div>

          <CardContent className="space-y-6 p-0 bg-white">
            {/* QR Section (Contenedor blanco de alto contraste) */}
            {order.metodoPago === 'Transferencia QR' && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center space-y-4 max-w-sm mx-auto shadow-sm">
                {/* Contenedor blanco para el código QR */}
                <div className="bg-white border-4 border-white p-4 rounded-2xl inline-block shadow-md animate-fade-in">
                  <img
                    src={order.sucursalSeleccionada === 'Almacén Haas Av. América' ? 'https://xymvwsnyvpupejjcsuxz.supabase.co/storage/v1/object/public/qrs/qr_americahaas.jpg' : 'https://xymvwsnyvpupejjcsuxz.supabase.co/storage/v1/object/public/qrs/qr_HeroinasHaas.jpg'}
                    alt="QR de Pago"
                    className="w-40 h-40 mx-auto object-contain rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="block text-[10px] text-emerald-600 font-bold uppercase tracking-wider bg-emerald-50 border border-emerald-100 rounded-full py-0.5 px-3 w-fit mx-auto">
                    Pago 100% mediante QR a la sucursal seleccionada
                  </span>
                  <span className="block text-xs font-bold text-gray-900 uppercase tracking-wider">Transferencia Bancaria QR</span>
                  <span className="block text-[10px] text-gray-500 font-mono font-bold">Sucursal: {order.sucursalSeleccionada || 'S/N'}</span>
                  <span className="block text-[10px] text-gray-500 font-mono font-bold">Total a transferir: Bs. {order.totalBs.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Order Details list */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-2.5 text-xs text-left">
              <div className="flex justify-between">
                <span className="text-gray-500 font-mono font-semibold">Código Pedido:</span>
                <span className="font-bold font-mono text-gray-900 select-all">{'HAAS-' + order.orderId.slice(-6).toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-mono font-semibold">Sucursal de Recojo:</span>
                <span className="font-bold text-gray-900">{order.sucursalSeleccionada || 'S/N'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-mono font-semibold">Celular de Contacto:</span>
                <span className="font-bold font-mono text-gray-900">{order.celular || 'S/N'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-mono font-semibold">Factura Razón Social:</span>
                <span className="font-bold text-gray-900">{order.razonSocial}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-mono font-semibold">NIT / Documento:</span>
                <span className="font-bold font-mono text-gray-900">{order.nit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-mono font-semibold">Método de Pago:</span>
                <span className="font-bold text-gray-900">{order.metodoPago}</span>
              </div>
              <div className="flex justify-between pt-2.5 border-t border-slate-200 text-sm">
                <span className="text-gray-500 font-extrabold uppercase">Total Reservado (10% desc. aplicado):</span>
                <span className="font-black font-mono text-[#cc0000]">Bs. {order.totalBs.toFixed(2)}</span>
              </div>
            </div>

            {/* WHATSAPP PREVIEW CARD */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              <div className="bg-[#25D366]/10 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center bg-white">
                <div className="flex items-center gap-2 text-green-700">
                  <MessageSquare className="w-4 h-4 shrink-0 text-green-600" />
                  <span className="text-[10px] font-bold uppercase tracking-widest font-mono">Vista previa de Notificación</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="text-[10px] text-gray-500 hover:text-gray-800 flex items-center gap-1 font-mono font-bold transition-colors bg-white border border-slate-200 py-1 px-2.5 rounded"
                >
                  {copied ? <ClipboardCheck className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copiado' : 'Copiar Texto'}
                </button>
              </div>
              <div className="p-4 bg-white">
                <pre className="text-[10px] text-gray-500 font-mono whitespace-pre-wrap leading-relaxed select-text bg-white border border-slate-200 rounded-lg p-3 text-left font-medium">
                  {messageText}
                </pre>
              </div>
            </div>

          </CardContent>

          <CardFooter className="p-0 mt-8 flex flex-col gap-3 bg-white">
            {/* Botón verde oficial de WhatsApp */}
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="w-full">
              <Button
                type="button"
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-lg font-black transition-all duration-300 flex items-center justify-center gap-2 text-xs uppercase tracking-wider shadow-lg shadow-green-600/10 hover:scale-[1.01] active:scale-95 animate-pulse"
              >
                <MessageSquare className="w-4 h-4" />
                Notificar Pago por WhatsApp
              </Button>
            </a>

            <Link href="/reservas" className="w-full">
              <Button
                type="button"
                className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-gray-800 py-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
              >
                <Home className="w-4 h-4 text-[#cc0000]" />
                Regresar a la Página Principal
              </Button>
            </Link>
            
            <div className="text-center text-[9px] text-gray-400 font-mono tracking-widest uppercase mt-4 font-bold bg-white">
              INDUSTRIAS HAAS LTDA. • PORTAL B2B RESERVAS • CAMPAÑA 2026
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
