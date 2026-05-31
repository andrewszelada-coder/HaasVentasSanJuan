'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { crearPedidoAction } from '@/app/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  ArrowLeft, ArrowRight, Check, User, MapPin, CreditCard, 
  Receipt, Landmark, BadgePercent, Map, Loader2
} from 'lucide-react';

interface CartItem {
  promotion: {
    id: string;
    titulo: string;
    description?: string;
    descripcion: string;
    precio_bs: number;
    stock_disponible: number;
    imagen_url: string;
  };
  cantidad: number;
}

export default function CheckoutStepperPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Paso 1: Identificación (Compra Rápida como Invitado Únicamente, sin Socio B2B para máxima usabilidad)
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  // Paso 2: Facturación
  const [razonSocial, setRazonSocial] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('NIT');
  const [numeroDocumento, setNumeroDocumento] = useState('');

  // Paso 3: Logística
  const [tipoUbicacion, setTipoUbicacion] = useState('Casa');
  const [direccion, setDireccion] = useState('');
  const [latitud, setLatitud] = useState<number | null>(null);
  const [longitud, setLongitud] = useState<number | null>(null);
  const [telefono, setTelefono] = useState('');
  const [indicaciones, setIndicaciones] = useState('');
  const [mapFixed, setMapFixed] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Paso 4: Pago & Cupones
  const [cuponInput, setCuponInput] = useState('');
  const [cuponAplicado, setCuponAplicado] = useState('');
  const [descuentoBs, setDescuentoBs] = useState(0);
  const [metodoPago, setMetodoPago] = useState('Transferencia QR');

  useEffect(() => {
    const savedCart = localStorage.getItem('haas_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch {}
    }
  }, []);

  const subtotalBs = cart.reduce((sum, item) => sum + item.promotion.precio_bs * item.cantidad, 0);
  const totalBs = Math.max(0, subtotalBs - descuentoBs);

  const applyCoupon = () => {
    if (cuponInput.toUpperCase() === 'SANJUAN10') {
      const discount = subtotalBs * 0.10;
      setDescuentoBs(discount);
      setCuponAplicado('SANJUAN10');
      toast.success('¡Cupón aplicado! Se ha descontado un 10% del total.');
    } else {
      toast.error('Cupón inválido. Intente con "SANJUAN10".');
    }
  };

  // Geolocalización nativa real GPS
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("La geolocalización no es soportada por este navegador.");
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitud(position.coords.latitude);
        setLongitud(position.coords.longitude);
        setMapFixed(true);
        setGettingLocation(false);
        toast.success("¡Ubicación GPS real capturada e integrada con éxito!");
      },
      (error) => {
        setGettingLocation(false);
        console.error("Error de geolocalización:", error);
        // Exigencia de QA: Mostrar Toast amigable de error al denegar
        toast.error("Debes permitir la ubicación para la entrega");
        
        // Cargar coordenadas de fallback en La Paz, Bolivia para no impedir la compra
        setLatitud(-16.5001);
        setLongitud(-68.1501);
        setMapFixed(true);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  const nextStep = () => {
    if (currentStep === 1) {
      if (!guestName || !guestEmail) {
        toast.error('Por favor, complete sus datos de identificación de compra.');
        return;
      }
    }

    if (currentStep === 2) {
      if (!razonSocial || !numeroDocumento) {
        toast.error('Por favor, complete los datos de facturación.');
        return;
      }
    }

    if (currentStep === 3) {
      if (!direccion || !telefono) {
        toast.error('Por favor, ingrese su dirección y teléfono de contacto.');
        return;
      }
      if (!mapFixed) {
        toast.error('Por favor, obtenga su ubicación GPS satelital.');
        return;
      }
    }

    setCurrentStep(prev => Math.min(4, prev + 1));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const handleCheckoutSubmit = () => {
    if (cart.length === 0) {
      toast.error('El carrito de compras está vacío.');
      return;
    }

    const itemsPayload = cart.map(item => ({
      promoId: item.promotion.id,
      cantidad: item.cantidad
    }));

    startTransition(async () => {
      const billingPayload = {
        nombres: razonSocial,
        tipoDoc: tipoDocumento,
        numeroDoc: numeroDocumento
      };

      const logisticaPayload = {
        tipoUbicacion,
        direccion,
        latitud: latitud || -16.5000,
        longitud: longitud || -68.1500,
        telefono,
        indicaciones
      };

      const financieroPayload = {
        cuponAplicado,
        descuentoBs,
        metodoPago
      };

      const result = await crearPedidoAction(
        'Sucursal Central LPZ', // sucursal
        '2026-06-23', // fecha campaña San Juan
        indicaciones || 'Entrega especial San Juan B2C',
        itemsPayload,
        billingPayload,
        logisticaPayload,
        financieroPayload
      );

      if (result && result.error) {
        toast.error(result.error);
        return;
      }

      if (result && result.success) {
        // Almacenar temporalmente los datos del pedido para la pantalla de éxito
        const orderData = {
          orderId: result.pedidoId,
          totalBs: totalBs,
          razonSocial: razonSocial,
          nit: numeroDocumento,
          direccion: direccion,
          metodoPago: metodoPago
        };
        sessionStorage.setItem('haas_success_order', JSON.stringify(orderData));
        localStorage.removeItem('haas_cart'); // Limpiar carrito local
        
        toast.success("¡Pedido registrado exitosamente en fábrica!");
        // Redirigir a pantalla de éxito
        router.push('/checkout/success');
      }
    });
  };

  const stepHeaders = [
    { title: 'Identificación', desc: 'Compra Rápida', icon: <User className="w-4 h-4" /> },
    { title: 'Facturación', desc: 'Datos Tributarios', icon: <Receipt className="w-4 h-4" /> },
    { title: 'Entrega', desc: 'Ubicación y Mapas', icon: <MapPin className="w-4 h-4" /> },
    { title: 'Pago y Resumen', desc: 'Cupón y Confirmación', icon: <CreditCard className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 font-sans selection:bg-[#cc0000] selection:text-white">
      {/* Header */}
      <header className="bg-[#0b0f19]/80 backdrop-blur-md border-b border-[#2c354a] sticky top-0 z-30 transition-all">
        <div className="max-w-5xl mx-auto px-6 h-16 flex justify-between items-center">
          <Link href="/reservas" className="text-gray-400 hover:text-white flex items-center gap-1.5 text-sm font-semibold transition-colors">
            <ArrowLeft className="w-4 h-4 text-[#cc0000]" />
            Volver al Catálogo
          </Link>
          <span className="font-extrabold text-xs tracking-widest text-white uppercase font-mono">HAAS SAN JUAN • CHECKOUT</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 mt-8">
        
        {/* Stepper Indicator */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {stepHeaders.map((step, idx) => {
            const stepNum = idx + 1;
            const isCompleted = currentStep > stepNum;
            const isActive = currentStep === stepNum;
            
            return (
              <div key={idx} className="space-y-2">
                <div className={`h-1 rounded-full transition-all duration-300 ${
                  isCompleted || isActive ? 'bg-[#cc0000]' : 'bg-[#2c354a]'
                }`} />
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isCompleted 
                      ? 'bg-[#cc0000] text-white shadow-[0_0_10px_rgba(204,0,0,0.4)]' 
                      : isActive 
                      ? 'border-2 border-[#cc0000] text-[#cc0000] shadow-[0_0_8px_rgba(204,0,0,0.2)]' 
                      : 'border-2 border-[#2c354a] text-gray-500'
                  }`}>
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : stepNum}
                  </div>
                  <div className="hidden md:block">
                    <span className={`block text-xs font-bold leading-none ${
                      isActive ? 'text-white' : 'text-gray-500'
                    }`}>{step.title}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Form Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Side: Dynamic Step Form */}
          <div className="lg:col-span-8">
            <Card className="border border-[#2c354a] bg-[#1e2536] rounded-2xl overflow-hidden shadow-2xl relative">
              <div className="h-[2px] bg-gradient-to-r from-transparent via-[#cc0000] to-transparent animate-pulse absolute top-0 left-0 right-0" />
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="p-6 md:p-8"
                >
                  
                  {/* STEP 1: IDENTIFICACIÓN */}
                  {currentStep === 1 && (
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Paso 1: Identificación de Entrega</h2>
                        <p className="text-xs text-gray-400">Por favor, ingrese sus datos personales básicos para procesar la reserva directa de fábrica.</p>
                      </div>

                      <div className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="guestName" className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nombre Completo *</Label>
                          <Input
                            id="guestName"
                            value={guestName}
                            onChange={e => setGuestName(e.target.value)}
                            placeholder="Juan Pérez"
                            className="border-[#2c354a] bg-[#21283a] rounded-lg focus-visible:ring-[#cc0000] text-white"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="guestEmail" className="text-xs font-bold text-gray-400 uppercase tracking-widest">Correo Electrónico *</Label>
                          <Input
                            id="guestEmail"
                            type="email"
                            value={guestEmail}
                            onChange={e => setGuestEmail(e.target.value)}
                            placeholder="juan.perez@gmail.com"
                            className="border-[#2c354a] bg-[#21283a] rounded-lg focus-visible:ring-[#cc0000] text-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: FACTURACIÓN */}
                  {currentStep === 2 && (
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Paso 2: Datos de Facturación</h2>
                        <p className="text-xs text-gray-400">Complete los datos legales que se imprimirán en la factura de compra de la reserva.</p>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="razon" className="text-xs font-bold text-gray-400 uppercase tracking-widest">Razón Social / Nombre Completo *</Label>
                          <Input
                            id="razon"
                            value={razonSocial}
                            onChange={e => setRazonSocial(e.target.value)}
                            placeholder="Pérez Distribuidora S.R.L."
                            required
                            className="border-[#2c354a] bg-[#21283a] rounded-lg focus-visible:ring-[#cc0000]"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tipo de Documento *</Label>
                            <select
                              value={tipoDocumento}
                              onChange={e => setTipoDocumento(e.target.value)}
                              className="w-full bg-[#21283a] border border-[#2c354a] rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-[#cc0000] focus:border-[#cc0000] focus:outline-none"
                            >
                              <option value="NIT">NIT</option>
                              <option value="CI">C.I. (Carnet de Identidad)</option>
                              <option value="Pasaporte">Pasaporte</option>
                              <option value="C.E.">C.E. (Extranjería)</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="docNum" className="text-xs font-bold text-gray-400 uppercase tracking-widest">Número de Documento *</Label>
                            <Input
                              id="docNum"
                              value={numeroDocumento}
                              onChange={e => setNumeroDocumento(e.target.value)}
                              placeholder="1020405060"
                              required
                              className="border-[#2c354a] bg-[#21283a] rounded-lg focus-visible:ring-[#cc0000]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: LOGÍSTICA & ENTREGA */}
                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Paso 3: Logística y Entrega</h2>
                        <p className="text-xs text-gray-400">Configure los datos de despacho físico. Nuestro equipo de andén refrigerado de frío requiere alta precisión.</p>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tipo de Ubicación *</Label>
                            <select
                              value={tipoUbicacion}
                              onChange={e => setTipoUbicacion(e.target.value)}
                              className="w-full bg-[#21283a] border border-[#2c354a] rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-[#cc0000] focus:border-[#cc0000] focus:outline-none"
                            >
                              <option value="Casa">Casa</option>
                              <option value="Oficina">Oficina / Andén</option>
                              <option value="Departamento">Departamento</option>
                              <option value="Condominio">Condominio</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="tel" className="text-xs font-bold text-gray-400 uppercase tracking-widest">WhatsApp de Contacto *</Label>
                            <Input
                              id="tel"
                              type="tel"
                              value={telefono}
                              onChange={e => setTelefono(e.target.value)}
                              placeholder="70012345"
                              required
                              className="border-[#2c354a] bg-[#21283a] rounded-lg focus-visible:ring-[#cc0000]"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="dir" className="text-xs font-bold text-gray-400 uppercase tracking-widest">Dirección Escrita Detallada *</Label>
                          <Input
                            id="dir"
                            value={direccion}
                            onChange={e => setDireccion(e.target.value)}
                            placeholder="Av. Arce, Edificio Multicentro, Piso 12"
                            required
                            className="border-[#2c354a] bg-[#21283a] rounded-lg focus-visible:ring-[#cc0000]"
                          />
                        </div>

                        {/* GPS GEOLOCALIZACION COMPONENT WITH REAL MAP INTERACTION */}
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                            <Map className="w-3.5 h-3.5 text-[#cc0000]" /> Geolocalización Satelital GPS *
                          </Label>
                          
                          <div className="relative border border-[#2c354a] rounded-xl overflow-hidden h-52 bg-[#0d0d0d] flex flex-col items-center justify-center p-4">
                            {mapFixed && latitud && longitud ? (
                              <>
                                {/* Real Interactive OpenStreetMap Iframe */}
                                <iframe 
                                  width="100%" 
                                  height="100%" 
                                  frameBorder="0" 
                                  scrolling="no" 
                                  marginHeight={0} 
                                  marginWidth={0} 
                                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${longitud - 0.003}%2C${latitud - 0.002}%2C${longitud + 0.003}%2C${latitud + 0.002}&layer=mapnik&marker=${latitud}%2C${longitud}`}
                                  className="rounded-lg shadow-inner absolute inset-0 w-full h-full z-10"
                                />
                                {/* Overlay information */}
                                <div className="absolute top-2 left-2 z-20 bg-[#121724]/90 backdrop-blur border border-[#2c354a] rounded-lg p-2 text-[9px] font-mono text-white shadow-lg max-w-[200px]">
                                  <div className="flex items-center gap-1 text-[#ff3333] font-bold">
                                    <MapPin className="w-3 h-3" /> UBICACIÓN GPS FIJADA
                                  </div>
                                  <span className="block mt-0.5 text-gray-400">Lat: {latitud.toFixed(6)}</span>
                                  <span className="block text-gray-400">Lng: {longitud.toFixed(6)}</span>
                                </div>
                              </>
                            ) : (
                              <>
                                {/* Scanning Radar simulation when not fixed */}
                                <div className="absolute inset-0 bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:14px_14px] opacity-70" />
                                <div className="relative z-10 flex flex-col items-center gap-2">
                                  <MapPin className="w-9 h-9 text-gray-600 animate-bounce" />
                                  <span className="text-[10px] text-gray-500 font-mono text-center">
                                    Requerido: Haz clic abajo para geolocalizar tu entrega
                                  </span>
                                </div>
                              </>
                            )}
                            
                            <Button
                              type="button"
                              onClick={handleGetLocation}
                              disabled={gettingLocation}
                              className="absolute bottom-3 right-3 bg-[#1c1c1c]/90 backdrop-blur border border-[#2c354a] hover:bg-[#262626] hover:border-[#cc0000] text-white text-[10px] font-bold h-8 py-1 px-3 shadow rounded-lg flex items-center gap-1.5 transition-all active:scale-95 z-20"
                            >
                              {gettingLocation ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin text-[#cc0000]" />
                                  Obteniendo GPS...
                                </>
                              ) : (
                                <>
                                  📍 {mapFixed ? 'Actualizar ubicación GPS' : 'Obtener mi ubicación actual'}
                                </>
                              )}
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="ind" className="text-xs font-bold text-gray-400 uppercase tracking-widest">Indicaciones Adicionales</Label>
                          <textarea
                            id="ind"
                            rows={2}
                            value={indicaciones}
                            onChange={e => setIndicaciones(e.target.value)}
                            placeholder="Tocar el timbre rojo, dejar en portería, portón metálico gris..."
                            className="w-full bg-[#21283a] border border-[#2c354a] rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-[#cc0000] focus:border-[#cc0000] focus:outline-none placeholder:text-gray-600"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 4: RESUMEN, CUPONES Y PAGO */}
                  {currentStep === 4 && (
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Paso 4: Método de Pago</h2>
                        <p className="text-xs text-gray-400">Configure su método de pago y aplique cupones de descuento especiales.</p>
                      </div>

                      {/* Coupon Box */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                          <BadgePercent className="w-3.5 h-3.5 text-[#cc0000]" /> ¿Tiene un Cupón de Descuento?
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="SANJUAN10"
                            value={cuponInput}
                            onChange={e => setCuponInput(e.target.value)}
                            className="border-[#2c354a] bg-[#21283a] rounded-lg max-w-[200px]"
                          />
                          <Button
                            type="button"
                            onClick={applyCoupon}
                            className="bg-[#cc0000] hover:bg-[#e60000] text-white text-xs font-bold uppercase rounded-lg"
                          >
                            Aplicar
                          </Button>
                        </div>
                        {cuponAplicado && (
                          <span className="block text-[10px] text-[#ff3333] font-bold bg-[#cc0000]/10 border border-[#cc0000]/30 py-1 px-2.5 rounded-full w-max mt-2">
                            Cupón SANJUAN10 Activo (-10% OFF aplicado)
                          </span>
                        )}
                      </div>

                      {/* Payment Method Selector */}
                      <div className="space-y-3">
                        <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                          Método de Pago Preferido *
                        </Label>
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            type="button"
                            onClick={() => setMetodoPago('Transferencia QR')}
                            className={`p-4 border rounded-xl flex flex-col items-center justify-center gap-2.5 transition-all text-center ${
                              metodoPago === 'Transferencia QR' 
                                ? 'border-[#cc0000] bg-[#cc0000]/5 text-white ring-1 ring-[#cc0000] shadow-[0_0_15px_rgba(204,0,0,0.1)]' 
                                : 'border-[#2c354a] bg-[#21283a] text-gray-400 hover:text-white hover:bg-[#252e42]'
                            }`}
                          >
                            <Landmark className="w-5 h-5 shrink-0 text-[#cc0000]" />
                            <span className="font-bold text-xs uppercase tracking-wide">Transferencia QR</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setMetodoPago('Efectivo')}
                            className={`p-4 border rounded-xl flex flex-col items-center justify-center gap-2.5 transition-all text-center ${
                              metodoPago === 'Efectivo' 
                                ? 'border-[#cc0000] bg-[#cc0000]/5 text-white ring-1 ring-[#cc0000] shadow-[0_0_15px_rgba(204,0,0,0.1)]' 
                                : 'border-[#2c354a] bg-[#21283a] text-gray-400 hover:text-white hover:bg-[#252e42]'
                            }`}
                          >
                            <CreditCard className="w-5 h-5 shrink-0 text-[#cc0000]" />
                            <span className="font-bold text-xs uppercase tracking-wide">Efectivo contra entrega</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Navigation Footer */}
                  <div className="mt-8 pt-6 border-t border-[#2c354a] flex justify-between items-center">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={prevStep}
                      disabled={currentStep === 1 || isPending}
                      className="text-gray-400 hover:text-white hover:bg-[#252e42] transition-all flex items-center gap-1 rounded-lg text-xs"
                    >
                      <ArrowLeft className="w-4 h-4 text-[#cc0000]" /> Anterior
                    </Button>

                    {currentStep < 4 ? (
                      <Button
                        type="button"
                        onClick={nextStep}
                        className="bg-[#cc0000] hover:bg-[#e60000] text-white text-xs font-bold uppercase tracking-wider py-2.5 px-5 rounded-lg flex items-center gap-1.5 transition-all active:scale-95"
                      >
                        Siguiente <ArrowRight className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={handleCheckoutSubmit}
                        disabled={isPending}
                        className="bg-[#cc0000] hover:bg-[#e60000] text-white text-xs font-bold uppercase tracking-wider py-2.5 px-6 rounded-lg flex items-center gap-1.5 shadow-lg shadow-[#cc0000]/10 transition-all active:scale-95"
                      >
                        {isPending ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Procesando pedido...
                          </>
                        ) : (
                          <>
                            Confirmar y Finalizar
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                </motion.div>
              </AnimatePresence>

            </Card>
          </div>

          {/* Right Side: Resumen Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border border-[#2c354a] bg-[#1e2536] rounded-2xl shadow-2xl relative overflow-hidden">
              <div className="h-[2px] bg-gradient-to-r from-transparent via-[#cc0000] to-transparent absolute top-0 left-0 right-0" />
              <CardHeader className="pb-3 border-b border-[#21283a]">
                <span className="text-xs font-bold text-white uppercase tracking-widest">
                  Resumen de Compra
                </span>
              </CardHeader>
              
              <CardContent className="p-6 space-y-4">
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {cart.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 text-xs font-mono">
                      Tu carrito está vacío.
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.promotion.id} className="flex justify-between items-start text-xs border-b border-[#21283a] pb-2.5 last:border-0 last:pb-0">
                        <div className="space-y-0.5 max-w-[70%]">
                          <span className="block font-bold text-white leading-tight">{item.promotion.titulo}</span>
                          <span className="block text-[10px] text-gray-500 font-mono">Cantidad: {item.cantidad} unidades</span>
                        </div>
                        <span className="font-bold font-mono text-[#cc0000] shrink-0">
                          Bs. {(item.promotion.precio_bs * item.cantidad).toFixed(2)}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-4 border-t border-[#21283a] space-y-2">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Subtotal:</span>
                    <span className="font-mono">Bs. {subtotalBs.toFixed(2)}</span>
                  </div>
                  
                  {descuentoBs > 0 && (
                    <div className="flex justify-between text-xs text-[#ff3333]">
                      <span>Descuento aplicado:</span>
                      <span className="font-mono font-semibold">- Bs. {descuentoBs.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-baseline pt-2 border-t border-[#21283a]">
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Total Neto:</span>
                    <span className="text-xl font-bold font-mono text-[#cc0000] drop-shadow-[0_0_10px_rgba(204,0,0,0.25)]">Bs. {totalBs.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>

      </div>
    </div>
  );
}
