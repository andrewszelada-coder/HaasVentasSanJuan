'use client';

import React, { useState, useEffect, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { crearPedidoAction } from '@/app/actions';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  ArrowLeft, ArrowRight, Check, User, MapPin, CreditCard, 
  Receipt, Landmark, BadgePercent, Loader2, Home, Building2, Briefcase, Building, Map
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
    tipo_venta?: string;
  };
  cantidad: number;
}

const QRS: Record<string, string> = {
  "Super Haas Av. Heroínas Esq. Lanza": "https://xymvwsnyvpupejjcsuxz.supabase.co/storage/v1/object/public/qrs/qr_HeroinasHaas.jpg",
  "Almacén Haas Av. América": "https://xymvwsnyvpupejjcsuxz.supabase.co/storage/v1/object/public/qrs/qr_americahaas.jpg"
};

export default function CheckoutStepperPage() {
  const supabase = createClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isPending, startTransition] = useTransition();
  const [hasSession, setHasSession] = useState(false);
  const router = useRouter();

  // Paso 1: Identidad y Facturación (Invitado por defecto)
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [email, setEmail] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('NIT');
  const [numeroDocumento, setNumeroDocumento] = useState('');

  // --- ESTADOS CONDICIONALES ADICIONALES (CI, NIT, Carnet Extranjero) ---
  const [complemento, setComplemento] = useState('');
  const [paisOrigen, setPaisOrigen] = useState('');

  // Paso 2: Logística y Entrega
  const [sucursalRecojo, setSucursalRecojo] = useState('Super Haas Av. Heroínas Esq. Lanza');
  const [telefono, setTelefono] = useState('');
  
  // --- ESTADOS LOCALES PARA VALIDACIONES EN TIEMPO REAL (UX Inline) ---
  const [errorNombres, setErrorNombres] = useState('');
  const [errorApellidos, setErrorApellidos] = useState('');
  const [errorEmail, setErrorEmail] = useState('');
  const [errorNit, setErrorNit] = useState('');
  const [errorPaisOrigen, setErrorPaisOrigen] = useState('');
  const [errorTelefono, setErrorTelefono] = useState('');

  // --- FUNCIONES DE VALIDACIÓN ---
  const validateNombres = (val: string) => {
    if (!val.trim()) {
      setErrorNombres('El nombre es obligatorio.');
      return false;
    }
    setErrorNombres('');
    return true;
  };

  const validateApellidos = (val: string) => {
    if (!val.trim()) {
      setErrorApellidos('El apellido es obligatorio.');
      return false;
    }
    setErrorApellidos('');
    return true;
  };

  const validateEmail = (val: string) => {
    if (!val) {
      setErrorEmail('');
      return true;
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(val)) {
      setErrorEmail('El formato del correo electrónico ingresado no es válido.');
      return false;
    }
    setErrorEmail('');
    return true;
  };

  const validateNit = (val: string, typeDoc: string) => {
    if (!val) {
      setErrorNit('');
      return true;
    }
    if (typeDoc && typeDoc.toUpperCase() === 'NIT') {
      const nitRegex = /^\d+$/;
      if (!nitRegex.test(val)) {
        setErrorNit('El número de NIT debe contener únicamente dígitos del 0 al 9 sin caracteres especiales.');
        return false;
      }
    }
    setErrorNit('');
    return true;
  };

  const validatePaisOrigen = (val: string, typeDoc: string) => {
    if (typeDoc === 'Carnet Extranjero' && !val.trim()) {
      setErrorPaisOrigen('El país de origen es obligatorio para extranjeros.');
      return false;
    }
    setErrorPaisOrigen('');
    return true;
  };

  const validateTelefono = (val: string) => {
    if (!val) {
      setErrorTelefono('El teléfono es obligatorio.');
      return false;
    }
    const boliviaPhoneRegex = /^[67]\d{7}$/;
    if (!boliviaPhoneRegex.test(val)) {
      setErrorTelefono('El número de teléfono de contacto debe comenzar con 6 o 7 y tener exactamente 8 dígitos.');
      return false;
    }
    setErrorTelefono('');
    return true;
  };

  // Función para resetear campos al cambiar tipo de documento (conmutación segura)
  const handleTipoDocumentoChange = (newVal: string) => {
    setTipoDocumento(newVal);
    setNumeroDocumento('');
    setRazonSocial('');
    setComplemento('');
    setPaisOrigen('');
    setErrorNit('');
    setErrorPaisOrigen('');
  };

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setHasSession(true);
        const nameVal = user.user_metadata?.nombres || '';
        const lastNameVal = user.user_metadata?.apellidos || '';
        const emailVal = user.email || '';
        const docTypeVal = user.user_metadata?.tipo_documento || 'NIT';
        const nitVal = user.user_metadata?.numero_documento || user.user_metadata?.nit || '';
        const companyVal = user.user_metadata?.razon_social || user.user_metadata?.empresa || '';
        const compVal = user.user_metadata?.complemento || '';
        const countryVal = user.user_metadata?.pais_origen || '';
        
        setNombres(nameVal);
        setApellidos(lastNameVal);
        setEmail(emailVal);
        setTipoDocumento(docTypeVal);
        setNumeroDocumento(nitVal);
        setRazonSocial(companyVal);
        setComplemento(compVal);
        setPaisOrigen(countryVal);

        // Validar campos autocompletados
        if (nameVal) validateNombres(nameVal);
        if (lastNameVal) validateApellidos(lastNameVal);
        if (emailVal) validateEmail(emailVal);
        if (nitVal) validateNit(nitVal, docTypeVal);
        if (countryVal) validatePaisOrigen(countryVal, docTypeVal);
      } else {
        setHasSession(false);
      }
    }
    checkAuth();
  }, []);



  // Paso 3: Pago y Cierre
  const [metodoPago] = useState('Transferencia QR');

  useEffect(() => {
    const savedCart = localStorage.getItem('haas_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch {}
    }
  }, []);

  const isAutoDiscountActive = () => {
    const today = new Date();
    const limitDate = new Date('2026-06-17T23:59:59');
    return today <= limitDate;
  };

  const subtotalBs = Number(cart.reduce((sum, item) => sum + Number((item.promotion.precio_bs * item.cantidad).toFixed(2)), 0).toFixed(2));
  const descuentoBs = isAutoDiscountActive() ? Number((subtotalBs * 0.10).toFixed(2)) : 0;
  const totalBs = Number(Math.max(0, subtotalBs - descuentoBs).toFixed(2));
  const cuponAplicado = isAutoDiscountActive() ? 'AUTO_10' : '';

  // --- REGLAS DE BOTÓN DESACTIVADO DINÁMICO SEGÚN TIPO DE DOCUMENTO ---
  const isStep1Invalid = !nombres || !apellidos ||
                         (tipoDocumento === 'Carnet Extranjero' && numeroDocumento && !paisOrigen) ||
                         !!errorNombres || !!errorApellidos || !!errorEmail || !!errorNit ||
                         (tipoDocumento === 'Carnet Extranjero' && numeroDocumento && !!errorPaisOrigen);

  const isStep2Invalid = !telefono || !!errorTelefono;

  const nextStep = () => {
    if (currentStep === 1) {
      if (isStep1Invalid) {
        toast.error('Por favor, complete correctamente todos los campos obligatorios de Identidad y Facturación.');
        return;
      }
    }

    if (currentStep === 2) {
      if (isStep2Invalid) {
        toast.error('Por favor, ingrese su teléfono de contacto válido.');
        return;
      }
    }

    setCurrentStep(prev => Math.min(3, prev + 1));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const handleCheckoutSubmit = () => {
    if (cart.length === 0) {
      toast.error('El carrito de compras está vacío.');
      return;
    }

    if (isStep1Invalid || isStep2Invalid) {
      toast.error('Existen errores en los datos del formulario. Por favor, revíselos.');
      return;
    }

    const itemsPayload = cart.map(item => ({
      promoId: item.promotion.id,
      cantidad: item.cantidad
    }));

    startTransition(async () => {
      const billingPayload = {
        nombres: `${nombres} ${apellidos}`,
        tipoDoc: tipoDocumento,
        numeroDoc: numeroDocumento
      };

      const logisticaPayload = {
        tipoUbicacion: 'Sucursal',
        direccion: 'Recojo en sucursal',
        latitud: 0,
        longitud: 0,
        telefono: telefono,
        indicaciones: `Recojo en sucursal: ${sucursalRecojo}`
      };

      const financieroPayload = {
        cuponAplicado,
        descuentoBs,
        metodoPago
      };

      const result = await crearPedidoAction(
        sucursalRecojo,
        '2026-06-23',
        `Recojo en sucursal: ${sucursalRecojo}`,
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
        const orderData = {
          orderId: result.pedidoId,
          totalBs: totalBs,
          razonSocial: razonSocial || `${nombres} ${apellidos}`,
          nit: numeroDocumento,
          direccion: 'Recojo en sucursal',
          metodoPago: metodoPago,
          email: email,
          sucursalSeleccionada: sucursalRecojo,
          celular: telefono,
          detalleItems: cart.map(item => `${item.cantidad}x ${item.promotion.titulo}`).join(', ')
        };
        sessionStorage.setItem('haas_success_order', JSON.stringify(orderData));
        localStorage.removeItem('haas_cart');
        
        toast.success("¡Pedido registrado exitosamente en fábrica!");
        router.push('/checkout/success');
      }
    });
  };

  const stepHeaders = [
    { title: 'Identidad y Facturación', desc: 'Datos Personales', icon: <User className="w-4 h-4" /> },
    { title: 'Reserva y Recojo', desc: 'Sucursal y Contacto', icon: <MapPin className="w-4 h-4" /> },
    { title: 'Pago y Cierre', desc: 'QR y Confirmación', icon: <CreditCard className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 pb-24 font-sans selection:bg-[#cc0000] selection:text-white">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 transition-all">
        <div className="max-w-5xl mx-auto px-6 h-16 flex justify-between items-center">
          <Link href="/reservas" className="text-slate-500 hover:text-[#cc0000] flex items-center gap-1.5 text-sm font-semibold transition-colors">
            <ArrowLeft className="w-4 h-4 text-[#cc0000]" />
            Volver al Catálogo
          </Link>
          <span className="font-extrabold text-xs tracking-widest text-slate-950 uppercase font-mono">HAAS SAN JUAN • CHECKOUT GUEST</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 mt-10">
        {/* Stepper Header */}
        <div className="grid grid-cols-3 gap-4 mb-10 select-none">
          {stepHeaders.map((step, idx) => {
            const stepNum = idx + 1;
            const isCompleted = currentStep > stepNum;
            const isActive = currentStep === stepNum;

            return (
              <div 
                key={step.title}
                className={`border rounded-2xl p-4 transition-all duration-300 flex items-center gap-3.5 bg-white ${
                  isActive 
                    ? 'border-[#cc0000] shadow-md shadow-[#cc0000]/5 scale-[1.01]' 
                    : isCompleted 
                    ? 'border-emerald-250 bg-emerald-50/20' 
                    : 'border-slate-200 opacity-60'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                  isActive 
                    ? 'bg-[#cc0000] text-white' 
                    : isCompleted 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-slate-100 text-slate-400'
                }`}>
                  {isCompleted ? <Check className="w-4 h-4" /> : step.icon}
                </div>
                <div className="hidden md:block space-y-0.5">
                  <span className={`block text-[10px] font-bold uppercase tracking-wider ${
                    isActive ? 'text-[#cc0000]' : isCompleted ? 'text-emerald-700' : 'text-slate-400'
                  }`}>
                    {step.desc}
                  </span>
                  <span className="block text-xs font-black text-slate-800 uppercase tracking-tight">
                    {step.title}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Form Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Side: Dynamic Forms */}
          <div className="lg:col-span-8">
            <Card className="border border-slate-200 bg-white rounded-3xl shadow-xl relative overflow-hidden p-6 md:p-8">
              <div className="h-[3px] bg-[#cc0000] absolute top-0 left-0 right-0" />
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                >
                  
                  {/* PASO 1: IDENTIDAD Y FACTURACIÓN */}
                  {currentStep === 1 && (
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Paso 1: Identidad y Facturación</h2>
                        <p className="text-xs text-slate-500 font-medium">Ingrese sus datos personales básicos para la emisión del comprobante y registro.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="names" className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Nombres *</Label>
                          <Input
                            id="names"
                            value={nombres}
                            onChange={e => {
                              const val = e.target.value;
                              setNombres(val);
                              validateNombres(val);
                            }}
                            placeholder="Juan"
                            className={`bg-white text-black border-gray-300 placeholder:text-gray-400 focus:ring-[#cc0000] focus:border-[#cc0000] rounded-lg text-sm transition-all ${
                              errorNombres ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
                            }`}
                          />
                          {errorNombres && (
                            <p className="text-[10px] text-red-500 font-bold tracking-tight mt-0.5">{errorNombres}</p>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="lastNames" className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Apellidos *</Label>
                          <Input
                            id="lastNames"
                            value={apellidos}
                            onChange={e => {
                              const val = e.target.value;
                              setApellidos(val);
                              validateApellidos(val);
                            }}
                            placeholder="Pérez"
                            className={`bg-white text-black border-gray-300 placeholder:text-gray-400 focus:ring-[#cc0000] focus:border-[#cc0000] rounded-lg text-sm transition-all ${
                              errorApellidos ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
                            }`}
                          />
                          {errorApellidos && (
                            <p className="text-[10px] text-red-500 font-bold tracking-tight mt-0.5">{errorApellidos}</p>
                          )}
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                          <Label htmlFor="email" className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Correo Electrónico (Opcional)</Label>
                          <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={e => {
                              const val = e.target.value;
                              setEmail(val);
                              validateEmail(val);
                            }}
                            placeholder="juan.perez@example.com"
                            className={`bg-white text-black border-gray-300 placeholder:text-gray-400 focus:ring-[#cc0000] focus:border-[#cc0000] rounded-lg text-sm transition-all ${
                              errorEmail ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
                            }`}
                          />
                          {errorEmail && (
                            <p className="text-[10px] text-red-500 font-bold tracking-tight mt-0.5">{errorEmail}</p>
                          )}
                        </div>

                        {/* Tipo de Documento Selector */}
                        <div className="space-y-1.5 flex flex-col">
                          <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Tipo Documento (Opcional)</Label>
                          <select
                            value={tipoDocumento}
                            onChange={e => handleTipoDocumentoChange(e.target.value)}
                            className="bg-white text-black border border-gray-300 rounded-lg p-2 text-sm focus:ring-[#cc0000] focus:border-[#cc0000] focus:outline-none font-bold"
                          >
                            <option value="">Sin Documento</option>
                            <option value="CI">Carnet de Identidad (CI)</option>
                            <option value="NIT">Número de Identificación Tributaria (NIT)</option>
                            <option value="Carnet Extranjero">Carnet de Extranjero</option>
                          </select>
                        </div>

                        {/* Número Documento */}
                        <div className="space-y-1.5">
                           <Label htmlFor="nit" className="text-xs font-bold text-slate-500 uppercase tracking-widest block">
                            {tipoDocumento === 'NIT' ? 'NIT (Opcional)' : tipoDocumento === 'CI' ? 'CI / Nro Documento (Opcional)' : 'Nro Documento (Opcional)'}
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id="nit"
                              value={numeroDocumento}
                              onChange={e => {
                                const val = e.target.value;
                                setNumeroDocumento(val);
                                validateNit(val, tipoDocumento);
                              }}
                              placeholder={tipoDocumento === 'NIT' ? '1020405060' : '8463524'}
                              className={`bg-white text-black border-gray-300 placeholder:text-gray-400 focus:ring-[#cc0000] focus:border-[#cc0000] rounded-lg text-sm transition-all flex-1 ${
                                errorNit ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
                              }`}
                            />
                            
                            {/* Complemento de CI si aplica */}
                            {tipoDocumento === 'CI' && (
                              <Input
                                value={complemento}
                                onChange={e => setComplemento(e.target.value.toUpperCase())}
                                placeholder="Comp (e.g. 1A)"
                                maxLength={5}
                                className="bg-white text-black border-gray-300 placeholder:text-gray-450 focus:ring-[#cc0000] focus:border-[#cc0000] rounded-lg text-sm w-28 text-center font-bold"
                              />
                            )}
                          </div>
                          {errorNit && (
                            <p className="text-[10px] text-red-500 font-bold tracking-tight mt-0.5">{errorNit}</p>
                          )}
                        </div>

                        {/* Razón Social para NIT */}
                        {tipoDocumento === 'NIT' && (
                          <div className="space-y-1.5 md:col-span-2">
                            <Label htmlFor="company" className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Razón Social (Opcional)</Label>
                            <Input
                              id="company"
                              value={razonSocial}
                              onChange={e => setRazonSocial(e.target.value)}
                              placeholder="Juan Pérez SRL"
                              className="bg-white text-black border-gray-300 placeholder:text-gray-400 focus:ring-[#cc0000] focus:border-[#cc0000] rounded-lg text-sm transition-all"
                            />
                          </div>
                        )}

                        {/* País de Origen Obligatorio para Extranjeros */}
                        {tipoDocumento === 'Carnet Extranjero' && (
                          <div className="space-y-1.5 md:col-span-2">
                            <Label htmlFor="country" className="text-xs font-bold text-slate-500 uppercase tracking-widest block">País de Origen *</Label>
                            <Input
                              id="country"
                              value={paisOrigen}
                              onChange={e => {
                                const val = e.target.value;
                                setPaisOrigen(val);
                                validatePaisOrigen(val, tipoDocumento);
                              }}
                              placeholder="Argentina"
                              className={`bg-white text-black border-gray-300 placeholder:text-gray-400 focus:ring-[#cc0000] focus:border-[#cc0000] rounded-lg text-sm transition-all ${
                                errorPaisOrigen ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
                              }`}
                            />
                            {errorPaisOrigen && (
                              <p className="text-[10px] text-red-500 font-bold tracking-tight mt-0.5">{errorPaisOrigen}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* PASO 2: RESERVA Y RECOJO */}
                  {currentStep === 2 && (
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Paso 2: Reserva y Recojo</h2>
                        <p className="text-xs text-slate-500 font-medium">Seleccione la sucursal física de su preferencia e ingrese su número celular de contacto.</p>
                      </div>

                      <div className="space-y-4">
                        {/* Selector de Sucursal de Recojo */}
                        <div className="space-y-1.5 flex flex-col">
                          <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Sucursal de Recojo *</Label>
                          <select
                            value={sucursalRecojo}
                            onChange={e => setSucursalRecojo(e.target.value)}
                            className="w-full bg-white text-black border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-[#cc0000] focus:border-[#cc0000] focus:outline-none font-bold"
                          >
                            <option value="Super Haas Av. Heroínas Esq. Lanza">Super Haas Av. Heroínas Esq. Lanza</option>
                            <option value="Almacén Haas Av. América">Almacén Haas Av. América</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="tel" className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Número Celular de Contacto *</Label>
                          <Input
                            id="tel"
                            type="tel"
                            value={telefono}
                            onChange={e => {
                              const val = e.target.value;
                              setTelefono(val);
                              validateTelefono(val);
                            }}
                            placeholder="70012345"
                            className={`bg-white text-black border-gray-300 placeholder:text-gray-400 focus:ring-[#cc0000] focus:border-[#cc0000] rounded-lg text-sm transition-all ${
                              errorTelefono ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
                            }`}
                          />
                          {errorTelefono && (
                            <p className="text-[10px] text-red-500 font-bold tracking-tight mt-0.5">{errorTelefono}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PASO 3: PAGO Y CIERRE */}
                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Paso 3: Pago y Cierre</h2>
                        <p className="text-xs text-slate-500 font-medium">Realice el pago de su reserva escaneando el código QR correspondiente a la sucursal elegida.</p>
                      </div>

                      {/* QR de Pago Dinámico con URLs de Supabase Storage */}
                      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 text-center space-y-4 max-w-sm mx-auto shadow-sm animate-fade-in">
                        <span className="block text-xs font-bold text-gray-900 uppercase tracking-wider">
                          QR de Pago - Transferencia Bancaria
                        </span>
                        <div className="bg-white border-4 border-white p-4 rounded-2xl inline-block shadow-md">
                          <img
                            src={QRS[sucursalRecojo] || QRS["Super Haas Av. Heroínas Esq. Lanza"]}
                            alt="QR de Pago"
                            className="w-48 h-48 mx-auto object-contain rounded-xl"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <span className="block text-[10px] text-emerald-600 font-bold uppercase tracking-wider bg-emerald-50 border border-emerald-100 rounded-full py-1 px-3 w-fit mx-auto">
                            Pago 100% mediante QR a la sucursal seleccionada
                          </span>
                          <span className="block text-[10px] text-gray-500 font-bold">
                            Sucursal de Recojo: {sucursalRecojo}
                          </span>
                          <span className="block text-sm font-black text-[#cc0000] font-mono">
                            Monto a transferir: Bs. {totalBs.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Navigation Footer */}
                  <div className="mt-8 pt-6 border-t border-slate-200 flex justify-between items-center">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={prevStep}
                      disabled={currentStep === 1 || isPending}
                      className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all flex items-center gap-1 rounded-lg text-xs cursor-pointer font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ArrowLeft className="w-4 h-4 text-[#cc0000]" /> Anterior
                    </Button>

                    {currentStep < 3 ? (
                      <Button
                        type="button"
                        onClick={nextStep}
                        disabled={
                          (currentStep === 1 && isStep1Invalid) ||
                          (currentStep === 2 && isStep2Invalid)
                        }
                        className="bg-[#cc0000] hover:bg-[#a30000] text-white text-xs font-bold uppercase tracking-wider py-2.5 px-5 rounded-lg flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Siguiente <ArrowRight className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={handleCheckoutSubmit}
                        disabled={isPending || isStep1Invalid || isStep2Invalid}
                        className="bg-[#cc0000] hover:bg-[#a30000] text-white text-xs font-bold uppercase tracking-wider py-2.5 px-6 rounded-lg flex items-center gap-1.5 shadow-lg shadow-[#cc0000]/10 transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
            <Card className="border border-slate-200 bg-white rounded-3xl shadow-xl relative overflow-hidden">
              <div className="h-[3px] bg-[#cc0000] absolute top-0 left-0 right-0" />
              <CardHeader className="pb-3 border-b border-slate-100 p-6">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-widest block font-mono">
                  Resumen de Compra
                </span>
              </CardHeader>
              
              <CardContent className="p-6 space-y-4">
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {cart.length === 0 ? (
                    <div className="text-center py-4 text-slate-400 text-xs font-mono">
                      Tu carrito está vacío.
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.promotion.id} className="flex justify-between items-start text-xs border-b border-slate-100 pb-2.5 last:border-0 last:pb-0">
                        <div className="space-y-0.5 max-w-[70%]">
                          <span className="block font-bold text-slate-900 leading-tight">{item.promotion.titulo}</span>
                          <span className="block text-[10px] text-slate-400 font-mono">
                            Cantidad: {item.cantidad} {item.promotion.tipo_venta === 'A granel (Kg)' ? 'Kg' : 'Unidades'}
                          </span>
                        </div>
                        <span className="font-bold font-mono text-[#cc0000] shrink-0">
                          Bs. {(item.promotion.precio_bs * item.cantidad).toFixed(2)}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Subtotal:</span>
                    <span className="font-mono">Bs. {subtotalBs.toFixed(2)}</span>
                  </div>
                  
                  {descuentoBs > 0 && (
                    <div className="flex justify-between text-xs text-emerald-600 font-bold">
                      <span>Descuento aplicado:</span>
                      <span className="font-mono font-semibold">- Bs. {descuentoBs.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-baseline pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Total Neto:</span>
                    <span className="text-xl font-black font-mono text-[#cc0000]">Bs. {totalBs.toFixed(2)}</span>
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
