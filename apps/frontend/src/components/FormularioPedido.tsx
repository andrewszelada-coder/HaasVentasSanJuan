'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  titulo: string;
  precio_bs: number;
  stock_disponible: number;
  tipo_venta?: string;
}

interface FormularioPedidoProps {
  producto: Product;
  cantidadInicial?: number;
  onCantidadChange?: (cantidad: number) => void;
  onSubmit?: (cantidad: number) => void;
  submitLabel?: string;
}

export function FormularioPedido({
  producto,
  cantidadInicial = 1,
  onCantidadChange,
  onSubmit,
  submitLabel = "Añadir a Reserva"
}: FormularioPedidoProps) {
  const isGranel = producto.tipo_venta === 'A granel (Kg)';
  
  // Usar string para poder escribir decimales libremente (ej. "1.", "0.5") sin que React lo borre
  const [inputValue, setInputValue] = useState(
    isGranel ? cantidadInicial.toFixed(1) : cantidadInicial.toString()
  );

  useEffect(() => {
    setInputValue(isGranel ? cantidadInicial.toFixed(1) : cantidadInicial.toString());
  }, [cantidadInicial, isGranel]);

  const step = isGranel ? 0.5 : 1;
  const minVal = isGranel ? 0.5 : 1;
  const labelText = isGranel ? 'Cantidad (Kg)' : 'Cantidad (Unidades)';

  const validateAndFormat = (valStr: string) => {
    if (isGranel) {
      let numericVal = parseFloat(valStr);
      if (isNaN(numericVal) || numericVal < minVal) {
        numericVal = minVal;
      } else {
        // Redondear al 0.5 más cercano
        numericVal = Math.round(numericVal / 0.5) * 0.5;
      }
      if (numericVal > producto.stock_disponible) {
        numericVal = producto.stock_disponible;
        toast.warning("Stock máximo alcanzado");
      }
      const formatted = numericVal.toFixed(1);
      setInputValue(formatted);
      onCantidadChange?.(numericVal);
      return numericVal;
    } else {
      let numericVal = parseInt(valStr, 10);
      if (isNaN(numericVal) || numericVal < minVal) {
        numericVal = minVal;
      }
      if (numericVal > producto.stock_disponible) {
        numericVal = producto.stock_disponible;
        toast.warning("Stock máximo alcanzado");
      }
      const formatted = numericVal.toString();
      setInputValue(formatted);
      onCantidadChange?.(numericVal);
      return numericVal;
    }
  };

  const handleIncrement = () => {
    const currentVal = parseFloat(inputValue) || 0;
    const nextVal = currentVal + step;
    if (nextVal > producto.stock_disponible) {
      toast.warning("Stock máximo alcanzado");
      validateAndFormat(producto.stock_disponible.toString());
    } else {
      validateAndFormat(nextVal.toString());
    }
  };

  const handleDecrement = () => {
    const currentVal = parseFloat(inputValue) || 0;
    const nextVal = Math.max(minVal, currentVal - step);
    validateAndFormat(nextVal.toString());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (isGranel) {
      const normalized = value.replace(',', '.');
      // Acepta dígitos, un solo punto decimal y número de decimales limitado
      if (/^\d*\.?\d*$/.test(normalized)) {
        setInputValue(normalized);
        const parsed = parseFloat(normalized);
        if (!isNaN(parsed) && parsed >= minVal && parsed <= producto.stock_disponible) {
          onCantidadChange?.(parsed);
        }
      }
    } else {
      const normalized = value.replace(/[^0-9]/g, '');
      setInputValue(normalized);
      const parsed = parseInt(normalized, 10);
      if (!isNaN(parsed) && parsed >= minVal && parsed <= producto.stock_disponible) {
        onCantidadChange?.(parsed);
      }
    }
  };

  const handleBlur = () => {
    validateAndFormat(inputValue);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalQty = validateAndFormat(inputValue);
    onSubmit?.(finalQty);
  };

  const numericQty = parseFloat(inputValue) || minVal;
  const subtotal = Number((producto.precio_bs * numericQty).toFixed(2));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-2">
        <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">
          {labelText}
        </Label>
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50 shadow-sm">
            <button
              type="button"
              onClick={handleDecrement}
              className="px-3 py-2 hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <Input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className="w-16 text-center text-sm font-bold text-slate-900 border-none bg-transparent focus:ring-0 focus-visible:ring-0 focus:outline-none focus-visible:outline-none p-0 h-9"
            />
            <button
              type="button"
              onClick={handleIncrement}
              className="px-3 py-2 hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {onSubmit && (
            <Button
              type="submit"
              className="flex-1 bg-[#cc0000] hover:bg-[#e60000] text-white text-xs font-bold uppercase tracking-wider h-9 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-[#cc0000]/10"
            >
              {submitLabel}
            </Button>
          )}
        </div>
      </div>
      <div className="flex justify-between items-baseline pt-2 text-xs border-t border-slate-100">
        <span className="text-slate-400 font-semibold uppercase tracking-wider">Subtotal:</span>
        <span className="font-bold text-slate-800 font-mono">Bs. {subtotal.toFixed(2)}</span>
      </div>
    </form>
  );
}
