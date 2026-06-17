'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FormularioPedido } from './FormularioPedido';

interface Promotion {
  id: string;
  titulo: string;
  descripcion: string;
  precio_bs: number;
  stock_disponible: number;
  imagen_url: string;
  activo: boolean;
  tipo_venta?: string;
}

interface TarjetaProductoProps {
  promo: Promotion;
  onAddToCart: (promo: Promotion, cantidad: number) => void;
}

export function TarjetaProducto({ promo, onAddToCart }: TarjetaProductoProps) {
  const isGranel = promo.tipo_venta === 'A granel (Kg)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="bg-white border border-slate-200/80 hover:border-[#cc0000]/40 rounded-3xl overflow-hidden p-5 flex flex-col justify-between shadow-sm hover:shadow-xl transition-all duration-300"
    >
      <div>
        <div className="relative overflow-hidden rounded-2xl mb-4 aspect-[4/3] bg-slate-50 border border-slate-100">
          <img
            src={promo.imagen_url}
            alt={promo.titulo}
            className="object-cover w-full h-full hover:scale-105 transition-transform duration-500"
          />
        </div>
        <span className="text-[9px] text-[#cc0000] font-extrabold uppercase tracking-widest bg-[#cc0000]/10 border border-[#cc0000]/15 px-2.5 py-1 rounded-full shadow-sm">
          Campaña San Juan
        </span>
        <h3 className="text-lg font-bold text-slate-950 mt-3 mb-1.5 leading-tight">{promo.titulo}</h3>
        <p className="text-slate-500 text-xs leading-relaxed mb-4 font-medium">{promo.descripcion}</p>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-baseline pt-3 border-t border-slate-100 mb-2">
          {isGranel ? (
            <>
              <span className="text-xs text-slate-400 font-mono">Precio por Kg:</span>
              <span className="text-xl font-black font-mono text-[#cc0000]">Bs. {promo.precio_bs.toFixed(2)} / Kg</span>
            </>
          ) : (
            <>
              <span className="text-xs text-slate-400 font-mono">Precio Unitario:</span>
              <span className="text-xl font-black font-mono text-[#cc0000]">Bs. {promo.precio_bs.toFixed(2)}</span>
            </>
          )}
        </div>

        <FormularioPedido
          producto={promo}
          cantidadInicial={1}
          onSubmit={(cant) => onAddToCart(promo, cant)}
          submitLabel="Añadir a Reserva"
        />
      </div>
    </motion.div>
  );
}
