'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { getPromociones, crearPromoAction, editarPromoAction, togglePromoActivoAction, eliminarPromoAction } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Edit, Trash2, Plus, Loader2, Info } from 'lucide-react';

interface Promotion {
  id: string;
  titulo: string;
  descripcion: string;
  precio_bs: number;
  imagen_url: string;
  activo: boolean;
  categoria: string;
  tipo_venta: string;
}

export default function AdminPromosPage() {
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  
  // Estado para edicion y creación
  const [editId, setEditId] = useState<string | null>(null);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [activo, setActivo] = useState(true);
  const [categoria, setCategoria] = useState('Producto San Juan');
  const [tipoVenta, setTipoVenta] = useState('En paquetes (Unidades)');

  const loadData = async () => {
    try {
      const data = await getPromociones(false);
      setPromos(data.map(item => ({
        id: item.id,
        titulo: item.titulo,
        descripcion: item.descripcion,
        precio_bs: Number(item.precio_bs),
        imagen_url: item.imagen_url,
        activo: item.activo,
        categoria: item.categoria || 'Producto San Juan',
        tipo_venta: item.tipo_venta || 'En paquetes (Unidades)'
      })));
    } catch {
      toast.error("Error al cargar los productos del catálogo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCrearModal = () => {
    setEditId(null);
    setTitulo('');
    setDescripcion('');
    setPrecio('');
    setImagenUrl('');
    setPreviewUrl('');
    setActivo(true);
    setCategoria('Producto San Juan');
    setTipoVenta('En paquetes (Unidades)');
    setModalOpen(true);
  };

  const openEditarModal = (p: Promotion) => {
    setEditId(p.id);
    setTitulo(p.titulo);
    setDescripcion(p.descripcion);
    setPrecio(p.precio_bs.toString());
    setImagenUrl(p.imagen_url);
    setPreviewUrl(p.imagen_url);
    setActivo(p.activo);
    setCategoria(p.categoria || 'Producto San Juan');
    setTipoVenta(p.tipo_venta || 'En paquetes (Unidades)');
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!titulo || !precio) {
      toast.error("Por favor, rellene los campos comerciales obligatorios.");
      return;
    }

    const payload = {
      titulo,
      descripcion,
      precio_bs: Number(precio),
      imagen_url: imagenUrl,
      activo,
      categoria,
      tipo_venta: tipoVenta
    };

    startTransition(async () => {
      let result;
      if (editId) {
        result = await editarPromoAction(editId, payload);
      } else {
        result = await crearPromoAction(payload);
      }

      if (result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(editId ? "Producto editado con éxito." : "Producto ingresado con éxito.");
        setModalOpen(false);
        await loadData();
      }
    });
  };

  const handleToggleActivo = (id: string, current: boolean) => {
    startTransition(async () => {
      const result = await togglePromoActivoAction(id, !current);
      if (result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Estado de visibilidad de producto actualizado.");
        await loadData();
      }
    });
  };

  const handleEliminar = (id: string) => {
    if (!confirm("¿Está seguro que desea eliminar este producto del catálogo comercial?")) return;
    
    startTransition(async () => {
      const result = await eliminarPromoAction(id);
      if (result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Producto eliminado del catálogo.");
        await loadData();
      }
    });
  };

  return (
    <div className="space-y-8 bg-slate-50 text-slate-900 p-6 rounded-3xl min-h-screen border border-slate-200 shadow-sm font-sans selection:bg-[#cc0000] selection:text-white">
      {/* Title */}
      <div className="flex justify-between items-center pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Catálogo Comercial de Productos</h1>
          <p className="text-slate-500 text-xs mt-1">Gestione de manera centralizada la visibilidad, precios y tipologías de su portafolio.</p>
        </div>
        <Button
          onClick={openCrearModal}
          className="bg-[#cc0000] hover:bg-[#a30000] text-white flex items-center gap-2 rounded-lg font-semibold cursor-pointer shadow-md transition-all active:scale-95 text-xs py-2.5 px-4"
        >
          <Plus className="w-4 h-4" />
          Ingresar Producto
        </Button>
      </div>

      {/* Promos Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(n => (
            <div key={n} className="bg-white border border-slate-100 rounded-2xl h-64 animate-pulse" />
          ))}
        </div>
      ) : promos.length === 0 ? (
        <Card className="border border-slate-200 p-12 text-center text-slate-400 font-mono text-xs">
          No hay productos registrados en el catálogo comercial central.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {promos.map(promo => (
            <motion.div
              key={promo.id}
              whileHover={{ y: -3 }}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-150 flex flex-col justify-between"
            >
              <div>
                <div className="relative overflow-hidden aspect-[16/10] bg-slate-100 border-b border-slate-200">
                  <img
                    src={promo.imagen_url || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500'}
                    alt={promo.titulo}
                    className="object-cover w-full h-full"
                  />
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg py-1 px-2.5 flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-slate-500 font-mono">Activo:</span>
                    <Switch
                      checked={promo.activo}
                      onCheckedChange={() => handleToggleActivo(promo.id, promo.activo)}
                    />
                  </div>
                </div>

                <div className="p-5 space-y-2">
                  <span className="inline-block bg-[#cc0000]/10 text-[#cc0000] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {promo.categoria}
                  </span>
                  <h3 className="font-bold text-slate-800 text-sm leading-tight line-clamp-1">{promo.titulo}</h3>
                  <p className="text-slate-500 text-[11px] leading-relaxed line-clamp-2">{promo.descripcion}</p>
                </div>
              </div>

              <div className="p-5 pt-0 border-t border-slate-100 mt-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">{promo.tipo_venta}</span>
                  <span className="block text-sm font-extrabold font-mono text-[#cc0000]">Bs. {promo.precio_bs.toFixed(2)}</span>
                </div>

                <div className="flex gap-2 shrink-0">
                  <Button
                    onClick={() => openEditarModal(promo)}
                    variant="outline"
                    className="border-slate-200 hover:bg-slate-50 p-2 h-8 w-8 rounded-lg cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5 text-slate-600" />
                  </Button>
                  <Button
                    onClick={() => handleToggleActivo(promo.id, promo.activo)}
                    variant="outline"
                    className="border-slate-200 hover:bg-slate-50 p-2 h-8 w-8 rounded-lg cursor-pointer text-[10px] font-bold text-slate-600 font-mono"
                  >
                    ON
                  </Button>
                  <Button
                    onClick={() => handleEliminar(promo.id)}
                    variant="outline"
                    className="border-slate-200 hover:bg-red-50 p-2 h-8 w-8 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal Dialog Form: "Ingresar Producto" - DESKTOP FIRST sm:max-w-2xl md:max-w-4xl lg:max-w-5xl */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-2xl md:max-w-4xl lg:max-w-5xl w-11/12 bg-white border border-slate-200 shadow-2xl rounded-3xl p-8 text-slate-900 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="text-slate-950 font-black uppercase text-lg tracking-wide flex items-center gap-2 leading-none">
              <Info className="w-5.5 h-5.5 text-[#cc0000]" />
              {editId ? 'Editar producto comercial' : 'Ingresar Producto'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium pt-1">
              Complete la ficha técnica del producto para publicarlo o actualizarlo en el catálogo gerencial de fábrica.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-6 pt-6">
            
            {/* 2 Column Parallel Layout for Desktop-First Design */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Left Column: Text Fields and Rules */}
              <div className="space-y-4">
                
                {/* Título */}
                <div className="space-y-1.5">
                  <Label htmlFor="titulo" className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                    Título del Producto *
                  </Label>
                  <Input
                    id="titulo"
                    required
                    value={titulo}
                    onChange={e => setTitulo(e.target.value)}
                    placeholder="Ej. Combo San Juan Clásico"
                    className="bg-white text-black border-gray-300 placeholder:text-gray-400 focus:ring-[#cc0000] focus:border-[#cc0000] rounded-lg h-9.5 w-full font-medium"
                  />
                </div>

                {/* Categoría */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                    Categoría *
                  </Label>
                  <select
                    value={categoria}
                    onChange={e => setCategoria(e.target.value)}
                    className="w-full bg-white text-black border border-gray-300 rounded-lg p-2.5 text-sm placeholder:text-gray-400 focus:ring-[#cc0000] focus:border-[#cc0000] focus:outline-none cursor-pointer font-medium"
                  >
                    <option value="Producto San Juan">Producto San Juan</option>
                    <option value="Embutidos">Embutidos</option>
                    <option value="Carnes">Carnes</option>
                    <option value="Lácteos">Lácteos</option>
                  </select>
                </div>

                {/* Descripción Comercial textarea */}
                <div className="space-y-1.5">
                  <Label htmlFor="desc" className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                    Descripción Comercial *
                  </Label>
                  <textarea
                    id="desc"
                    rows={3}
                    required
                    value={descripcion}
                    onChange={e => setDescripcion(e.target.value)}
                    placeholder="Ej: Contiene 2 kg de chorizo premium, Chimichurri artesanal y Carbón seleccionado de fábrica."
                    className="w-full bg-white text-black border border-gray-300 rounded-lg p-2.5 text-sm placeholder:text-gray-400 focus:ring-[#cc0000] focus:border-[#cc0000] focus:outline-none font-medium resize-none"
                  />
                </div>

                {/* Fila: Precio y Tipo de Venta (Omitiendo stock por completo) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="precio" className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                      Precio (Bs.) *
                    </Label>
                    <Input
                      id="precio"
                      type="number"
                      step="0.01"
                      required
                      value={precio}
                      onChange={e => setPrecio(e.target.value)}
                      placeholder="120.00"
                      className="bg-white text-black border-gray-300 placeholder:text-gray-400 focus:ring-[#cc0000] focus:border-[#cc0000] rounded-lg h-9.5 w-full font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                      Tipo de Venta *
                    </Label>
                    <select
                      value={tipoVenta}
                      onChange={e => setTipoVenta(e.target.value)}
                      className="w-full bg-white text-black border border-gray-300 rounded-lg p-2.5 text-sm placeholder:text-gray-400 focus:ring-[#cc0000] focus:border-[#cc0000] focus:outline-none cursor-pointer font-medium"
                    >
                      <option value="En paquetes (Unidades)">En paquetes (Unidades)</option>
                      <option value="A granel (Kg)">A granel (Kg)</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* Right Column: File Explorer upload & Live Preview & Visibility Toggle */}
              <div className="space-y-5 flex flex-col justify-between">
                
                {/* Cargador Local de Imagen */}
                <div className="space-y-2">
                  <Label htmlFor="imgFile" className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                    Carga de Imagen Local (Folleto o Catálogo) *
                  </Label>
                  <input
                    id="imgFile"
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setPreviewUrl(reader.result as string);
                          setImagenUrl(reader.result as string); // Base64 para persistencia nativa autónoma
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full bg-white text-black border border-gray-300 rounded-lg p-1.5 text-sm file:mr-4 file:bg-gray-100 file:text-gray-900 file:border-0 file:rounded-md file:px-4 file:py-2 file:cursor-pointer cursor-pointer focus:ring-[#cc0000] focus:border-[#cc0000] font-medium"
                  />
                  
                  {/* Previsualización Satelital Local de Imagen */}
                  {previewUrl ? (
                    <div className="mt-3 border border-slate-200 rounded-2xl overflow-hidden aspect-[16/10] bg-slate-50 relative h-[180px] w-full shadow-inner flex items-center justify-center">
                      <img
                        src={previewUrl}
                        alt="Previsualización local del producto"
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="mt-3 border border-dashed border-slate-250 rounded-2xl h-[180px] w-full bg-slate-50/50 flex flex-col items-center justify-center p-4">
                      <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">Sin imagen cargada</span>
                      <span className="text-[9px] text-slate-400 mt-1">Cargue un archivo PNG, JPEG o WEBP</span>
                    </div>
                  )}
                </div>

                {/* Toggle de Estado de Visibilidad */}
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="space-y-0.5">
                    <span className="block text-[11px] font-bold text-gray-800 uppercase tracking-wider">Estado de Visibilidad</span>
                    <span className="block text-[9px] text-gray-500 font-medium leading-none">Disponible en el catálogo cliente</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-black text-slate-700 font-mono">
                      {activo ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                    <Switch
                      checked={activo}
                      onCheckedChange={setActivo}
                    />
                  </div>
                </div>

              </div>

            </div>

            {/* Footer Buttons with maximum contrast submit button as requested */}
            <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="border-slate-250 hover:bg-slate-50 rounded-lg text-xs font-semibold px-4 h-9.5 cursor-pointer text-slate-700"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-[#cc0000] text-white hover:bg-[#a30000] font-bold rounded-lg text-xs uppercase tracking-wider px-6 h-9.5 cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Guardar Producto
              </Button>
            </div>

          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
