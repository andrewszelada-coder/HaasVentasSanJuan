'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getPedidosCliente, logoutAction } from '@/app/actions';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  User, ClipboardList, PhoneCall, ArrowLeft, LogOut, Loader2, 
  MapPin, Receipt, ShieldCheck, ShoppingCart, HelpCircle, 
  Flame, Phone, Info, RefreshCw, MessageSquare
} from 'lucide-react';

interface PedidoItem {
  id: string;
  cantidad: number;
  subtotal_bs: number;
  promociones_sanjuan?: {
    id: string;
    titulo: string;
    precio_bs: number;
    descripcion: string;
    imagen_url: string;
  };
}

interface Pedido {
  id: string;
  total_bs: number;
  estado: 'pendiente' | 'aprobado' | 'cancelado' | 'preparando' | 'entregado';
  fecha_creacion: string;
  cupon_aplicado?: string;
  descuento_bs?: number;
  metodo_pago?: string;
  pedido_items?: PedidoItem[];
}

export default function MiCuentaPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();
  const [isProfilePending, startProfileTransition] = useTransition();
  
  const [user, setUser] = useState<any>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Form states for profile & B2B billing
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [telefono, setTelefono] = useState('');
  const [nit, setNit] = useState('');
  const [empresa, setEmpresa] = useState('');
  
  // --- NUEVOS ESTADOS DE IDENTIDAD B2B ---
  const [tipoDocumento, setTipoDocumento] = useState('NIT');
  const [complemento, setComplemento] = useState('');
  const [paisOrigen, setPaisOrigen] = useState('');

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Debe iniciar sesión para acceder a su portal de cuenta.");
        router.push('/login');
        return;
      }
      setUser(user);
      
      // Initialize form from user metadata
      setNombres(user.user_metadata?.first_name || user.user_metadata?.nombres || '');
      setApellidos(user.user_metadata?.last_name || user.user_metadata?.apellidos || '');
      setTelefono(user.user_metadata?.telefono || '');
      setTipoDocumento(user.user_metadata?.tipo_documento || 'NIT');
      setNit(user.user_metadata?.numero_documento || user.user_metadata?.nit || '');
      setEmpresa(user.user_metadata?.razon_social || user.user_metadata?.empresa || '');
      setComplemento(user.user_metadata?.complemento || '');
      setPaisOrigen(user.user_metadata?.pais_origen || '');

      // Load client orders
      const userOrders = await getPedidosCliente(user.id);
      setPedidos(userOrders as any[]);
    } catch (err: any) {
      toast.error("Error al autenticar o cargar información.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
    setMounted(true);
  }, []);

  const handleUpdateProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!nombres || !apellidos) {
      toast.error("Los campos Nombres y Apellidos son obligatorios.");
      return;
    }

    startProfileTransition(async () => {
      try {
        const { error } = await supabase.auth.updateUser({
          data: {
            nombres: nombres,
            apellidos: apellidos,
            first_name: nombres,
            last_name: apellidos,
            telefono: telefono,
            tipo_documento: tipoDocumento,
            numero_documento: nit,
            nit: nit,
            empresa: empresa,
            razon_social: empresa,
            complemento: complemento || null,
            pais_origen: paisOrigen || null
          }
        });

        if (error) {
          toast.error(`Error al guardar cambios: ${error.message}`);
        } else {
          toast.success("¡Información de perfil y facturación actualizada B2B!");
          localStorage.setItem('haas_session_active', 'true');
          // Reload user instance in state
          const { data: { user: updatedUser } } = await supabase.auth.getUser();
          setUser(updatedUser);
        }
      } catch (err: any) {
        toast.error("Ocurrió un error inesperado al actualizar el perfil.");
      }
    });
  };

  const handleLogout = () => {
    startTransition(async () => {
      localStorage.removeItem('haas_session_active');
      await supabase.auth.signOut();
      await logoutAction();
      window.location.href = '/reservas';
    });
  };

  // WhatsApp Link Generativo
  const customerName = nombres ? `${nombres} ${apellidos}` : (empresa || 'Cliente Haas B2B');
  const whatsappMsg = encodeURIComponent(
    `Hola Industrias Haas, soy ${customerName}. Necesito asistencia sobre mis pedidos de preventa San Juan 2026.`
  );
  const whatsappUrl = `https://wa.me/59167405585?text=${whatsappMsg}`;

  // UX B2B premium: Agrega dinámicamente los mismos ítems del pedido al carrito
  const handleReorder = (pedido: Pedido) => {
    if (!pedido.pedido_items || pedido.pedido_items.length === 0) {
      toast.error("No se encontraron combos o productos válidos para esta reserva.");
      return;
    }

    try {
      const savedCart = localStorage.getItem('haas_cart');
      let currentCart: any[] = [];
      if (savedCart) {
        currentCart = JSON.parse(savedCart);
      }

      pedido.pedido_items.forEach(item => {
        const promo = item.promociones_sanjuan;
        if (!promo) return;

        const existingItemIdx = currentCart.findIndex(c => c.promotion.id === promo.id);
        if (existingItemIdx > -1) {
          currentCart[existingItemIdx].cantidad += item.cantidad;
        } else {
          currentCart.push({
            promotion: {
              id: promo.id,
              titulo: promo.titulo,
              descripcion: promo.descripcion || '',
              precio_bs: Number(promo.precio_bs),
              stock_disponible: 9999,
              imagen_url: promo.imagen_url
            },
            cantidad: item.cantidad
          });
        }
      });

      localStorage.setItem('haas_cart', JSON.stringify(currentCart));
      toast.success("¡Combos de tu pedido anterior añadidos al carrito con éxito!");
      
      setTimeout(() => {
        router.push('/reservas');
      }, 1200);
    } catch (err) {
      toast.error("Error al procesar el reordenamiento del pedido.");
    }
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
        <div className="w-10 h-10 bg-[#cc0000]/10 flex items-center justify-center rounded-full border border-[#cc0000]/20 shadow-sm animate-pulse mb-3">
          <Flame className="w-6 h-6 text-[#cc0000]" />
        </div>
        <Loader2 className="w-8 h-8 animate-spin text-[#cc0000] mb-2" />
        <span className="text-xs font-bold text-slate-800 tracking-wide uppercase font-mono">Cargando tu Portal Haas...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 pb-24 font-sans selection:bg-[#cc0000] selection:text-white">
      {/* Navigation Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 transition-all">
        <div className="max-w-6xl mx-auto px-6 h-16 flex justify-between items-center">
          <Link href="/reservas" className="text-slate-500 hover:text-[#cc0000] flex items-center gap-1.5 text-xs font-bold uppercase transition-colors tracking-wide select-none">
            <ArrowLeft className="w-4 h-4 text-[#cc0000]" />
            Volver al Catálogo
          </Link>
          <div className="flex items-center gap-2 select-none">
            <Flame className="w-5 h-5 text-[#cc0000]" />
            <span className="font-extrabold text-[10px] tracking-widest text-slate-950 uppercase font-mono">Portal de Clientes Haas</span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 mt-10">
        
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-slate-200 mb-8 select-none">
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase flex items-center gap-2">
              <User className="w-6 h-6 text-[#cc0000]" />
              Mi Cuenta Comercial
            </h1>
            <p className="text-slate-500 text-xs font-medium">Gestiona tu historial de compras, información de facturación y soporte directo de fábrica.</p>
          </div>
          <Button
            onClick={handleLogout}
            disabled={isPending}
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 text-xs font-bold px-4 py-2 h-9 rounded-xl flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm shadow-red-100/50"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LogOut className="w-3.5 h-3.5" />
            )}
            Cerrar Sesión
          </Button>
        </div>

        {/* Dynamic Tabs Section */}
        <Tabs defaultValue="pedidos" className="w-full space-y-6">
          
          <TabsList className="bg-slate-100/80 border border-slate-200/60 p-1 rounded-2xl grid grid-cols-3 max-w-[450px] shadow-sm select-none">
            <TabsTrigger value="pedidos" className="rounded-xl text-xs font-bold py-2 tracking-wide uppercase">
              <ClipboardList className="w-3.5 h-3.5 mr-1.5" /> Mis Pedidos
            </TabsTrigger>
            <TabsTrigger value="perfil" className="rounded-xl text-xs font-bold py-2 tracking-wide uppercase">
              <User className="w-3.5 h-3.5 mr-1.5" /> Mis Datos
            </TabsTrigger>
            <TabsTrigger value="soporte" className="rounded-xl text-xs font-bold py-2 tracking-wide uppercase">
              <PhoneCall className="w-3.5 h-3.5 mr-1.5" /> Soporte
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: HISTORY OF ORDERS */}
          <TabsContent value="pedidos">
            <Card className="border border-slate-200/80 bg-white rounded-3xl overflow-hidden shadow-xl relative">
              <div className="h-[3px] bg-[#cc0000] absolute top-0 left-0 right-0" />
              <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/20 select-none">
                <CardTitle className="text-base font-black text-slate-900 uppercase tracking-tight">Historial de Reservas Realizadas</CardTitle>
                <CardDescription className="text-[11px] font-medium text-slate-400">Verifique el estado satelital, monto consolidado e indicaciones de sus reservas en fábrica.</CardDescription>
              </CardHeader>

              <CardContent className="p-0">
                {pedidos.length === 0 ? (
                  <div className="p-16 text-center select-none space-y-4">
                    <div className="w-12 h-12 bg-slate-50 border border-slate-100 flex items-center justify-center rounded-2xl shadow-inner mx-auto text-slate-400">
                      <ShoppingCart className="w-6 h-6 text-slate-350" />
                    </div>
                    <div className="space-y-1">
                      <span className="block text-slate-800 text-xs font-extrabold uppercase font-mono">Aún no tienes pedidos registrados</span>
                      <span className="block text-slate-400 text-[10px] font-semibold max-w-xs mx-auto leading-relaxed">Consolide su primer combo parrillero gourmet para San Juan directamente en nuestro catálogo.</span>
                    </div>
                    <Link href="/reservas" className="inline-flex bg-[#cc0000] hover:bg-[#a30000] text-white font-extrabold uppercase tracking-wider text-[10px] py-2 px-5 rounded-xl transition-all shadow-md shadow-[#cc0000]/10 select-none mt-2 active:scale-95">
                      Explorar Combos Preventa
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50 border-b border-slate-100 select-none">
                        <TableRow>
                          <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono px-6">ID Reserva</TableHead>
                          <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Fecha Preventa</TableHead>
                          <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Combos</TableHead>
                          <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Total</TableHead>
                          <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Estado</TableHead>
                          <TableHead className="text-right text-xs font-bold text-slate-500 uppercase tracking-wider font-mono px-6">Acción B2B</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pedidos.map(pedido => {
                          const hasCombos = pedido.pedido_items && pedido.pedido_items.length > 0;
                          
                          return (
                            <TableRow key={pedido.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                              <TableCell className="font-mono text-[10px] text-slate-400 font-bold px-6">
                                {'HAAS-' + pedido.id.slice(-6).toUpperCase()}
                              </TableCell>
                              <TableCell className="text-slate-600 text-xs font-mono font-semibold">
                                {new Date(pedido.fecha_creacion).toLocaleDateString('es-BO', { 
                                  day: '2-digit', 
                                  month: 'short', 
                                  year: 'numeric',
                                  timeZone: 'America/La_Paz'
                                })}
                              </TableCell>
                              <TableCell className="text-xs text-slate-800 font-semibold max-w-[200px] truncate">
                                {hasCombos ? (
                                  pedido.pedido_items?.map(item => (
                                    <div key={item.id} className="text-slate-700 text-[11px] truncate">
                                      {item.promociones_sanjuan?.titulo || 'Combo San Juan'} <span className="font-mono font-bold text-slate-400">(x{item.cantidad})</span>
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-slate-400 italic">Sin combos asignados</span>
                                )}
                              </TableCell>
                              <TableCell className="font-mono text-xs font-black text-[#cc0000]">
                                Bs. {Number(pedido.total_bs).toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant="outline"
                                  className={`text-[9px] font-bold py-0.5 px-2 rounded-full uppercase tracking-wider ${
                                    pedido.estado === 'aprobado' || pedido.estado === 'entregado'
                                      ? 'bg-green-50 text-green-700 font-bold border border-green-200'
                                      : pedido.estado === 'preparando'
                                      ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                                      : pedido.estado === 'cancelado'
                                      ? 'bg-red-50 text-red-700 font-bold border border-red-200'
                                      : 'bg-yellow-50 text-yellow-700 font-bold border border-yellow-200'
                                  }`}
                                >
                                  {pedido.estado === 'entregado' ? 'Entregado' : pedido.estado === 'preparando' ? 'Preparando' : pedido.estado === 'aprobado' ? 'Confirmado' : pedido.estado === 'cancelado' ? 'Cancelado' : 'Pendiente'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right px-6">
                                <Button
                                  onClick={() => handleReorder(pedido)}
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-[10px] font-extrabold uppercase tracking-wide px-3.5 rounded-lg border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-[#cc0000] flex items-center justify-end gap-1.5 ml-auto cursor-pointer"
                                >
                                  <RefreshCw className="w-3 h-3 text-[#cc0000]" />
                                  Volver a Pedir
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
 
          {/* TAB 2: PROFILE AND BILLING INFORMATION (Mis Datos updated) */}
          <TabsContent value="perfil">
            <Card className="border border-slate-200/80 bg-white rounded-3xl overflow-hidden shadow-xl relative">
              <div className="h-[3px] bg-[#cc0000] absolute top-0 left-0 right-0" />
              <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/20 select-none">
                <CardTitle className="text-base font-black text-slate-900 uppercase tracking-tight">Información de Perfil y Facturación B2B</CardTitle>
                <CardDescription className="text-[11px] font-medium text-slate-400">Actualice sus datos personales y tributarios de facturación. Al guardar esta información, sus futuros procesos de checkout se autocompletarán de forma instantánea.</CardDescription>
              </CardHeader>

              <form onSubmit={handleUpdateProfile}>
                <CardContent className="p-6 md:p-8 space-y-6">
                  
                  {/* UX Alert Callout */}
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-start gap-3 text-xs font-semibold shadow-sm select-none">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">¡Beneficio de Agilización! Guardar y consolidar estos datos en tu perfil de fábrica agilizará tus futuras compras, permitiendo consolidar reservas de la preventa en menos de un minuto.</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label htmlFor="nombres" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nombres *</Label>
                      <Input
                        id="nombres"
                        value={nombres}
                        onChange={e => setNombres(e.target.value)}
                        placeholder="Nombres"
                        required
                        disabled={isProfilePending}
                        className="bg-white text-black border-slate-250 placeholder:text-slate-400 focus-visible:ring-[#cc0000] focus-visible:border-[#cc0000] rounded-xl text-xs h-10 shadow-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="apellidos" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Apellidos *</Label>
                      <Input
                        id="apellidos"
                        value={apellidos}
                        onChange={e => setApellidos(e.target.value)}
                        placeholder="Apellidos"
                        required
                        disabled={isProfilePending}
                        className="bg-white text-black border-slate-250 placeholder:text-slate-400 focus-visible:ring-[#cc0000] focus-visible:border-[#cc0000] rounded-xl text-xs h-10 shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label htmlFor="telefono" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Teléfono / Celular (Opcional)</Label>
                      <Input
                        id="telefono"
                        value={telefono}
                        onChange={e => setTelefono(e.target.value)}
                        placeholder="70012345"
                        disabled={isProfilePending}
                        className="bg-white text-black border-slate-250 placeholder:text-slate-400 focus-visible:ring-[#cc0000] focus-visible:border-[#cc0000] rounded-xl text-xs h-10 shadow-sm font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="nit" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">NIT / Documento (Opcional)</Label>
                      <Input
                        id="nit"
                        value={nit}
                        onChange={e => setNit(e.target.value)}
                        placeholder={
                          tipoDocumento === 'CI' ? 'Ej. 1234567' : 
                          tipoDocumento === 'NIT' ? 'Ej. 10203040' : 'Ej. E-987654'
                        }
                        disabled={isProfilePending}
                        className="bg-white text-black border-slate-250 placeholder:text-slate-400 focus-visible:ring-[#cc0000] focus-visible:border-[#cc0000] rounded-xl text-xs h-10 shadow-sm font-mono"
                      />
                    </div>
                  </div>

                  {/* NUEVOS CAMPOS DINÁMICOS DE TIPO DE DOCUMENTO B2B */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label htmlFor="tipoDocumento" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tipo de Documento</Label>
                      <select
                        id="tipoDocumento"
                        value={tipoDocumento}
                        onChange={e => {
                          const val = e.target.value;
                          setTipoDocumento(val);
                          // Conmutación segura e instantánea de sub-estados
                          setComplemento('');
                          setPaisOrigen('');
                          if (val === 'NIT') {
                            setComplemento('');
                          } else if (val === 'CI') {
                            setEmpresa('');
                          }
                        }}
                        disabled={isProfilePending}
                        className="w-full bg-white text-black border border-slate-250 rounded-xl p-2.5 text-xs focus:ring-[#cc0000] focus:border-[#cc0000] focus:outline-none h-10 shadow-sm"
                      >
                        <option value="CI">Cédula de Identidad (C.I.)</option>
                        <option value="NIT">Número de Identificación Tributaria (NIT)</option>
                        <option value="Carnet Extranjero">Carnet Extranjero / Pasaporte</option>
                      </select>
                    </div>

                    {/* Campo condicional de Complemento solo para Cédula de Identidad */}
                    {tipoDocumento === 'CI' && (
                      <div className="space-y-1.5 animate-fade-in">
                        <Label htmlFor="complemento" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Complemento (Opcional)</Label>
                        <Input
                          id="complemento"
                          value={complemento}
                          onChange={e => setComplemento(e.target.value)}
                          placeholder="Ej. 1B (si aplica)"
                          disabled={isProfilePending}
                          className="bg-white text-black border-slate-250 placeholder:text-slate-400 focus-visible:ring-[#cc0000] focus-visible:border-[#cc0000] rounded-xl text-xs h-10 shadow-sm"
                        />
                      </div>
                    )}

                    {/* Campo condicional de País de Origen para extranjeros */}
                    {tipoDocumento === 'Carnet Extranjero' && (
                      <div className="space-y-1.5 animate-fade-in">
                        <Label htmlFor="paisOrigen" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">País de Origen</Label>
                        <Input
                          id="paisOrigen"
                          value={paisOrigen}
                          onChange={e => setPaisOrigen(e.target.value)}
                          placeholder="Ej. España, Alemania, Argentina..."
                          disabled={isProfilePending}
                          className="bg-white text-black border-slate-250 placeholder:text-slate-400 focus-visible:ring-[#cc0000] focus-visible:border-[#cc0000] rounded-xl text-xs h-10 shadow-sm"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="empresa" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Razón Social o Empresa (Opcional)</Label>
                    <Input
                      id="empresa"
                      value={empresa}
                      onChange={e => setEmpresa(e.target.value)}
                      placeholder="Distribuidora Haas SRL o Consumidor Final"
                      disabled={isProfilePending}
                      className="bg-white text-black border-slate-250 placeholder:text-slate-400 focus-visible:ring-[#cc0000] focus-visible:border-[#cc0000] rounded-xl text-xs h-10 shadow-sm"
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <Button
                      type="submit"
                      disabled={isProfilePending}
                      className="bg-[#cc0000] hover:bg-[#a30000] text-white font-extrabold uppercase tracking-wider text-xs py-3 px-6 rounded-xl transition-all shadow-lg shadow-[#cc0000]/10 flex items-center gap-1.5 active:scale-[0.98] cursor-pointer"
                    >
                      {isProfilePending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Guardando datos...
                        </>
                      ) : (
                        'Guardar Información de Facturación'
                      )}
                    </Button>
                  </div>

                </CardContent>
              </form>
            </Card>
          </TabsContent>

          {/* TAB 3: HELP AND WHATSAPP SUPPORT */}
          <TabsContent value="soporte">
            <Card className="border border-slate-200/80 bg-white rounded-3xl overflow-hidden shadow-xl relative">
              <div className="h-[3px] bg-[#cc0000] absolute top-0 left-0 right-0" />
              <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/20 select-none">
                <CardTitle className="text-base font-black text-slate-900 uppercase tracking-tight">Soporte Técnico y Asistencia Comercial</CardTitle>
                <CardDescription className="text-[11px] font-medium text-slate-400">¿Necesita realizar cambios logísticos en sus direcciones de despacho o asistencia con sus facturas? Contáctese directo con nuestra central.</CardDescription>
              </CardHeader>

              <CardContent className="p-8 flex flex-col md:flex-row items-center gap-8">
                <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 flex items-center justify-center rounded-3xl shadow-inner text-emerald-600 shrink-0">
                  <HelpCircle className="w-8 h-8" />
                </div>

                <div className="space-y-4 text-center md:text-left flex-1">
                  <div className="space-y-1">
                    <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-tight">Central Directa de WhatsApp Haas</h3>
                    <p className="text-slate-500 text-xs font-medium leading-relaxed max-w-xl">
                      Nuestro equipo administrativo y de logística de fábrica B2B está listo para responder consultas de stock a granel, coordinaciones de transporte refrigerado o resolver incidentes con sus pagos QR de reservas.
                    </p>
                  </div>

                  <div className="pt-2">
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase tracking-wider text-xs py-3 px-6 rounded-xl transition-all shadow-md shadow-emerald-700/10 items-center gap-2 select-none hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <MessageSquare className="w-4.5 h-4.5" />
                      Contactar por WhatsApp
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
