'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, QrCode, Home, MessageSquare, Copy, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';

interface OrderData {
  orderId: string;
  totalBs: number;
  razonSocial: string;
  nit: string;
  direccion: string;
  metodoPago: string;
}

export default function CheckoutSuccessPage() {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const savedOrder = sessionStorage.getItem('haas_success_order');
    if (savedOrder) {
      try {
        setOrder(JSON.parse(savedOrder));
      } catch {}
    }
  }, []);

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center space-y-4">
          <LoaderIcon className="w-8 h-8 animate-spin text-emerald-800 mx-auto" />
          <p className="text-sm text-slate-500 font-mono">Cargando detalles del pedido...</p>
        </div>
      </div>
    );
  }

  // Borrador del mensaje para WhatsApp (Sin enviar directamente, permitiendo vista previa como solicitado)
  const messageText = `Hola Industrias Haas! He realizado mi reserva Especial San Juan 2026.
Nº Reserva: ${order.orderId.substring(0, 8)}
Total: Bs. ${order.totalBs.toFixed(2)}
Factura: ${order.razonSocial} (NIT: ${order.nit})
Dirección: ${order.direccion}
Método de Pago: ${order.metodoPago}
Por favor confirmar el despacho. ¡Gracias!`;

  const handleCopyText = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    toast.success('¡Mensaje copiado al portapapeles! Listo para enviar.');
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] py-12 px-4 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-xl"
      >
        <Card className="border border-slate-100 shadow-xl shadow-slate-100/50 bg-white rounded-2xl p-6 md:p-8">
          
          {/* Header */}
          <div className="text-center space-y-3 mb-8">
            <div className="mx-auto w-16 h-16 bg-emerald-50 text-[#166534] flex items-center justify-center rounded-2xl">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 leading-none">
              ¡Pedido Pre-Registrado!
            </h2>
            <p className="text-slate-500 text-xs max-w-sm mx-auto leading-relaxed">
              Su orden se ha guardado en fábrica de manera exitosa. A continuación se detallan los pasos de pago.
            </p>
          </div>

          <CardContent className="space-y-6 p-0">
            {/* QR Section (Simulada si se eligió QR) */}
            {order.metodoPago === 'Transferencia QR' && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center space-y-4 max-w-sm mx-auto">
                <div className="bg-white border border-slate-200 p-4 rounded-xl inline-block shadow-sm">
                  {/* Código QR dibujado mediante SVG interactivo y premium */}
                  <svg className="w-40 h-40 mx-auto text-[#0F172A]" viewBox="0 0 100 100">
                    <rect width="100" height="100" fill="white" />
                    <rect x="5" y="5" width="25" height="25" fill="currentColor" />
                    <rect x="10" y="10" width="15" height="15" fill="white" />
                    <rect x="13" y="13" width="9" height="9" fill="currentColor" />
                    <rect x="70" y="5" width="25" height="25" fill="currentColor" />
                    <rect x="75" y="10" width="15" height="15" fill="white" />
                    <rect x="78" y="13" width="9" height="9" fill="currentColor" />
                    <rect x="5" y="70" width="25" height="25" fill="currentColor" />
                    <rect x="10" y="75" width="15" height="15" fill="white" />
                    <rect x="13" y="78" width="9" height="9" fill="currentColor" />
                    <rect x="40" y="40" width="20" height="20" fill="currentColor" />
                    <rect x="45" y="45" width="10" height="10" fill="white" />
                    <rect x="48" y="48" width="4" height="4" fill="currentColor" />
                    <rect x="45" y="10" width="8" height="20" fill="currentColor" />
                    <rect x="70" y="45" width="20" height="8" fill="currentColor" />
                    <rect x="10" y="45" width="20" height="8" fill="currentColor" />
                    <rect x="45" y="70" width="8" height="20" fill="currentColor" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <span className="block text-xs font-bold text-slate-800">Transferencia Bancaria QR</span>
                  <span className="block text-[10px] text-slate-400 font-mono">Total a transferir: Bs. {order.totalBs.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Order Details list */}
            <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-2.5 text-xs text-left">
              <div className="flex justify-between">
                <span className="text-slate-400 font-mono">Código Pedido:</span>
                <span className="font-bold font-mono text-slate-800">{order.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-mono">Factura Razón Social:</span>
                <span className="font-bold text-slate-800">{order.razonSocial}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-mono">NIT / Documento:</span>
                <span className="font-bold font-mono text-slate-800">{order.nit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-mono">Dirección Despacho:</span>
                <span className="font-bold text-slate-800 text-right max-w-[60%] truncate">{order.direccion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-mono">Método de Pago:</span>
                <span className="font-bold text-slate-800">{order.metodoPago}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-100 text-sm">
                <span className="text-slate-500 font-bold">Total Reservado:</span>
                <span className="font-bold font-mono text-[#9A3412]">Bs. {order.totalBs.toFixed(2)}</span>
              </div>
            </div>

            {/* MOCK WHATSAPP PREVIEW CARD (Bypass / Hazlo hasta antes de mandar el mensaje) */}
            <div className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm">
              <div className="bg-[#128C7E]/10 px-4 py-2.5 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2 text-[#075E54]">
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Vista previa de Notificación WhatsApp</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-mono font-semibold transition-colors"
                >
                  {copied ? <ClipboardCheck className="w-3.5 h-3.5 text-emerald-800" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
              <div className="p-4 bg-slate-50/50">
                <pre className="text-[10px] text-slate-600 font-mono whitespace-pre-wrap leading-relaxed select-text bg-white border border-slate-100 rounded-lg p-3 text-left">
                  {messageText}
                </pre>
              </div>
            </div>

          </CardContent>

          <CardFooter className="p-0 mt-8 flex flex-col gap-3">
            <Link href="/reservas" className="w-full">
              <Button
                type="button"
                className="w-full bg-[#166534] hover:bg-[#114f27] text-white py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Home className="w-4 h-4" />
                Regresar a la Página Principal
              </Button>
            </Link>
            <div className="text-center text-[10px] text-slate-400 font-mono">
              INDUSTRIAS HAAS LTDA. • PORTAL B2B RESERVAS • CAMPAÑA 2026
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}

// Icono simple de carga para sustituir librerías ausentes de carga
function LoaderIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
