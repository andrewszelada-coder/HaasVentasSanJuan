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
  };
  cantidad: number;
}

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

  // Paso 2: Logística y Entrega
  const [direccion, setDireccion] = useState('');

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setHasSession(true);
        setNombres(user.user_metadata?.nombres || '');
        setApellidos(user.user_metadata?.apellidos || '');
        setEmail(user.email || '');
        setNumeroDocumento(user.user_metadata?.nit || '');
        setRazonSocial(user.user_metadata?.empresa || '');
        setTipoDocumento('NIT');
      } else {
        setHasSession(false);
      }
    }
    checkAuth();
  }, []);
  const [tipoUbicacion, setTipoUbicacion] = useState('Casa');
  const [telefono, setTelefono] = useState('');
  const [indicaciones, setIndicaciones] = useState('');
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [gpsFailed, setGpsFailed] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [markerInstance, setMarkerInstance] = useState<any>(null);
  const mapRef = React.useRef<HTMLDivElement>(null);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Tu navegador no soporta geolocalización. Entrada manual requerida.');
      setGpsFailed(true);
      return;
    }

    toast.info('Obteniendo ubicación actual...');
    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLat = position.coords.latitude;
          const newLng = position.coords.longitude;
          setCoords({
            lat: newLat,
            lng: newLng
          });
          setGpsFailed(false);
          toast.success('¡Ubicación satelital obtenida con éxito!');

          if (mapInstance && markerInstance) {
            mapInstance.setView([newLat, newLng], 16);
            markerInstance.setLatLng([newLat, newLng]);
          }
        },
        (error) => {
          console.error('Error obteniendo ubicación:', error);
          toast.error('Geolocalización denegada o no disponible. Activando entrada de dirección manual.');
          setGpsFailed(true);
          setCoords(null);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } catch (err) {
      console.error('Exception in geolocation:', err);
      setGpsFailed(true);
      setCoords(null);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).L) {
      setLeafletLoaded(true);
      return;
    }

    const linkId = 'leaflet-css';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const scriptId = 'leaflet-js';
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => {
        setLeafletLoaded(true);
      };
      document.head.appendChild(script);
    } else {
      script.addEventListener('load', () => setLeafletLoaded(true));
    }
  }, []);

  useEffect(() => {
    if (!leafletLoaded || currentStep !== 2 || coords === null || !mapRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    const timer = setTimeout(() => {
      if (!mapRef.current) return;

      const mapDiv = mapRef.current;
      if ((mapDiv as any)._leaflet_id) {
        if (mapInstance && markerInstance) {
          mapInstance.setView([coords.lat, coords.lng]);
          markerInstance.setLatLng([coords.lat, coords.lng]);
        }
        return;
      }

      const map = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView([coords.lat, coords.lng], 16);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

      const redMarkerIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      const marker = L.marker([coords.lat, coords.lng], {
        draggable: true,
        icon: redMarkerIcon
      }).addTo(map);

      marker.on('dragend', () => {
        const newLatLng = marker.getLatLng();
        setCoords({ lat: newLatLng.lat, lng: newLatLng.lng });
        toast.info(`Coordenadas actualizadas: ${newLatLng.lat.toFixed(6)}, ${newLatLng.lng.toFixed(6)}`);
      });

      map.on('click', (e: any) => {
        marker.setLatLng(e.latlng);
        setCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
        toast.info(`Pin fijado en: ${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`);
      });

      setMapInstance(map);
      setMarkerInstance(marker);

      map.invalidateSize();
    }, 100);

    return () => clearTimeout(timer);
  }, [leafletLoaded, currentStep, coords === null]);

  // Paso 3: Pago y Cierre
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

  const nextStep = () => {
    if (currentStep === 1) {
      if (!nombres || !apellidos || !numeroDocumento || !razonSocial || !email) {
        toast.error('Por favor, complete todos los campos de Identidad y Facturación (incluyendo el correo electrónico).');
        return;
      }
    }

    if (currentStep === 2) {
      if (!direccion || !telefono) {
        toast.error('Por favor, ingrese su dirección completa y teléfono de contacto.');
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
        tipoUbicacion: tipoUbicacion,
        direccion: direccion,
        latitud: coords ? coords.lat : -16.5001,
        longitud: coords ? coords.lng : -68.1501,
        telefono: telefono,
        indicaciones: indicaciones || 'Compra directa de Invitado'
      };

      const financieroPayload = {
        cuponAplicado,
        descuentoBs,
        metodoPago
      };

      const result = await crearPedidoAction(
        'Sucursal Central LPZ',
        '2026-06-23',
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
        const orderData = {
          orderId: result.pedidoId,
          totalBs: totalBs,
          razonSocial: razonSocial || `${nombres} ${apellidos}`,
          nit: numeroDocumento,
          direccion: direccion,
          metodoPago: metodoPago,
          email: email
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
    { title: 'Logística y Entrega', desc: 'Ubicación y Mapas', icon: <MapPin className="w-4 h-4" /> },
    { title: 'Pago y Cierre', desc: 'Cupón y Confirmación', icon: <CreditCard className="w-4 h-4" /> }
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

      <div className="max-w-5xl mx-auto px-6 mt-8">
        
        {/* Stepper Indicator */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {stepHeaders.map((step, idx) => {
            const stepNum = idx + 1;
            const isCompleted = currentStep > stepNum;
            const isActive = currentStep === stepNum;
            
            return (
              <div key={idx} className="space-y-2">
                <div className={`h-1 rounded-full transition-all duration-300 ${
                  isCompleted || isActive ? 'bg-[#cc0000]' : 'bg-slate-200'
                }`} />
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isCompleted 
                      ? 'bg-[#cc0000] text-white shadow-sm' 
                      : isActive 
                      ? 'border-2 border-[#cc0000] text-[#cc0000] shadow-sm' 
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
            <Card className="border border-slate-200 bg-white rounded-3xl overflow-hidden shadow-xl relative">
              <div className="h-[3px] bg-[#cc0000] absolute top-0 left-0 right-0" />
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="p-6 md:p-8"
                >
                  
                  {/* PASO 1: IDENTIDAD Y FACTURACIÓN */}
                  {currentStep === 1 && (
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Paso 1: Identidad y Facturación</h2>
                          {hasSession ? (
                            <span className="bg-emerald-500/10 text-emerald-700 text-[9px] font-black py-1 px-2.5 rounded-full uppercase tracking-wider border border-emerald-500/20">
                              Socio Activo
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-600 text-[9px] font-black py-1 px-2.5 rounded-full uppercase tracking-wider border border-slate-200">
                              Invitado Activo
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium">Por favor, ingrese sus datos personales y tributarios de facturación para la reserva.</p>
                      </div>

                      {hasSession ? (
                        <div className="bg-emerald-50 border border-emerald-200/80 text-emerald-800 p-3.5 rounded-2xl flex items-center gap-3 text-xs font-semibold shadow-sm animate-fade-in">
                          <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                          <span>Sesión de Socio Activa. Hemos autocompletado tus datos de facturación de fábrica.</span>
                        </div>
                      ) : (
                        <div className="bg-[#cc0000]/5 border border-[#cc0000]/15 text-slate-900 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs font-medium shadow-sm animate-fade-in">
                          <div className="space-y-0.5">
                            <span className="block font-black text-slate-900 uppercase tracking-wide text-[10px] text-[#cc0000]">¿Ya eres Socio de Industrias Haas?</span>
                            <span className="text-slate-500">Inicia sesión en tu cuenta para autocompletar tus datos de facturación y agilizar tu compra.</span>
                          </div>
                          <Link href="/login" className="bg-[#cc0000] hover:bg-[#a30000] text-white font-extrabold uppercase tracking-wider text-[10px] py-2 px-4 rounded-xl transition-all shadow-sm shadow-[#cc0000]/10 text-center shrink-0">
                            Iniciar Sesión
                          </Link>
                        </div>
                      )}

                      <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label htmlFor="nombres" className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Nombres *</Label>
                            <Input
                              id="nombres"
                              value={nombres}
                              onChange={e => setNombres(e.target.value)}
                              placeholder="Juan"
                              className="bg-white text-black border-gray-300 placeholder:text-gray-400 focus:ring-[#cc0000] focus:border-[#cc0000] rounded-lg text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="apellidos" className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Apellidos *</Label>
                            <Input
                              id="apellidos"
                              value={apellidos}
                              onChange={e => setApellidos(e.target.value)}
                              placeholder="Pérez"
                              className="bg-white text-black border-gray-300 placeholder:text-gray-400 focus:ring-[#cc0000] focus:border-[#cc0000] rounded-lg text-sm"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="email" className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Correo Electrónico *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="cliente@correo.com"
                            className="bg-white text-black border-gray-300 placeholder:text-gray-400 focus:ring-[#cc0000] focus:border-[#cc0000] rounded-lg text-sm"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Tipo de Documento *</Label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                              {[
                                { value: 'NIT', label: 'NIT' },
                                { value: 'CI', label: 'C.I.' },
                                { value: 'Pasaporte', label: 'Pasp.' },
                                { value: 'Extranjero', label: 'Extr.' }
                              ].map((opt) => {
                                const isSelected = tipoDocumento === opt.value;
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setTipoDocumento(opt.value)}
                                    className={`py-2 px-1 border rounded-lg transition-all font-bold text-[10px] uppercase text-center select-none cursor-pointer ${
                                      isSelected 
                                        ? 'border-[#cc0000] bg-[#cc0000]/5 text-slate-900 ring-1 ring-[#cc0000] shadow-sm font-black'
                                        : 'border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="docNum" className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Número de Documento *</Label>
                            <Input
                              id="docNum"
                              value={numeroDocumento}
                              onChange={e => setNumeroDocumento(e.target.value)}
                              placeholder="1020405060"
                              className="bg-white text-black border-gray-300 placeholder:text-gray-400 focus:ring-[#cc0000] focus:border-[#cc0000] rounded-lg text-sm"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="razon" className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Razón Social *</Label>
                          <Input
                            id="razon"
                            value={razonSocial}
                            onChange={e => setRazonSocial(e.target.value)}
                            placeholder="Pérez Distribuciones S.R.L. o Consumidor Final"
                            className="bg-white text-black border-gray-300 placeholder:text-gray-400 focus:ring-[#cc0000] focus:border-[#cc0000] rounded-lg text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PASO 2: LOGÍSTICA Y ENTREGA */}
                  {currentStep === 2 && (
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Paso 2: Logística y Entrega</h2>
                        <p className="text-xs text-slate-500 font-medium">Configure la dirección física exacta para el despacho de sus embutidos.</p>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="dir" className="text-xs font-bold text-slate-500 uppercase tracking-widest block">
                            {gpsFailed ? '🔴 Dirección Manual de Entrega (Obligatorio) *' : 'Dirección completa *'}
                          </Label>
                          <Input
                            id="dir"
                            value={direccion}
                            onChange={e => setDireccion(e.target.value)}
                            required
                            placeholder={gpsFailed ? "Escriba detalladamente calle, número de puerta, edificio, zona..." : "Av. Arce, Edificio Multicentro, Nro. 1200"}
                            className={`bg-white text-black placeholder:text-gray-400 focus:ring-[#cc0000] focus:border-[#cc0000] rounded-lg text-sm transition-all ${
                              gpsFailed ? 'border-red-400 focus-visible:ring-red-500 focus-visible:border-red-500 ring-1 ring-red-100' : 'border-gray-300'
                            }`}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Detalle opcional *</Label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                              {[
                                { value: 'Casa', label: 'Casa', icon: <Home className="w-3.5 h-3.5 shrink-0" /> },
                                { value: 'Departamento', label: 'Dep.', icon: <Building2 className="w-3.5 h-3.5 shrink-0" /> },
                                { value: 'Oficina', label: 'Ofi.', icon: <Briefcase className="w-3.5 h-3.5 shrink-0" /> },
                                { value: 'Condominio', label: 'Cond.', icon: <Building className="w-3.5 h-3.5 shrink-0" /> }
                              ].map((opt) => {
                                const isSelected = tipoUbicacion === opt.value;
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setTipoUbicacion(opt.value)}
                                    className={`py-2.5 px-1 border rounded-lg transition-all font-bold text-[10px] uppercase text-center flex items-center justify-center gap-1 select-none cursor-pointer ${
                                      isSelected 
                                        ? 'border-[#cc0000] bg-[#cc0000]/5 text-slate-900 ring-1 ring-[#cc0000] shadow-sm font-black'
                                        : 'border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                    }`}
                                  >
                                    {opt.icon}
                                    <span>{opt.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="tel" className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Teléfono de contacto *</Label>
                            <Input
                              id="tel"
                              type="tel"
                              value={telefono}
                              onChange={e => setTelefono(e.target.value)}
                              placeholder="70012345"
                              className="bg-white text-black border-gray-300 placeholder:text-gray-400 focus:ring-[#cc0000] focus:border-[#cc0000] rounded-lg text-sm"
                            />
                          </div>
                        </div>

                        {/* Interactive Geolocation & OpenStreetMap */}
                        <div className="space-y-3 pt-2">
                          <div className="flex flex-wrap justify-between items-center gap-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">
                              🗺️ Ubicación Satelital de Entrega (Mapa Interactivo)
                            </Label>
                            <Button
                              type="button"
                              onClick={handleGetLocation}
                              className="bg-[#cc0000] hover:bg-[#a30000] text-white text-[10px] font-black uppercase tracking-wider py-1.5 px-3 rounded-lg flex items-center gap-1 cursor-pointer select-none"
                            >
                              📍 Obtener mi ubicación actual
                            </Button>
                          </div>

                          {coords === null || gpsFailed ? (
                            <div className="w-full h-64 bg-slate-100 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-red-300 text-gray-500 p-6 text-center">
                              <Map className="w-8 h-8 text-red-500 mb-2 animate-pulse" />
                              <span className="text-xs font-bold text-slate-800 mb-1">
                                {gpsFailed 
                                  ? 'Acceso GPS Denegado o Fallido' 
                                  : 'Ubicación GPS Requerida'}
                              </span>
                              <span className="text-[10px] text-slate-500 max-w-xs leading-relaxed font-medium">
                                {gpsFailed 
                                  ? 'La geolocalización satelital no está disponible. Por favor, asegúrese de ingresar su Dirección Manual de forma detallada arriba.' 
                                  : 'Haga clic en el botón superior para obtener sus coordenadas de entrega exactas.'}
                              </span>
                            </div>
                          ) : (
                            <div className="w-full h-64 mt-4 rounded-xl overflow-hidden border-2 border-gray-200 shadow-inner relative">
                              {leafletLoaded ? (
                                <div ref={mapRef} className="w-full h-full min-h-[256px]" />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-slate-50">
                                  <Loader2 className="w-8 h-8 animate-spin text-[#cc0000] mb-2" />
                                  <span className="text-xs font-bold text-slate-800">Cargando OpenStreetMap interactivo...</span>
                                </div>
                              )}
                              <div className="absolute bottom-2 right-2 bg-white px-2.5 py-1.5 rounded-lg shadow-md text-[10px] font-black text-slate-700 font-mono z-[1000]">
                                Lat: {coords.lat.toFixed(6)}, Lng: {coords.lng.toFixed(6)}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="ind" className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Indicaciones Adicionales</Label>
                          <textarea
                            id="ind"
                            rows={2}
                            value={indicaciones}
                            onChange={e => setIndicaciones(e.target.value)}
                            placeholder="Ej. Tocar el timbre rojo, dejar en portería, portón metálico gris..."
                            className="w-full bg-white text-black border border-gray-300 rounded-lg p-2.5 text-sm placeholder:text-gray-400 focus:ring-[#cc0000] focus:border-[#cc0000] focus:outline-none resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PASO 3: PAGO Y CIERRE */}
                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Paso 3: Pago y Cierre</h2>
                        <p className="text-xs text-slate-500 font-medium">Configure sus métodos de facturación financiera y confirme su pedido.</p>
                      </div>

                      {/* Coupon Box */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1 block">
                          <BadgePercent className="w-3.5 h-3.5 text-[#cc0000]" /> ¿Tiene un Cupón de Descuento?
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="SANJUAN10"
                            value={cuponInput}
                            onChange={e => setCuponInput(e.target.value)}
                            className="bg-white text-black border-gray-300 placeholder:text-gray-400 focus:ring-[#cc0000] focus:border-[#cc0000] rounded-lg max-w-[200px] text-sm"
                          />
                          <Button
                            type="button"
                            onClick={applyCoupon}
                            className="bg-[#cc0000] hover:bg-[#a30000] text-white text-xs font-bold uppercase rounded-lg cursor-pointer px-4"
                          >
                            Aplicar
                          </Button>
                        </div>
                        {cuponAplicado && (
                          <span className="block text-[10px] text-[#cc0000] font-bold bg-[#cc0000]/10 border border-[#cc0000]/20 py-1 px-2.5 rounded-full w-max mt-2">
                            Cupón SANJUAN10 Activo (-10% OFF aplicado)
                          </span>
                        )}
                      </div>

                      {/* Payment Method Selector using Radio Cards */}
                      <div className="space-y-3">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">
                          Seleccione su Método de Pago *
                        </Label>
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            type="button"
                            onClick={() => setMetodoPago('Transferencia QR')}
                            className={`p-4 border rounded-xl flex flex-col items-center justify-center gap-2.5 transition-all text-center cursor-pointer ${
                              metodoPago === 'Transferencia QR' 
                                ? 'border-[#cc0000] bg-[#cc0000]/5 text-slate-900 ring-1 ring-[#cc0000] shadow-sm' 
                                : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                          >
                            <Landmark className="w-5 h-5 shrink-0 text-[#cc0000]" />
                            <span className="font-bold text-xs uppercase tracking-wide">Transferencia QR</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setMetodoPago('Efectivo')}
                            className={`p-4 border rounded-xl flex flex-col items-center justify-center gap-2.5 transition-all text-center cursor-pointer ${
                              metodoPago === 'Efectivo' 
                                ? 'border-[#cc0000] bg-[#cc0000]/5 text-slate-900 ring-1 ring-[#cc0000] shadow-sm' 
                                : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
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
                  <div className="mt-8 pt-6 border-t border-slate-200 flex justify-between items-center">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={prevStep}
                      disabled={currentStep === 1 || isPending}
                      className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all flex items-center gap-1 rounded-lg text-xs cursor-pointer font-bold"
                    >
                      <ArrowLeft className="w-4 h-4 text-[#cc0000]" /> Anterior
                    </Button>

                    {currentStep < 3 ? (
                      <Button
                        type="button"
                        onClick={nextStep}
                        className="bg-[#cc0000] hover:bg-[#a30000] text-white text-xs font-bold uppercase tracking-wider py-2.5 px-5 rounded-lg flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                      >
                        Siguiente <ArrowRight className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={handleCheckoutSubmit}
                        disabled={isPending}
                        className="bg-[#cc0000] hover:bg-[#a30000] text-white text-xs font-bold uppercase tracking-wider py-2.5 px-6 rounded-lg flex items-center gap-1.5 shadow-lg shadow-[#cc0000]/10 transition-all active:scale-95 cursor-pointer"
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
                          <span className="block text-[10px] text-slate-400 font-mono">Cantidad: {item.cantidad} combos</span>
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
