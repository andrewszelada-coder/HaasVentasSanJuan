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
import { PackagePlus, Edit, Trash2, Plus, Loader2 } from 'lucide-react';

interface Promotion {
  id: string;
  titulo: string;
  descripcion: string;
  precio_bs: number;
  stock_disponible: number;
  imagen_url: string;
  activo: boolean;
}

export default function AdminPromosPage() {
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  
  // Estado para edicion
  const [editId, setEditId] = useState<string | null>(null);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
  const [activo, setActivo] = useState(true);

  const loadData = async () => {
    try {
      const data = await getPromociones(false);
      setPromos(data.map(item => ({
        id: item.id,
        titulo: item.titulo,
        descripcion: item.descripcion,
        precio_bs: Number(item.precio_bs),
        stock_disponible: Number(item.stock_disponible),
        imagen_url: item.imagen_url,
        activo: item.activo
      })));
    } catch {
      toast.error("Error al cargar promociones.");
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
    setStock('');
    setImagenUrl('');
    setActivo(true);
    setModalOpen(true);
  };

  const openEditarModal = (p: Promotion) => {
    setEditId(p.id);
    setTitulo(p.titulo);
    setDescripcion(p.descripcion);
    setPrecio(p.precio_bs.toString());
    setStock(p.stock_disponible.toString());
    setImagenUrl(p.imagen_url);
    setActivo(p.activo);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!titulo || !precio || !stock) {
      toast.error("Por favor rellene los campos requeridos.");
      return;
    }

    const payload = {
      titulo,
      descripcion,
      precio_bs: Number(precio),
      stock_disponible: parseInt(stock),
      imagen_url: imagenUrl,
      activo
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
        toast.success(editId ? "Promoción editada con éxito." : "Promoción creada con éxito.");
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
        toast.success("Estado de la promoción actualizado.");
        await loadData();
      }
    });
  };

  const handleEliminar = (id: string) => {
    if (!confirm("¿Está seguro que desea eliminar este combo de la campaña?")) return;
    
    startTransition(async () => {
      const result = await eliminarPromoAction(id);
      if (result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Promoción eliminada.");
        await loadData();
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Gestión de Combos Promocionales</h1>
          <p className="text-slate-500 text-xs mt-1">Cree, altere y active promociones de San Juan en tiempo real para el portal cliente.</p>
        </div>
        <Button
          onClick={openCrearModal}
          className="bg-[#166534] hover:bg-[#114f27] text-white flex items-center gap-2 rounded-lg font-semibold"
        >
          <Plus className="w-4 h-4" />
          Crear Promoción
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
        <Card className="border border-slate-100 p-12 text-center text-slate-400">
          No hay promociones registradas en el catálogo central.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {promos.map(promo => (
            <motion.div
              key={promo.id}
              whileHover={{ y: -3 }}
              className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-150 flex flex-col justify-between"
            >
              <div>
                <div className="relative overflow-hidden aspect-[16/10] bg-slate-100 border-b border-slate-50">
                  <img
                    src={promo.imagen_url}
                    alt={promo.titulo}
                    className="object-cover w-full h-full"
                  />
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm border border-slate-100 rounded-lg py-1 px-2.5 flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-slate-500 font-mono">Activo:</span>
                    <Switch
                      checked={promo.activo}
                      onCheckedChange={() => handleToggleActivo(promo.id, promo.activo)}
                    />
                  </div>
                </div>

                <div className="p-5 space-y-2">
                  <h3 className="font-bold text-slate-800 text-sm leading-tight line-clamp-1">{promo.titulo}</h3>
                  <p className="text-slate-400 text-[11px] leading-relaxed line-clamp-2">{promo.descripcion}</p>
                </div>
              </div>

              <div className="p-5 pt-0 border-t border-slate-50 mt-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="block text-[10px] text-slate-400 font-mono">Stock: {promo.stock_disponible}</span>
                  <span className="block text-sm font-extrabold font-mono text-[#9A3412]">Bs. {promo.precio_bs.toFixed(2)}</span>
                </div>

                <div className="flex gap-2 shrink-0">
                  <Button
                    onClick={() => openEditarModal(promo)}
                    variant="outline"
                    className="border-slate-200 hover:bg-slate-50 p-2 h-8 w-8 rounded-lg"
                  >
                    <Edit className="w-3.5 h-3.5 text-slate-600" />
                  </Button>
                  <Button
                    onClick={() => handleEliminar(promo.id)}
                    variant="outline"
                    className="border-slate-200 hover:bg-red-50 p-2 h-8 w-8 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md bg-white border border-slate-100 shadow-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold">
              {editId ? 'Editar Promoción Especial' : 'Crear Nueva Promoción'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Complete los campos comerciales de la promoción para publicar al catálogo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="titulo" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Título del Combo *
              </Label>
              <Input
                id="titulo"
                required
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                placeholder="Combo San Juan Clásico"
                className="border-slate-200 rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desc" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Descripción
              </Label>
              <textarea
                id="desc"
                rows={2}
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                placeholder="2 kg de chorizo Haas..."
                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm text-slate-800 focus:ring-1 focus:ring-[#166534] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="precio" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
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
                  className="border-slate-200 rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="stock" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Stock Disponible *
                </Label>
                <Input
                  id="stock"
                  type="number"
                  required
                  value={stock}
                  onChange={e => setStock(e.target.value)}
                  placeholder="100"
                  className="border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="img" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                URL de Imagen
              </Label>
              <Input
                id="img"
                value={imagenUrl}
                onChange={e => setImagenUrl(e.target.value)}
                placeholder="https://..."
                className="border-slate-200 rounded-lg"
              />
            </div>

            <DialogFooter className="pt-4 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="border-slate-200 rounded-lg text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-[#166534] hover:bg-[#114f27] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Guardar Combo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
