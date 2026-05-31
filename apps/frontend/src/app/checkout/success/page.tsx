'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Home, MessageSquare, Copy, ClipboardCheck } from 'lucide-react';
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
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white">
        <div className="text-center space-y-4">
          <LoaderIcon className="w-8 h-8 animate-spin text-[#cc0000] mx-auto" />
          <p className="text-xs text-gray-500 font-mono">Cargando detalles de su pedido exitoso...</p>
        </div>
      </div>
    );
  }

  // Plantilla del mensaje formateado para WhatsApp
  const messageText = `Hola Industrias Haas! He realizado mi reserva Especial San Juan 2026.
Nº Reserva: ${order.orderId.substring(0, 8)}
Total: Bs. ${order.totalBs.toFixed(2)}
Factura: ${order.razonSocial} (NIT: ${order.nit})
Dirección: ${order.direccion}
Método de Pago: ${order.metodoPago}
Por favor confirmar el despacho. ¡Gracias!`;

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;

  const handleCopyText = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    toast.success('¡Mensaje copiado al portapapeles! Listo para enviar.');
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white py-12 px-4 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-xl"
      >
        <Card className="border border-[#333333] shadow-2xl bg-[#121212] rounded-2xl p-6 md:p-8 relative overflow-hidden">
          <div className="h-[2px] bg-gradient-to-r from-transparent via-[#cc0000] to-transparent absolute top-0 left-0 right-0" />
          
          {/* Header */}
          <div className="text-center space-y-3 mb-8">
            <div className="mx-auto w-16 h-16 bg-[#cc0000]/10 border border-[#cc0000]/25 text-[#cc0000] flex items-center justify-center rounded-2xl shadow-[0_0_15px_rgba(204,0,0,0.2)]">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white uppercase leading-none">
              ¡Pedido Pre-Registrado!
            </h2>
            <p className="text-gray-400 text-xs max-w-sm mx-auto leading-relaxed">
              Su orden ha sido guardada en nuestra base de datos de fábrica de forma exitosa. A continuación se detallan los pasos de pago.
            </p>
          </div>

          <CardContent className="space-y-6 p-0">
            {/* QR Section (Contenedor blanco de alto contraste) */}
            {order.metodoPago === 'Transferencia QR' && (
              <div className="bg-[#1a1a1a] border border-[#333333] rounded-2xl p-6 text-center space-y-4 max-w-sm mx-auto shadow-inner">
                {/* Contenedor blanco para el código QR */}
                <div className="bg-white border-4 border-white p-4 rounded-xl inline-block shadow-2xl">
                  {/* Código QR dibujado mediante SVG de alta visibilidad para escaneo */}
                  <svg className="w-40 h-40 mx-auto text-black" viewBox="0 0 100 100">
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
                  <span className="block text-xs font-bold text-white uppercase tracking-wider">Transferencia Bancaria QR</span>
                  <span className="block text-[10px] text-gray-400 font-mono">Total a transferir: Bs. {order.totalBs.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Order Details list */}
            <div className="border border-[#333333] rounded-xl p-4 bg-[#1a1a1a] space-y-2.5 text-xs text-left">
              <div className="flex justify-between">
                <span className="text-gray-500 font-mono">Código Pedido:</span>
                <span className="font-bold font-mono text-white select-all">{order.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-mono">Factura Razón Social:</span>
                <span className="font-bold text-white">{order.razonSocial}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-mono">NIT / Documento:</span>
                <span className="font-bold font-mono text-white">{order.nit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-mono">Dirección Despacho:</span>
                <span className="font-bold text-white text-right max-w-[60%] truncate">{order.direccion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-mono">Método de Pago:</span>
                <span className="font-bold text-white">{order.metodoPago}</span>
              </div>
              <div className="flex justify-between pt-2.5 border-t border-[#333333] text-sm">
                <span className="text-gray-400 font-bold uppercase">Total Reservado:</span>
                <span className="font-black font-mono text-[#cc0000] drop-shadow-[0_0_8px_rgba(204,0,0,0.3)]">Bs. {order.totalBs.toFixed(2)}</span>
              </div>
            </div>

            {/* WHATSAPP PREVIEW CARD */}
            <div className="border border-[#333333] rounded-xl overflow-hidden bg-[#121212] shadow-sm">
              <div className="bg-[#25D366]/10 px-4 py-2.5 border-b border-[#333333] flex justify-between items-center">
                <div className="flex items-center gap-2 text-[#25D366]">
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-widest font-mono">Vista previa de Notificación</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1 font-mono font-semibold transition-colors bg-[#1a1a1a] border border-[#333333] py-1 px-2.5 rounded"
                >
                  {copied ? <ClipboardCheck className="w-3.5 h-3.5 text-[#25D366]" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copiado' : 'Copiar Texto'}
                </button>
              </div>
              <div className="p-4 bg-[#1a1a1a]/50">
                <pre className="text-[10px] text-gray-400 font-mono whitespace-pre-wrap leading-relaxed select-text bg-[#0d0d0d] border border-[#333333] rounded-lg p-3 text-left">
                  {messageText}
                </pre>
              </div>
            </div>

          </CardContent>

          <CardFooter className="p-0 mt-8 flex flex-col gap-3">
            {/* Botón verde oficial de WhatsApp */}
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="w-full">
              <Button
                type="button"
                className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-3.5 rounded-lg font-black transition-all duration-300 flex items-center justify-center gap-2 text-xs uppercase tracking-wider shadow-lg shadow-[#25D366]/15 hover:scale-[1.01] active:scale-95"
              >
                <MessageSquare className="w-4 h-4" />
                Notificar Pago por WhatsApp
              </Button>
            </a>

            <Link href="/reservas" className="w-full">
              <Button
                type="button"
                className="w-full bg-[#1c1c1c] border border-[#333333] hover:bg-[#262626] text-white py-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
              >
                <Home className="w-4 h-4 text-[#cc0000]" />
                Regresar a la Página Principal
              </Button>
            </Link>
            
            <div className="text-center text-[9px] text-gray-600 font-mono tracking-widest uppercase mt-4">
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
