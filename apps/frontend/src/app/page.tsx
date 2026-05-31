'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Flame, ShieldCheck, Truck, CalendarCheck, ArrowRight, ShoppingBag, Lock, FlameKindling } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

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

  const promoHighlights = [
    {
      title: "Combo San Juan Clásico",
      description: "2 kg de Chorizos Haas, 1 Salsa Chimichurri Artesanal y Carbón seleccionado.",
      price: "120.00",
      normalPrice: "150.00",
      discount: "20% OFF",
      imageUrl: "/images/combo_clasico.png"
    },
    {
      title: "Combo Parrillero Premium",
      description: "3 kg de Chorizos Haas Surtidos, Pan Brioche, Chimichurri y Salsas Especiales.",
      price: "195.00",
      normalPrice: "260.00",
      discount: "25% OFF",
      imageUrl: "/images/combo_premium.png"
    },
    {
      title: "Pack Familiar Haas",
      description: "5 kg de Chorizo de Res y Cerdo Especiales San Juan para grandes eventos.",
      price: "315.00",
      normalPrice: "450.00",
      discount: "30% OFF",
      imageUrl: "/images/pack_familiar.png"
    }
  ];

  return (
    <div className="bg-background min-h-screen text-foreground font-sans selection:bg-[#cc0000] selection:text-white">
      {/* Header / Navbar */}
      <header className="sticky top-0 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-[#333333] z-50 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-[#cc0000]/10 flex items-center justify-center rounded-lg border border-[#cc0000]/30 shadow-[0_0_10px_rgba(204,0,0,0.1)]">
              <Flame className="w-5 h-5 text-[#cc0000] animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-widest text-white leading-none">INDUSTRIAS HAAS</span>
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">Portal B2B Reservas</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Acceso discreto para administradores */}
            <Link 
              href="/login" 
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-all py-1.5 px-3 bg-[#121212] hover:bg-[#1c1c1c] border border-[#333333] rounded-lg group shadow-inner"
              title="Acceso exclusivo para administradores"
            >
              <Lock className="w-3.5 h-3.5 text-gray-600 group-hover:text-[#cc0000] transition-colors" />
              <span className="font-mono font-semibold tracking-wide">Portal Admin</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-28 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#1a1a1a_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#cc0000]/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-20 right-10 w-96 h-96 bg-[#cc0000]/3 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          <div className="lg:col-span-7 space-y-6 text-left">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-[#cc0000]/10 border border-[#cc0000]/30 text-[#ff3333] text-xs font-semibold rounded-full uppercase tracking-wider shadow-[0_0_15px_rgba(204,0,0,0.1)]">
              <FlameKindling className="w-3.5 h-3.5 animate-bounce" /> Campaña Especial San Juan 2026
            </span>
            <h1 className="text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
              Asegura tu abastecimiento parrillero <span className="text-[#cc0000] drop-shadow-[0_0_15px_rgba(204,0,0,0.3)]">sin contratiempos</span>
            </h1>
            <p className="text-base text-gray-400 max-w-xl leading-relaxed">
              Digitalizamos la campaña más importante del año para sucursales, vendedores y distribuidores. Olvídate de los excels y planifica con reservas garantizadas directo desde fábrica.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <Link href="/reservas">
                <Button size="lg" className="bg-[#cc0000] hover:bg-[#e60000] text-white text-base px-8 py-6 rounded-xl shadow-lg shadow-[#cc0000]/15 flex items-center gap-3 transition-all duration-300 hover:scale-[1.02] active:scale-95 font-bold">
                  Ingresar a Reservas <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col items-center">
            {/* Countdown Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="bg-[#121212] border border-[#333333] shadow-2xl rounded-2xl p-8 w-full max-w-md text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#cc0000] to-transparent" />
              <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-4">
                Cuenta regresiva para la Noche de San Juan
              </h3>
              
              <div className="grid grid-cols-4 gap-2.5 mb-6">
                {[
                  { label: "Días", value: timeLeft.days },
                  { label: "Horas", value: timeLeft.hours },
                  { label: "Min.", value: timeLeft.minutes },
                  { label: "Seg.", value: timeLeft.seconds },
                ].map((item, index) => (
                  <div key={index} className="bg-[#1a1a1a] border border-[#262626] rounded-xl p-3 shadow-inner">
                    <span className="block text-3xl font-extrabold font-mono text-[#cc0000] leading-none mb-1 drop-shadow-[0_0_6px_rgba(204,0,0,0.3)]">
                      {String(item.value).padStart(2, '0')}
                    </span>
                    <span className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="bg-[#cc0000]/5 border border-[#cc0000]/10 rounded-xl p-4 flex items-center gap-3.5 text-left">
                <CalendarCheck className="w-8 h-8 text-[#cc0000] shrink-0" />
                <div>
                  <span className="block font-bold text-white text-sm">Reserva 100% Garantizada</span>
                  <span className="block text-xs text-gray-400">Garantizamos la producción exacta para entrega directa el 23 de Junio.</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Promociones Destacadas */}
      <section className="py-24 bg-[#121212]/30 border-t border-b border-[#333333]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl font-black tracking-tight text-white">
              Combos Destacados de Campaña
            </h2>
            <p className="text-gray-400 text-sm">
              Selección exclusiva de embutidos Haas diseñados para maximizar tus reservas y el disfrute de tus clientes en San Juan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {promoHighlights.map((promo, index) => (
              <motion.div
                key={index}
                whileHover={{ y: -6 }}
                className="bg-[#121212] border border-[#333333] hover:border-[#cc0000]/50 rounded-2xl overflow-hidden p-6 flex flex-col justify-between hover:shadow-[0_0_20px_rgba(204,0,0,0.15)] transition-all duration-300"
              >
                <div>
                  <div className="relative overflow-hidden rounded-xl mb-5 aspect-[4/3] bg-[#1a1a1a]">
                    <img
                      src={promo.imageUrl}
                      alt={promo.title}
                      className="object-cover w-full h-full hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute top-4 right-4 bg-[#cc0000] text-white px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider">
                      {promo.discount}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{promo.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-6">{promo.description}</p>
                </div>

                <div>
                  <div className="flex items-baseline gap-2.5 mb-5">
                    <span className="text-2xl font-black font-mono text-[#cc0000]">Bs. {promo.price}</span>
                    <span className="text-sm text-gray-500 line-through">Bs. {promo.normalPrice}</span>
                  </div>
                  <Link href="/reservas" className="w-full block">
                    <Button variant="outline" className="w-full border-[#333333] hover:border-[#cc0000] hover:bg-[#cc0000] hover:text-white rounded-lg transition-all text-xs font-bold uppercase tracking-wider">
                      Realizar Reserva
                    </Button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Beneficios Corporativos */}
      <section className="py-24 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            {
              icon: <ShieldCheck className="w-6 h-6 text-[#cc0000]" />,
              title: "Calidad Certificada",
              desc: "Todos nuestros embutidos parrillero cumplen con rigurosos procesos de frío y calidad para San Juan."
            },
            {
              icon: <Truck className="w-6 h-6 text-[#cc0000]" />,
              title: "Distribución Directa",
              desc: "Entregamos directamente en tu sucursal o distribuidora autorizada con nuestra flota refrigerada propia."
            },
            {
              icon: <Flame className="w-6 h-6 text-[#cc0000]" />,
              title: "Suministro Programado",
              desc: "Consolidamos tu reserva con anticipación para programar la producción de planta de embutidos parrillero."
            }
          ].map((benefit, index) => (
            <div key={index} className="flex gap-4">
              <div className="w-12 h-12 bg-[#121212] border border-[#333333] shadow-sm flex items-center justify-center rounded-xl shrink-0">
                {benefit.icon}
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-white text-base">{benefit.title}</h4>
                <p className="text-gray-400 text-sm leading-relaxed">{benefit.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0a0a0a] border-t border-[#333333] py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-[#cc0000]" />
            <span className="font-bold tracking-tight text-white">INDUSTRIAS HAAS LTDA.</span>
          </div>
          <span className="text-[10px] text-gray-500 font-mono">
            © 2026 INDUSTRIAS HAAS LTDA. • PORTAL B2B RESERVAS • TODOS LOS DERECHOS RESERVADOS
          </span>
        </div>
      </footer>
    </div>
  );
}
