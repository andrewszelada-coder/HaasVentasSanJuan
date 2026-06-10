'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { getPromociones, logoutAction } from '@/app/actions';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Flame, LogOut, ShoppingBag, Plus, Minus, Lock, Trash2, ArrowRight, FlameKindling, CalendarCheck, ShieldCheck, User } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

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

interface CartItem {
  promotion: Promotion;
  cantidad: number;
}

export default function ReservasPage() {
  const supabase = createClient();
  const [promociones, setPromociones] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Countdown to San Juan Night (June 23, 2026 20:00:00)
  useEffect(() => {
    const targetDate = new Date('2026-06-23T20:00:00-04:00'); // Zona horaria de Bolivia/La Paz

    const calculateTime = () => {
      const difference = +targetDate - +new Date();
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getPromociones(true);
        // Mapeo dinámico de imágenes gourmet locales generadas por IA
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
            activo: item.activo,
            tipo_venta: item.tipo_venta
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
  }, []);

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    }
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
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
    toast.success(`Se agregaron ${qty} ${promo.tipo_venta === 'A granel (Kg)' ? 'Kg' : 'combo(s)'} a tu reserva.`);
  };

  const handleRemoveFromCart = (id: string) => {
    const newCart = cart.filter(item => item.promotion.id !== id);
    saveCartToStorage(newCart);
    toast.info("Producto eliminado de la reserva.");
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
      await supabase.auth.signOut();
      await logoutAction();
      window.location.href = '/reservas';
    });
  };

  const getInitials = () => {
    if (user?.user_metadata?.nombres) {
      const first = user.user_metadata.nombres.charAt(0);
      const last = user.user_metadata.apellidos ? user.user_metadata.apellidos.charAt(0) : '';
      return `${first}${last}`.toUpperCase();
    }
    if (user?.user_metadata?.empresa) {
      return user.user_metadata.empresa.substring(0, 2).toUpperCase();
    }
    return 'C';
  };

  const totalBs = cart.reduce((sum, item) => sum + item.promotion.precio_bs * item.cantidad, 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-[#cc0000] selection:text-white">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center">
            {/* Logo removido de la barra de navegación superior */}
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2.5 py-1 px-3 rounded-full hover:bg-slate-50 border border-slate-200/80 bg-white transition-all shadow-sm focus:outline-none cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#cc0000] to-red-500 text-white font-extrabold text-xs flex items-center justify-center shadow-md">
                    {getInitials()}
                  </div>
                  <span className="text-xs font-bold text-slate-800 max-w-[120px] truncate hidden sm:inline">
                    {user.user_metadata?.nombres || user.user_metadata?.empresa || 'Cliente'}
                  </span>
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <>
                      {/* Backdrop transparent to close dropdown */}
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setDropdownOpen(false)} 
                      />
                      
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 overflow-hidden text-left"
                      >
                        <div className="px-4 py-2 border-b border-slate-100">
                          <span className="block text-xs font-bold text-slate-900 truncate">
                            {user.user_metadata?.nombres ? `${user.user_metadata.nombres} ${user.user_metadata.apellidos || ''}` : (user.user_metadata?.empresa || 'Cliente Haas')}
                          </span>
                          <span className="block text-[10px] text-slate-400 font-mono truncate">
                            {user.email}
                          </span>
                          {user.user_metadata?.nit && (
                            <span className="block text-[9px] text-slate-400 font-mono mt-0.5">
                              NIT: {user.user_metadata.nit}
                            </span>
                          )}
                        </div>
                        
                        <div className="p-1 space-y-0.5">
                          <Link href="/mi-cuenta">
                            <span className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-[#cc0000] flex items-center gap-2 transition-colors cursor-pointer">
                              <User className="w-3.5 h-3.5 text-slate-450" />
                              Mi Cuenta
                            </span>
                          </Link>

                          <button
                            onClick={() => {
                              setDropdownOpen(false);
                              handleLogout();
                            }}
                            disabled={isPending}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 hover:text-[#cc0000] flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            Cerrar Sesión
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link 
                href="/login" 
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#cc0000] transition-all py-1.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg group shadow-sm font-semibold animate-all duration-300"
                title="Acceso exclusivo para administradores"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#cc0000] transition-colors" />
                <span className="font-mono">Iniciar Sesión</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Large Campaign Banner (Se ve completa sin recortes) */}
      <div className="max-w-7xl mx-auto px-6 mt-6 animate-fade-in animate-duration-300">
        <Image 
          src="/images/banner-grande.png" 
          width={1280} 
          height={320} 
          alt="Campaña Haas San Juan 2026" 
          priority 
          className="w-full h-auto rounded-3xl shadow-md border border-slate-200/80"
        />
      </div>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto px-6 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in animate-duration-300">
        
        {/* Left Side: Catalog */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-200">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2 uppercase">
                <FlameKindling className="w-6 h-6 text-[#cc0000] shrink-0 animate-bounce" />
                Catálogo de San Juan 2026
              </h1>
              <p className="text-slate-500 text-xs mt-1 font-medium">Precios de fábrica garantizados para todos nuestros clientes.</p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 animate-pulse">
                  <div className="bg-slate-100 rounded-2xl h-48 w-full" />
                  <div className="h-4 bg-slate-100 rounded w-1/3" />
                  <div className="h-6 bg-slate-100 rounded w-3/4" />
                  <div className="h-4 bg-slate-100 rounded w-full" />
                </div>
              ))}
            </div>
          ) : promociones.length === 0 ? (
            <Card className="border border-slate-200 p-12 text-center text-slate-400 bg-white rounded-3xl shadow-sm">
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
                    <div className="flex justify-between items-baseline pt-3 border-t border-slate-100">
                      {promo.tipo_venta === 'A granel (Kg)' ? (
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



                    <div className="flex items-center gap-3">
                      {/* Quantity Selector with strict QA block */}
                      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                        <button
                          type="button"
                          onClick={() => handleDecrement(promo.id)}
                          className="px-2.5 py-2 hover:bg-slate-100 text-slate-500 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={quantities[promo.id] || 1}
                          onKeyDown={(e) => {
                            // Bloquear letras, decimales, negativos, etc.
                            if (['e', 'E', '+', '-', '.', ','].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          onChange={(e) => handleQuantityChange(promo.id, e.target.value, promo.stock_disponible)}
                          className="w-12 text-center text-sm font-bold text-slate-900 border-none bg-transparent focus:ring-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleIncrement(promo.id, promo.stock_disponible)}
                          className="px-2.5 py-2 hover:bg-slate-100 text-slate-500 transition-colors"
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

        {/* Right Side: Countdown and Sticky Summary */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Corporate Countdown Box */}
          <div className="bg-white border border-slate-200/80 shadow-md rounded-3xl p-6 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#cc0000]" />
            <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-3">
              Cuenta regresiva para la Noche de San Juan
            </h3>
            
            <div className="grid grid-cols-4 gap-2.5 mb-4">
              {[
                { label: "Días", value: timeLeft.days },
                { label: "Horas", value: timeLeft.hours },
                { label: "Min.", value: timeLeft.minutes },
                { label: "Seg.", value: timeLeft.seconds },
              ].map((item, index) => (
                <div key={index} className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 shadow-inner">
                  <span className="block text-2xl font-extrabold font-mono text-[#cc0000] leading-none mb-1">
                    {String(item.value).padStart(2, '0')}
                  </span>
                  <span className="text-[8px] text-slate-400 uppercase font-bold tracking-widest">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-[#cc0000]/5 border border-[#cc0000]/10 rounded-2xl p-3 flex items-center gap-3 text-left">
              <CalendarCheck className="w-6.5 h-6.5 text-[#cc0000] shrink-0" />
              <div>
                <span className="block font-bold text-slate-900 text-xs">Reserva 100% Garantizada</span>
                <span className="block text-[9px] text-slate-500 font-medium">Aseguramos la entrega directa desde fábrica para el 23 de Junio.</span>
              </div>
            </div>
          </div>

          {/* Sticky Summary Card */}
          <div className="sticky top-24">
            <Card className="border border-slate-200/80 shadow-xl bg-white rounded-3xl overflow-hidden">
              <div className="h-[3px] bg-[#cc0000]" />
              <CardContent className="p-6 space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-[#cc0000]" />
                    <span className="font-black text-slate-900 uppercase tracking-wider text-xs">Resumen de Reserva</span>
                  </div>
                  <span className="text-[10px] font-bold bg-[#cc0000]/10 border border-[#cc0000]/15 text-[#cc0000] px-2.5 py-0.5 rounded-full font-mono">
                    {mounted ? cart.length : 0} {cart.length === 1 ? 'item' : 'items'}
                  </span>
                </div>

                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                  {!mounted ? (
                    <div className="text-center py-8 text-slate-400 text-xs font-mono font-medium">
                      Cargando resumen...
                    </div>
                  ) : cart.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs font-mono font-medium">
                      No has añadido productos a tu reserva todavía.
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.promotion.id} className="flex flex-col gap-2 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-0.5">
                            <span className="block font-bold text-slate-900 text-xs leading-snug">{item.promotion.titulo}</span>
                            <span className="block text-[10px] text-slate-400 font-mono">
                              Bs. {item.promotion.precio_bs.toFixed(2)} {item.promotion.tipo_venta === 'A granel (Kg)' ? '/ Kg' : 'c/u'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className="font-bold font-mono text-xs text-[#cc0000]">
                              Bs. {(item.promotion.precio_bs * item.cantidad).toFixed(2)}
                            </span>
                            <button
                              onClick={() => handleRemoveFromCart(item.promotion.id)}
                              className="text-slate-300 hover:text-red-600 text-xs font-bold transition-colors"
                              title="Eliminar combo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* QA Editable Quantity Input inside sidebar cart */}
                        <div className="flex items-center border border-slate-200 rounded bg-slate-50 w-fit">
                          <button
                            type="button"
                            onClick={() => handleUpdateCartQty(item.promotion.id, item.cantidad - 1, item.promotion.stock_disponible)}
                            className="px-2 py-1 hover:bg-slate-100 text-slate-500 transition-colors"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <input
                            type="number"
                            min="1"
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
                            className="w-8 text-center text-[10px] font-bold text-slate-900 border-none bg-transparent focus:ring-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateCartQty(item.promotion.id, item.cantidad + 1, item.promotion.stock_disponible)}
                            className="px-2 py-1 hover:bg-slate-100 text-slate-500 transition-colors"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {mounted && cart.length > 0 && (
                  <div className="pt-4 border-t border-slate-100 space-y-4">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Monto Total:</span>
                      <span className="text-2xl font-black font-mono text-[#cc0000]">Bs. {totalBs.toFixed(2)}</span>
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

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 mt-16 py-12 text-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#cc0000]/10 flex items-center justify-center rounded-lg border border-[#cc0000]/20 shadow-sm">
              <Flame className="w-4 h-4 text-[#cc0000] animate-pulse" />
            </div>
            <span className="font-black tracking-widest text-white uppercase text-xs">INDUSTRIAS HAAS LTDA.</span>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
            <span className="text-[10px] text-slate-500 font-mono tracking-wider">
              © 2026 INDUSTRIAS HAAS LTDA. • TODOS LOS DERECHOS RESERVADOS
            </span>
            <div className="flex items-center gap-3">
              <a 
                href="https://www.instagram.com/industriashaas?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-slate-500 hover:text-[#cc0000] hover:scale-110 transition-all p-1.5 bg-slate-900 hover:bg-slate-900 rounded-full border border-slate-900 hover:border-[#cc0000]/30 shadow-sm flex items-center justify-center"
                title="Instagram"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </a>
              <a 
                href="https://www.facebook.com/INDUSTRIASHAASLTDA" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-slate-500 hover:text-[#cc0000] hover:scale-110 transition-all p-1.5 bg-slate-900 hover:bg-slate-900 rounded-full border border-slate-900 hover:border-[#cc0000]/30 shadow-sm flex items-center justify-center"
                title="Facebook"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
