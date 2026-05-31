'use client';

import React, { useTransition, useState } from 'react';
import { loginAction } from '@/app/actions';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Flame, ShieldAlert, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMsg(null);

    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await loginAction(formData);
      if (result && result.error) {
        setErrorMsg(result.error);
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
      {/* Elemento decorativo sutil */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-100/40 via-transparent to-transparent pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="border border-slate-100 shadow-xl shadow-slate-100/50 bg-white rounded-2xl overflow-hidden">
          <CardHeader className="space-y-2 text-center pt-8 pb-4">
            <div className="mx-auto w-12 h-12 bg-orange-700/10 flex items-center justify-center rounded-xl mb-2">
              <Flame className="w-6 h-6 text-[#9A3412]" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-[#0F172A]">
              HAAS SAN JUAN RESERVAS
            </CardTitle>
            <CardDescription className="text-slate-400 text-sm font-sans tracking-wide">
              Portal B2B de Reservas Especiales • Campaña 2026
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 px-8 py-4">
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg flex items-start gap-2.5 text-sm"
                >
                  <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <span className="leading-snug">{errorMsg}</span>
                </motion.div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Correo Corporativo
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="vendedor@industriashaas.com"
                  required
                  disabled={isPending}
                  className="border-slate-200 focus-visible:ring-[#166534] rounded-lg bg-slate-50/50"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Contraseña
                  </Label>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  disabled={isPending}
                  className="border-slate-200 focus-visible:ring-[#166534] rounded-lg bg-slate-50/50"
                />
              </div>
            </CardContent>

            <CardFooter className="px-8 pb-8 pt-4 flex flex-col gap-4">
              <Button
                type="submit"
                disabled={isPending}
                className="w-full bg-[#166534] hover:bg-[#114f27] text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Validando sesión...
                  </>
                ) : (
                  'Iniciar Sesión'
                )}
              </Button>
              <div className="text-center text-xs text-slate-400 font-mono">
                INDUSTRIAS HAAS LTDA. • DEPARTAMENTO DE TI
              </div>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
