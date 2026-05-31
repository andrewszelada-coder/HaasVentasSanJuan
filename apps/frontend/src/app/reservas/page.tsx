'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { getPromociones, logoutAction } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Flame, LogOut, ShoppingBag, Plus, Minus, Check, ArrowRight, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

interface Promotion {
  id: string;
  titulo: string;
  descripcion: string;
  precio_bs: number;
  stock_disponible: number;
  imagen_url: string;
  activo: boolean;
}

interface CartItem {
  promotion: Promotion;
  cantidad: number;
}

export default function ReservasPage() {
  const [promociones, setPromociones] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getPromociones(true);
        // Filtrar y mapear tipados
        const mapped = (data as any[]).map(item => ({
          id: item.id,
          titulo: item.titulo,
          descripcion: item.descripcion,
          precio_bs: Number(item.precio_bs),
          stock_disponible: Number(item.stock_disponible),
          imagen_url: item.imagen_url,
          activo: item.activo
        }));
        setPromociones(mapped);
        
        // Inicializar cantidades de compra por ID
        const initialQuantities: Record<string, number> = {};
        mapped.forEach(p => {
          initialQuantities[p.id] = 1;
        });
        setQuantities(initialQuantities);
      } catch (err) {
        toast.error("Error al cargar promociones del catálogo.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
    
    // Cargar carrito de localStorage si existe
    const savedCart = localStorage.getItem('haas_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch {}
    }
  }, []);

  // Guardar carrito en localStorage cuando cambie
  const saveCartToStorage = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem('haas_cart', JSON.stringify(newCart));
  };

  const handleIncrement = (id: string) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.min(999, (prev[id] || 0) + 1)
    }));
  };

  const handleDecrement = (id: string) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(1, (prev[id] || 0) - 1)
    }));
  };

  const handleQuantityChange = (id: string, value: number) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(1, value)
    }));
  };

  const handleAddToCart = (promo: Promotion) => {
    const qty = quantities[promo.id] || 1;
    
    // Validar stock (Condición Crítica QA)
    if (qty > promo.stock_disponible) {
      toast.error(`Stock Insuficiente: Solicitado ${qty}, disponible ${promo.stock_disponible}`);
      return;
    }

    const existingIndex = cart.findIndex(item => item.promotion.id === promo.id);
    let newCart = [...cart];

    if (existingIndex > -1) {
      const newQty = newCart[existingIndex].cantidad + qty;
      if (newQty > promo.stock_disponible) {
        toast.error(`No puedes agregar más: Stock máximo disponible es ${promo.stock_disponible}`);
        return;
      }
      newCart[existingIndex].cantidad = newQty;
    } else {
      newCart.push({ promotion: promo, cantidad: qty });
    }

    saveCartToStorage(newCart);
    toast.success(`Se agregaron ${qty} combo(s) a tu reserva.`);
  };

  const handleRemoveFromCart = (id: string) => {
    const newCart = cart.filter(item => item.promotion.id !== id);
    saveCartToStorage(newCart);
    toast.info("Combo eliminado de la reserva.");
  };

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
    });
  };

  const totalBs = cart.reduce((sum, item) => sum + item.promotion.precio_bs * item.cantidad, 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-[#9A3412]" />
            <span className="font-bold text-[#0F172A] tracking-tight">HAAS B2B PORTAL</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              disabled={isPending}
              className="text-xs text-slate-500 hover:text-red-700 flex items-center gap-1.5 transition-colors uppercase font-semibold tracking-wider font-mono bg-slate-50 hover:bg-red-50 px-3 py-2 rounded-lg"
            >
              <LogOut className="w-4 h-4" />
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Catalog */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Catálogo de San Juan</h1>
              <p className="text-slate-500 text-xs mt-1">Precios corporativos exclusivos. Suministro garantizado para planta.</p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4 animate-pulse">
                  <div className="bg-slate-100 rounded-xl h-48 w-full" />
                  <div className="h-4 bg-slate-100 rounded w-1/3" />
                  <div className="h-6 bg-slate-100 rounded w-3/4" />
                  <div className="h-4 bg-slate-100 rounded w-full" />
                </div>
              ))}
            </div>
          ) : promociones.length === 0 ? (
            <Card className="border border-slate-100 p-12 text-center text-slate-400 bg-white">
              No hay promociones activas registradas para la campaña.
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {promociones.map(promo => (
                <motion.div
                  key={promo.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4 }}
                  className="bg-white border border-slate-100 rounded-2xl overflow-hidden p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <div>
                    <div className="relative overflow-hidden rounded-xl mb-4 aspect-[4/3] bg-slate-100 border border-slate-50">
                      <img
                        src={promo.imagen_url}
                        alt={promo.titulo}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full">
                      Campaña San Juan
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-2 mb-1 leading-tight">{promo.titulo}</h3>
                    <p className="text-slate-500 text-xs leading-relaxed mb-4 line-clamp-2">{promo.descripcion}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-slate-400 font-mono">Precio Unitario:</span>
                      <span className="text-xl font-bold font-mono text-[#9A3412]">Bs. {promo.precio_bs.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Quantity Selector */}
                      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                        <button
                          type="button"
                          onClick={() => handleDecrement(promo.id)}
                          className="px-2 py-1.5 hover:bg-slate-100 text-slate-500 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          value={quantities[promo.id] || 1}
                          onChange={(e) => handleQuantityChange(promo.id, parseInt(e.target.value) || 1)}
                          className="w-12 text-center text-sm font-semibold text-slate-900 border-none bg-transparent focus:ring-0 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleIncrement(promo.id)}
                          className="px-2 py-1.5 hover:bg-slate-100 text-slate-500 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Add Button */}
                      <Button
                        onClick={() => handleAddToCart(promo)}
                        className="flex-1 bg-[#166534] hover:bg-[#114f27] text-white text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-1.5"
                      >
                        Añadir a Reserva
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Floating / Sticky Cart Summary */}
        <div className="lg:col-span-4">
          <Card className="border border-slate-100 shadow-lg shadow-slate-100/50 bg-white rounded-2xl sticky top-24">
            <CardContent className="p-6 space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-emerald-800" />
                  <span className="font-bold text-slate-900">Resumen de Reserva</span>
                </div>
                <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  {cart.length} combos
                </span>
              </div>

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    No has añadido combos a tu reserva.
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.promotion.id} className="flex justify-between items-start gap-4 pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                      <div className="space-y-1">
                        <span className="block font-bold text-slate-800 text-xs leading-snug">{item.promotion.titulo}</span>
                        <span className="block text-[10px] text-slate-400 font-mono">
                          Bs. {item.promotion.precio_bs.toFixed(2)} × {item.cantidad}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-xs text-[#9A3412]">
                          Bs. {(item.promotion.precio_bs * item.cantidad).toFixed(2)}
                        </span>
                        <button
                          onClick={() => handleRemoveFromCart(item.promotion.id)}
                          className="text-slate-300 hover:text-red-600 text-xs font-mono font-bold"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Monto Total:</span>
                    <span className="text-2xl font-bold font-mono text-[#9A3412]">Bs. {totalBs.toFixed(2)}</span>
                  </div>

                  <Link href="/checkout" className="block w-full">
                    <Button className="w-full bg-[#9A3412] hover:bg-[#7c2a0e] text-white py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium">
                      Continuar a Checkout <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
