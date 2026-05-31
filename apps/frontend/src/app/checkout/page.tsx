'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { crearPedidoAction, loginAction } from '@/app/actions';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  ArrowLeft, ArrowRight, Check, User, MapPin, CreditCard, 
  Receipt, Landmark, BadgePercent, Map, ShieldAlert, Loader2 
} from 'lucide-react';

interface CartItem {
  promotion: {
    id: string;
    titulo: string;
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

  // Paso 1: Identificación
  const [isGuest, setIsGuest] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  const handleFixLocation = () => {
    // Simular geolocalización en coordenadas de La Paz, Bolivia
    const simulatedLat = -16.5000 + (Math.random() - 0.5) * 0.02;
    const simulatedLng = -68.1500 + (Math.random() - 0.5) * 0.02;
    
    setLatitud(simulatedLat);
    setLongitud(simulatedLng);
    setMapFixed(true);
    toast.success('¡Ubicación GPS fijada en el mapa con éxito!');
  };

  const nextStep = () => {
    if (currentStep === 1) {
      if (isGuest && (!guestName || !guestEmail)) {
        toast.error('Por favor, complete sus datos de identificación como invitado.');
        return;
      }
      if (!isGuest && (!email || !password)) {
        toast.error('Por favor, ingrese sus credenciales de socio.');
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
        toast.error('Por favor, fije su ubicación en el mapa de coordenadas.');
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
        'Sucursal Central', // sucursal
        '2026-06-23', // fecha campaña
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
        
        // Redirigir a pantalla de éxito
        router.push('/checkout/success');
      }
    });
  };

  const stepHeaders = [
    { title: 'Identificación', desc: 'Login o Invitado', icon: <User className="w-4 h-4" /> },
    { title: 'Facturación', desc: 'Datos Tributarios', icon: <Receipt className="w-4 h-4" /> },
    { title: 'Entrega', desc: 'Ubicación y Mapas', icon: <MapPin className="w-4 h-4" /> },
    { title: 'Pago y Resumen', desc: 'Cupón y Confirmación', icon: <CreditCard className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 h-16 flex justify-between items-center">
          <Link href="/reservas" className="text-slate-500 hover:text-[#166534] flex items-center gap-1.5 text-sm font-semibold transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Volver al Catálogo
          </Link>
          <span className="font-bold text-sm tracking-tight text-slate-900">HAAS SAN JUAN • CHECKOUT</span>
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
                  isCompleted || isActive ? 'bg-[#166534]' : 'bg-slate-200'
                }`} />
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isCompleted 
                      ? 'bg-[#166534] text-white' 
                      : isActive 
                      ? 'border-2 border-[#166534] text-[#166534]' 
                      : 'border-2 border-slate-200 text-slate-400'
                  }`}>
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : stepNum}
                  </div>
                  <div className="hidden md:block">
                    <span className={`block text-xs font-bold leading-none ${
                      isActive ? 'text-slate-900' : 'text-slate-400'
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
            <Card className="border border-slate-100 bg-white rounded-2xl overflow-hidden shadow-sm">
              
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
                        <h2 className="text-xl font-bold text-slate-900">Paso 1: Identificación de Compra</h2>
                        <p className="text-xs text-slate-400">Seleccione si desea comprar como socio registrado o invitado.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => setIsGuest(true)}
                          className={`p-4 border rounded-xl flex flex-col items-center justify-center gap-2 transition-all text-center ${
                            isGuest 
                              ? 'border-[#166534] bg-emerald-50/10 text-[#166534] ring-1 ring-[#166534]' 
                              : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          <span className="font-bold text-sm">Comprar como Invitado</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsGuest(false)}
                          className={`p-4 border rounded-xl flex flex-col items-center justify-center gap-2 transition-all text-center ${
                            !isGuest 
                              ? 'border-[#166534] bg-emerald-50/10 text-[#166534] ring-1 ring-[#166534]' 
                              : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          <span className="font-bold text-sm">Iniciar Sesión (Socio B2B)</span>
                        </button>
                      </div>

                      {isGuest ? (
                        <div className="space-y-4 pt-2">
                          <div className="space-y-1.5">
                            <Label htmlFor="guestName" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre Completo</Label>
                            <Input
                              id="guestName"
                              value={guestName}
                              onChange={e => setGuestName(e.target.value)}
                              placeholder="Juan Pérez"
                              className="border-slate-200 rounded-lg"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="guestEmail" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Correo Electrónico</Label>
                            <Input
                              id="guestEmail"
                              type="email"
                              value={guestEmail}
                              onChange={e => setGuestEmail(e.target.value)}
                              placeholder="juan.perez@gmail.com"
                              className="border-slate-200 rounded-lg"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 pt-2">
                          <div className="space-y-1.5">
                            <Label htmlFor="email" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Correo Corporativo</Label>
                            <Input
                              id="email"
                              type="email"
                              value={email}
                              onChange={e => setEmail(e.target.value)}
                              placeholder="socio@haas.com.bo"
                              className="border-slate-200 rounded-lg"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="pass" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contraseña</Label>
                            <Input
                              id="pass"
                              type="password"
                              value={password}
                              onChange={e => setPassword(e.target.value)}
                              placeholder="••••••••"
                              className="border-slate-200 rounded-lg"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* STEP 2: FACTURACIÓN */}
                  {currentStep === 2 && (
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <h2 className="text-xl font-bold text-slate-900">Paso 2: Datos de Facturación</h2>
                        <p className="text-xs text-slate-400">Complete los datos que aparecerán en la factura de la reserva.</p>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="razon" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Razón Social / Nombre Completo *</Label>
                          <Input
                            id="razon"
                            value={razonSocial}
                            onChange={e => setRazonSocial(e.target.value)}
                            placeholder="Pérez Distribuidora S.R.L."
                            required
                            className="border-slate-200 rounded-lg"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo de Documento *</Label>
                            <select
                              value={tipoDocumento}
                              onChange={e => setTipoDocumento(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm text-slate-800 focus:ring-1 focus:ring-[#166534] focus:outline-none"
                            >
                              <option value="NIT">NIT (Número de Identificación Tributaria)</option>
                              <option value="CI">C.I. (Carnet de Identidad)</option>
                              <option value="Pasaporte">Pasaporte</option>
                              <option value="C.E.">C.E. (Carnet de Extranjero)</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="docNum" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Número de Documento *</Label>
                            <Input
                              id="docNum"
                              value={numeroDocumento}
                              onChange={e => setNumeroDocumento(e.target.value)}
                              placeholder="1020405060"
                              required
                              className="border-slate-200 rounded-lg"
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
                        <h2 className="text-xl font-bold text-slate-900">Paso 3: Logística y Dirección de Despacho</h2>
                        <p className="text-xs text-slate-400">Configure los datos de entrega física para la flota refrigerada de Haas.</p>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo de Ubicación *</Label>
                            <select
                              value={tipoUbicacion}
                              onChange={e => setTipoUbicacion(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm text-slate-800 focus:ring-1 focus:ring-[#166534] focus:outline-none"
                            >
                              <option value="Casa">Casa</option>
                              <option value="Oficina">Oficina</option>
                              <option value="Departamento">Departamento</option>
                              <option value="Condominio">Condominio</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="tel" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Teléfono de Contacto (WhatsApp) *</Label>
                            <Input
                              id="tel"
                              type="tel"
                              value={telefono}
                              onChange={e => setTelefono(e.target.value)}
                              placeholder="70012345"
                              required
                              className="border-slate-200 rounded-lg"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="dir" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dirección Escrita Completa *</Label>
                          <Input
                            id="dir"
                            value={direccion}
                            onChange={e => setDireccion(e.target.value)}
                            placeholder="Av. Arce, Edificio Multicentro, Piso 12"
                            required
                            className="border-slate-200 rounded-lg"
                          />
                        </div>

                        {/* MAP SIMULATOR COMPONENT */}
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <Map className="w-3.5 h-3.5 text-[#166534]" /> Geolocalización Satelital (Entrega Fría)
                          </Label>
                          
                          <div className="relative border border-slate-200 rounded-xl overflow-hidden h-40 bg-slate-100 flex flex-col items-center justify-center p-4">
                            {/* Grilla decorativa que simula un mapa satelital */}
                            <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1.5px,transparent_1.5px)] [background-size:16px_16px] opacity-70" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-200/50 via-transparent to-transparent" />
                            
                            <div className="relative z-10 flex flex-col items-center gap-2">
                              <MapPin className={`w-8 h-8 transition-transform duration-300 ${
                                mapFixed ? 'text-[#9A3412] scale-110 drop-shadow' : 'text-slate-400 animate-bounce'
                              }`} />
                              {mapFixed ? (
                                <div className="text-center space-y-0.5">
                                  <span className="block text-[10px] font-bold text-slate-800 font-mono">
                                    UBICACIÓN FIJADA
                                  </span>
                                  <span className="block text-[9px] text-slate-500 font-mono">
                                    Lat: {latitud?.toFixed(6)} / Lng: {longitud?.toFixed(6)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-mono">Presione el botón para geolocalizar</span>
                              )}
                            </div>
                            
                            <Button
                              type="button"
                              onClick={handleFixLocation}
                              className="absolute bottom-3 right-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-[10px] font-bold h-7 py-1 px-3 shadow rounded-lg flex items-center gap-1 transition-colors"
                            >
                              Fijar mi ubicación actual
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="ind" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Indicaciones Adicionales para el Repartidor</Label>
                          <textarea
                            id="ind"
                            rows={2}
                            value={indicaciones}
                            onChange={e => setIndicaciones(e.target.value)}
                            placeholder="Tocar el timbre verde, dejar en portería, etc."
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm text-slate-800 focus:ring-1 focus:ring-[#166534] focus:outline-none placeholder:text-slate-400"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 4: RESUMEN, CUPONES Y PAGO */}
                  {currentStep === 4 && (
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <h2 className="text-xl font-bold text-slate-900">Paso 4: Método de Pago y Cupones</h2>
                        <p className="text-xs text-slate-400">Configure su método de pago y aplique cupones antes de finalizar.</p>
                      </div>

                      {/* Coupon Box */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                          <BadgePercent className="w-3.5 h-3.5 text-[#166534]" /> ¿Tiene un Cupón de Descuento?
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="SANJUAN10"
                            value={cuponInput}
                            onChange={e => setCuponInput(e.target.value)}
                            className="border-slate-200 rounded-lg max-w-[200px]"
                          />
                          <Button
                            type="button"
                            onClick={applyCoupon}
                            className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg"
                          >
                            Aplicar
                          </Button>
                        </div>
                        {cuponAplicado && (
                          <span className="block text-[10px] text-emerald-800 font-bold bg-emerald-50 py-0.5 px-2 rounded-full w-max">
                            Cupón SANJUAN10 Activo (-10% OFF)
                          </span>
                        )}
                      </div>

                      {/* Payment Method Selector */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Método de Pago Preferido *
                        </Label>
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            type="button"
                            onClick={() => setMetodoPago('Transferencia QR')}
                            className={`p-4 border rounded-xl flex flex-col items-center justify-center gap-2.5 transition-all text-center ${
                              metodoPago === 'Transferencia QR' 
                                ? 'border-[#9A3412] bg-orange-50/10 text-[#9A3412] ring-1 ring-[#9A3412]' 
                                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            <Landmark className="w-5 h-5 shrink-0" />
                            <span className="font-bold text-xs">Transferencia QR</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setMetodoPago('Efectivo')}
                            className={`p-4 border rounded-xl flex flex-col items-center justify-center gap-2.5 transition-all text-center ${
                              metodoPago === 'Efectivo' 
                                ? 'border-[#9A3412] bg-orange-50/10 text-[#9A3412] ring-1 ring-[#9A3412]' 
                                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            <CreditCard className="w-5 h-5 shrink-0" />
                            <span className="font-bold text-xs">Efectivo contra entrega</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Navigation Footer */}
                  <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={prevStep}
                      disabled={currentStep === 1 || isPending}
                      className="text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1 rounded-lg text-xs"
                    >
                      <ArrowLeft className="w-4 h-4" /> Anterior
                    </Button>

                    {currentStep < 4 ? (
                      <Button
                        type="button"
                        onClick={nextStep}
                        className="bg-[#166534] hover:bg-[#114f27] text-white text-xs font-semibold py-2 px-5 rounded-lg flex items-center gap-1"
                      >
                        Siguiente <ArrowRight className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={handleCheckoutSubmit}
                        disabled={isPending}
                        className="bg-[#9A3412] hover:bg-[#7c2a0e] text-white text-xs font-semibold py-2 px-6 rounded-lg flex items-center gap-1.5"
                      >
                        {isPending ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Confirmando pedido...
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
            <Card className="border border-slate-100 bg-white rounded-2xl shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Resumen de Compra
                </CardTitle>
              </CardHeader>
              
              <CardContent className="p-6 space-y-4">
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {cart.length === 0 ? (
                    <div className="text-center py-4 text-slate-400 text-xs font-mono">
                      Tu carrito está vacío.
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.promotion.id} className="flex justify-between items-start text-xs border-b border-slate-50 pb-2.5 last:border-0 last:pb-0">
                        <div className="space-y-0.5 max-w-[70%]">
                          <span className="block font-bold text-slate-800 leading-tight">{item.promotion.titulo}</span>
                          <span className="block text-[10px] text-slate-400 font-mono">Cantidad: {item.cantidad}</span>
                        </div>
                        <span className="font-bold font-mono text-[#9A3412]">
                          Bs. {(item.promotion.precio_bs * item.cantidad).toFixed(2)}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Subtotal:</span>
                    <span className="font-mono">Bs. {subtotalBs.toFixed(2)}</span>
                  </div>
                  
                  {descuentoBs > 0 && (
                    <div className="flex justify-between text-xs text-emerald-800">
                      <span>Descuento aplicado:</span>
                      <span className="font-mono font-semibold">- Bs. {descuentoBs.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-baseline pt-2 border-t border-slate-50">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Neto:</span>
                    <span className="text-xl font-bold font-mono text-[#9A3412]">Bs. {totalBs.toFixed(2)}</span>
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
