'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Flame, ShieldCheck, Truck, CalendarCheck, ArrowRight, ExternalLink } from 'lucide-react';
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
      imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=500"
    },
    {
      title: "Combo Parrillero Premium",
      description: "3 kg de Chorizos Haas Surtidos, Pan Brioche, Chimichurri y Salsas Especiales.",
      price: "195.00",
      normalPrice: "260.00",
      discount: "25% OFF",
      imageUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500"
    },
    {
      title: "Pack Familiar Haas",
      description: "5 kg de Chorizo de Res y Cerdo Especiales San Juan para grandes eventos.",
      price: "315.00",
      normalPrice: "450.00",
      discount: "30% OFF",
      imageUrl: "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=500"
    }
  ];

  return (
    <div className="bg-[#F8FAFC] min-h-screen text-[#0F172A] font-sans selection:bg-[#166534] selection:text-white">
      {/* Header / Navbar */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-emerald-800/10 flex items-center justify-center rounded-lg">
              <Flame className="w-5 h-5 text-[#9A3412]" />
            </div>
            <span className="font-bold text-lg tracking-tight text-[#0F172A]">INDUSTRIAS HAAS</span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-slate-600 hover:text-emerald-800 transition-colors">
                Portal Reservas
              </Button>
            </Link>
            <Link href="/login">
              <Button className="bg-[#166534] hover:bg-[#114f27] text-white px-5 rounded-lg flex items-center gap-2">
                Acceder <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-slate-100/50 to-orange-50/20 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          <div className="lg:col-span-7 space-y-6 text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-800/10 text-emerald-800 text-xs font-semibold rounded-full uppercase tracking-wider">
              Campaña Especial San Juan 2026
            </span>
            <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Asegura tu abastecimiento parrillero <span className="text-[#9A3412]">sin contratiempos</span>
            </h1>
            <p className="text-lg text-slate-500 max-w-xl leading-relaxed">
              Digitalizamos la campaña más importante del año para sucursales, vendedores y distribuidores. Olvídate de los excels y planifica con reservas garantizadas directo desde fábrica.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <Link href="/login">
                <Button size="lg" className="bg-[#166534] hover:bg-[#114f27] text-white text-base px-8 py-6 rounded-xl shadow-lg shadow-emerald-800/20 flex items-center gap-3">
                  Reservar Ahora <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="border-slate-200 hover:bg-slate-50 text-slate-700 text-base px-8 py-6 rounded-xl flex items-center gap-2">
                  Ver Catálogo <ExternalLink className="w-4 h-4" />
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
              className="bg-white border border-slate-100 shadow-2xl rounded-2xl p-8 w-full max-w-md text-center"
            >
              <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-4">
                Cuenta regresiva para la Noche de San Juan
              </h3>
              
              <div className="grid grid-cols-4 gap-2 mb-6">
                {[
                  { label: "Días", value: timeLeft.days },
                  { label: "Horas", value: timeLeft.hours },
                  { label: "Min.", value: timeLeft.minutes },
                  { label: "Seg.", value: timeLeft.seconds },
                ].map((item, index) => (
                  <div key={index} className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                    <span className="block text-3xl font-bold font-mono text-[#9A3412] leading-none mb-1">
                      {String(item.value).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="bg-emerald-800/5 border border-emerald-800/10 rounded-xl p-4 flex items-center gap-3.5 text-left">
                <CalendarCheck className="w-8 h-8 text-emerald-800 shrink-0" />
                <div>
                  <span className="block font-bold text-slate-900 text-sm">Reserva 100% Garantizada</span>
                  <span className="block text-xs text-slate-500">Garantizamos la producción exacta para entrega directa el 23 de Junio.</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Promociones Destacadas */}
      <section className="py-24 bg-white border-t border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Combos Destacados de Campaña
            </h2>
            <p className="text-slate-500 text-sm">
              Selección exclusiva de embutidos Haas diseñados para maximizar tus ventas y el disfrute de tus clientes en San Juan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {promoHighlights.map((promo, index) => (
              <motion.div
                key={index}
                whileHover={{ y: -6 }}
                className="bg-[#F8FAFC] border border-slate-100 rounded-2xl overflow-hidden p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="relative overflow-hidden rounded-xl mb-5 aspect-[4/3] bg-slate-200">
                    <img
                      src={promo.imageUrl}
                      alt={promo.title}
                      className="object-cover w-full h-full hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute top-4 right-4 bg-[#9A3412] text-white px-2.5 py-1 text-xs font-semibold rounded-full uppercase tracking-wider">
                      {promo.discount}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{promo.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-6">{promo.description}</p>
                </div>

                <div>
                  <div className="flex items-baseline gap-2.5 mb-5">
                    <span className="text-2xl font-bold font-mono text-[#9A3412]">Bs. {promo.price}</span>
                    <span className="text-sm text-slate-400 line-through">Bs. {promo.normalPrice}</span>
                  </div>
                  <Link href="/login" className="w-full block">
                    <Button variant="outline" className="w-full border-slate-200 hover:bg-emerald-800 hover:text-white rounded-lg transition-colors">
                      Ver Detalles
                    </Button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Beneficios Corporativos */}
      <section className="py-24 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            {
              icon: <ShieldCheck className="w-6 h-6 text-emerald-800" />,
              title: "Calidad Certificada",
              desc: "Todos nuestros embutidos parrillero cumplen con rigurosos procesos de frío y calidad para San Juan."
            },
            {
              icon: <Truck className="w-6 h-6 text-emerald-800" />,
              title: "Distribución Directa",
              desc: "Entregamos directamente en tu sucursal o distribuidora autorizada con nuestra flota refrigerada propia."
            },
            {
              icon: <Flame className="w-6 h-6 text-[#9A3412]" />,
              title: "Suministro Programado",
              desc: "Consolidamos tu reserva con anticipación para programar la producción de planta de embutidos parrillero."
            }
          ].map((benefit, index) => (
            <div key={index} className="flex gap-4">
              <div className="w-12 h-12 bg-white border border-slate-100 shadow-sm flex items-center justify-center rounded-xl shrink-0">
                {benefit.icon}
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900">{benefit.title}</h4>
                <p className="text-slate-500 text-sm leading-relaxed">{benefit.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-[#9A3412]" />
            <span className="font-bold tracking-tight text-[#0F172A]">INDUSTRIAS HAAS LTDA.</span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            © 2026 INDUSTRIAS HAAS LTDA. • PORTAL B2B RESERVAS • TODOS LOS DERECHOS RESERVADOS
          </span>
        </div>
      </footer>
    </div>
  );
}
