'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { getPromociones, logoutAction } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Flame, LogOut, ShoppingBag, Plus, Minus, Lock, Trash2, ArrowRight, FlameKindling } from 'lucide-react';
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getPromociones(true);
        // Filtrar y mapear tipados
        const mapped = (data as any[]).map(item => {
          let customImg = item.imagen_url;
          if (item.titulo.includes("Clásico")) {
            customImg = "/images/combo_clasico.png";
          } else if (item.titulo.includes("Premium") || item.titulo.includes("Parrillero")) {
            customImg = "/images/combo_premium.png";
          } else if (item.titulo.includes("Familiar")) {
            customImg = "/images/pack_familiar.png";
          }
          return {
            id: item.id,
            titulo: item.titulo,
            descripcion: item.descripcion,
            precio_bs: Number(item.precio_bs),
            stock_disponible: Number(item.stock_disponible),
            imagen_url: customImg,
            activo: item.activo
          };
        });
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

    // Verificar si hay una sesión activa de Supabase localmente para decidir si mostramos Salir
    const hasSession = document.cookie.includes('sb-') || localStorage.getItem('haas_session_active') === 'true';
    setIsAuthenticated(hasSession);
  }, []);

  // Guardar carrito en localStorage cuando cambie
  const saveCartToStorage = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem('haas_cart', JSON.stringify(newCart));
  };

  const handleIncrement = (id: string, stock: number) => {
    setQuantities(prev => {
      const current = prev[id] || 1;
      if (current >= stock) {
        toast.warning("Stock máximo alcanzado");
        return { ...prev, [id]: stock };
      }
      return { ...prev, [id]: current + 1 };
    });
  };

  const handleDecrement = (id: string) => {
    setQuantities(prev => {
      const current = prev[id] || 1;
      return { ...prev, [id]: Math.max(1, current - 1) };
    });
  };

  const handleQuantityChange = (id: string, valueStr: string, stock: number) => {
    const cleanStr = valueStr.replace(/[^0-9]/g, '');
    let val = parseInt(cleanStr, 10);
    if (isNaN(val) || val < 1) {
      val = 1;
    }
    if (val > stock) {
      val = stock;
      toast.warning("Stock máximo alcanzado");
    }
    setQuantities(prev => ({
      ...prev,
      [id]: val
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

  const handleUpdateCartQty = (id: string, newQty: number, stock: number) => {
    let qty = newQty;
    if (qty < 1) qty = 1;
    if (qty > stock) {
      qty = stock;
      toast.warning("Stock máximo alcanzado");
    }
    
    const newCart = cart.map(item => {
      if (item.promotion.id === id) {
        return { ...item, cantidad: qty };
      }
      return item;
    });
    saveCartToStorage(newCart);
  };

  const handleLogout = () => {
    startTransition(async () => {
      localStorage.removeItem('haas_session_active');
      await logoutAction();
    });
  };

  const totalBs = cart.reduce((sum, item) => sum + item.promotion.precio_bs * item.cantidad, 0);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-24 font-sans selection:bg-[#cc0000] selection:text-white">
      {/* Header */}
      <header className="bg-[#0a0a0a]/80 backdrop-blur-md border-b border-[#333333] sticky top-0 z-30 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <Flame className="w-5 h-5 text-[#cc0000] animate-pulse" />
            <span className="font-extrabold text-sm tracking-widest text-white uppercase">HAAS PORTAL RESERVAS</span>
          </div>

          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-all py-1.5 px-3 bg-[#121212] hover:bg-[#1c1c1c] border border-[#333333] rounded-lg group shadow-inner"
              title="Acceso exclusivo para administradores"
            >
              <Lock className="w-3.5 h-3.5 text-gray-600 group-hover:text-[#cc0000] transition-colors" />
              <span className="font-mono font-semibold tracking-wide">Portal Admin</span>
            </Link>

            {isAuthenticated && (
              <button
                onClick={handleLogout}
                disabled={isPending}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors uppercase font-mono bg-[#121212] border border-[#333333] px-3 py-1.5 rounded-lg"
              >
                <LogOut className="w-3.5 h-3.5 text-[#cc0000]" />
                <span>Salir</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Catalog */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-[#333333]">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <FlameKindling className="w-6 h-6 text-[#cc0000] shrink-0" />
                Catálogo de San Juan 2026
              </h1>
              <p className="text-gray-400 text-xs mt-1">Precios corporativos garantizados de fábrica para sucursales B2B e invitados.</p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="bg-[#121212] border border-[#333333] rounded-2xl p-6 space-y-4 animate-pulse">
                  <div className="bg-[#1a1a1a] rounded-xl h-48 w-full" />
                  <div className="h-4 bg-[#1a1a1a] rounded w-1/3" />
                  <div className="h-6 bg-[#1a1a1a] rounded w-3/4" />
                  <div className="h-4 bg-[#1a1a1a] rounded w-full" />
                </div>
              ))}
            </div>
          ) : promociones.length === 0 ? (
            <Card className="border border-[#333333] p-12 text-center text-gray-500 bg-[#121212]">
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
                  className="bg-[#121212] border border-[#333333] hover:border-[#cc0000]/50 rounded-2xl overflow-hidden p-5 flex flex-col justify-between hover:shadow-[0_0_20px_rgba(204,0,0,0.15)] transition-all duration-300"
                >
                  <div>
                    <div className="relative overflow-hidden rounded-xl mb-4 aspect-[4/3] bg-[#1a1a1a] border border-[#262626]">
                      <img
                        src={promo.imagen_url}
                        alt={promo.titulo}
                        className="object-cover w-full h-full hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <span className="text-[9px] text-[#ff3333] font-bold uppercase tracking-widest bg-[#cc0000]/10 border border-[#cc0000]/25 px-2.5 py-1 rounded-full">
                      Campaña San Juan
                    </span>
                    <h3 className="text-lg font-bold text-white mt-3 mb-1.5 leading-tight">{promo.titulo}</h3>
                    <p className="text-gray-400 text-xs leading-relaxed mb-4 line-clamp-2">{promo.descripcion}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-gray-500 font-mono">Precio Unitario:</span>
                      <span className="text-xl font-black font-mono text-[#cc0000] drop-shadow-[0_0_10px_rgba(204,0,0,0.25)]">Bs. {promo.precio_bs.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-[11px] font-mono text-gray-500 pb-1.5 border-b border-[#262626]">
                      <span>Stock disponible:</span>
                      <span className="font-bold text-white">{promo.stock_disponible} unidades</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Quantity Selector with strict QA block */}
                      <div className="flex items-center border border-[#333333] rounded-lg overflow-hidden bg-[#1a1a1a]">
                        <button
                          type="button"
                          onClick={() => handleDecrement(promo.id)}
                          className="px-2.5 py-2 hover:bg-[#262626] text-gray-400 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="text"
                          value={quantities[promo.id] || 1}
                          onKeyDown={(e) => {
                            // Bloquear letras, decimales, negativos, etc.
                            if (['e', 'E', '+', '-', '.', ','].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          onChange={(e) => handleQuantityChange(promo.id, e.target.value, promo.stock_disponible)}
                          className="w-12 text-center text-sm font-bold text-white border-none bg-transparent focus:ring-0 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleIncrement(promo.id, promo.stock_disponible)}
                          className="px-2.5 py-2 hover:bg-[#262626] text-gray-400 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Add Button */}
                      <Button
                        onClick={() => handleAddToCart(promo)}
                        className="flex-1 bg-[#cc0000] hover:bg-[#e60000] text-white text-xs font-bold uppercase tracking-wider py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-[#cc0000]/10"
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
          <Card className="border border-[#333333] shadow-2xl bg-[#121212] rounded-2xl sticky top-24 overflow-hidden">
            <div className="h-[2px] bg-gradient-to-r from-transparent via-[#cc0000] to-transparent" />
            <CardContent className="p-6 space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-[#262626]">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#cc0000]" />
                  <span className="font-bold text-white uppercase tracking-wider text-sm">Resumen de Reserva</span>
                </div>
                <span className="text-[10px] font-bold bg-[#cc0000]/10 border border-[#cc0000]/25 text-[#ff3333] px-2.5 py-0.5 rounded-full font-mono">
                  {cart.length} combos
                </span>
              </div>

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-xs font-mono">
                    No has añadido combos a tu reserva todavía.
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.promotion.id} className="flex flex-col gap-2 pb-4 border-b border-[#262626] last:border-0 last:pb-0">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-0.5">
                          <span className="block font-bold text-white text-xs leading-snug">{item.promotion.titulo}</span>
                          <span className="block text-[10px] text-gray-500 font-mono">
                            Bs. {item.promotion.precio_bs.toFixed(2)} c/u
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold font-mono text-xs text-[#cc0000]">
                            Bs. {(item.promotion.precio_bs * item.cantidad).toFixed(2)}
                          </span>
                          <button
                            onClick={() => handleRemoveFromCart(item.promotion.id)}
                            className="text-gray-500 hover:text-red-500 text-xs font-bold transition-colors"
                            title="Eliminar combo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* QA Editable Quantity Input inside sidebar cart */}
                      <div className="flex items-center border border-[#262626] rounded bg-[#1a1a1a] w-fit">
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQty(item.promotion.id, item.cantidad - 1, item.promotion.stock_disponible)}
                          className="px-2 py-1 hover:bg-[#262626] text-gray-400 transition-colors"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <input
                          type="text"
                          value={item.cantidad}
                          onKeyDown={(e) => {
                            if (['e', 'E', '+', '-', '.', ','].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          onChange={(e) => {
                            const val = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 1;
                            handleUpdateCartQty(item.promotion.id, val, item.promotion.stock_disponible);
                          }}
                          className="w-8 text-center text-[10px] font-bold text-white border-none bg-transparent focus:ring-0 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQty(item.promotion.id, item.cantidad + 1, item.promotion.stock_disponible)}
                          className="px-2 py-1 hover:bg-[#262626] text-gray-400 transition-colors"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="pt-4 border-t border-[#262626] space-y-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Monto Total:</span>
                    <span className="text-2xl font-black font-mono text-[#cc0000] drop-shadow-[0_0_10px_rgba(204,0,0,0.2)]">Bs. {totalBs.toFixed(2)}</span>
                  </div>

                  <Link href="/checkout" className="block w-full">
                    <Button className="w-full bg-[#cc0000] hover:bg-[#e60000] text-white py-3 rounded-lg flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-xs shadow-lg shadow-[#cc0000]/10 transition-all hover:scale-[1.01]">
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
