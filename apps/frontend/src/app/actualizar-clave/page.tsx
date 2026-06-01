'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, Loader2, Flame } from 'lucide-react';
import { toast } from 'sonner';

export default function ActualizarClavePage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!password || !confirmPassword) {
      setErrorMsg('Por favor complete todos los campos.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    startTransition(async () => {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        toast.success('¡Contraseña actualizada con éxito!');
        setSuccessMsg('¡Contraseña actualizada con éxito! Redirigiendo al portal de acceso...');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 py-12 relative overflow-hidden font-sans select-none">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="border border-slate-200/80 bg-white rounded-3xl overflow-hidden shadow-2xl">
          
          {/* Header Brand Flame */}
          <div className="bg-slate-50 border-b border-slate-100 py-6 text-center flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 bg-[#cc0000]/10 flex items-center justify-center rounded-full border border-[#cc0000]/20 shadow-sm animate-pulse">
              <Flame className="w-6 h-6 text-[#cc0000]" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-base tracking-widest text-slate-900 leading-none">INDUSTRIAS HAAS</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Actualizar Contraseña</span>
            </div>
          </div>

          <CardHeader className="space-y-1 text-center pt-6 pb-1">
            <CardTitle className="text-xl font-black tracking-tight text-slate-900 uppercase">
              Nueva Contraseña
            </CardTitle>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 px-8 pb-8 pt-2 text-left">
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-xl flex items-start gap-2.5 text-xs font-semibold"
                >
                  <ShieldAlert className="w-4.5 h-4.5 text-red-600 shrink-0 mt-0.5" />
                  <span className="leading-snug">{errorMsg}</span>
                </motion.div>
              )}
              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl flex items-start gap-2.5 text-xs font-semibold"
                >
                  <ShieldCheck className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="leading-snug">{successMsg}</span>
                </motion.div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="new-password" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Nueva Contraseña *
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isPending}
                  className="border-slate-200 bg-white rounded-lg text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#cc0000] focus-visible:border-[#cc0000]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Confirmar Contraseña *
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isPending}
                  className="border-slate-200 bg-white rounded-lg text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#cc0000] focus-visible:border-[#cc0000]"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-[#cc0000] hover:bg-[#a30000] text-white font-bold uppercase tracking-wider text-xs py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-[#cc0000]/10 active:scale-[0.99] cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Guardando cambios...
                    </>
                  ) : (
                    'Guardar Contraseña'
                  )}
                </Button>
              </div>
            </CardContent>
          </form>

        </Card>
      </motion.div>
    </div>
  );
}
