'use client';

import React, { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { loginAction } from '@/app/actions';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { motion } from 'framer-motion';
import { ShieldAlert, Loader2, ShieldCheck, Flame } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();
  const [isRegisterPending, startRegisterTransition] = useTransition();
  const [isRecoverPending, startRecoverTransition] = useTransition();
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Custom form states
  const [gender, setGender] = useState<string>('Prefiero no decirlo');
  const [isRecovering, setIsRecovering] = useState<boolean>(false);
  const [recoverEmail, setRecoverEmail] = useState<string>('');

  const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await loginAction(formData);
      if (result && result.error) {
        setErrorMsg(result.error);
      }
    });
  };

  const handleRegisterSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const nombres = formData.get('nombres') as string;
    const apellidos = formData.get('apellidos') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const birthDate = formData.get('birthDate') as string;

    // Validación básica de campos obligatorios
    if (!nombres || !apellidos || !email || !password) {
      setErrorMsg('Por favor complete todos los campos obligatorios (*).');
      return;
    }

    startRegisterTransition(async () => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: nombres,
            last_name: apellidos,
            birth_date: birthDate || null,
            gender: gender || 'Prefiero no decirlo',
            rol: 'cliente',
            sucursal: 'Central'
          }
        }
      });

      if (error) {
        if (error.message.includes('already') || error.message.includes('duplicate') || error.status === 422) {
          toast.error("Este correo ya está registrado. Por favor, inicia sesión.");
          setErrorMsg("Este correo ya está registrado. Por favor, inicia sesión.");
        } else {
          setErrorMsg(error.message);
        }
        return;
      }

      localStorage.setItem('haas_session_active', 'true');
      toast.success("¡Cuenta creada exitosamente!");
      setSuccessMsg("¡Cuenta creada exitosamente! Redirigiendo...");
      form.reset();
      
      router.push('/reservas');
      router.refresh();
    });
  };

  const handleRecoverSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!recoverEmail) {
      setErrorMsg('Por favor introduzca su correo electrónico.');
      return;
    }

    startRecoverTransition(async () => {
      const { error } = await supabase.auth.resetPasswordForEmail(recoverEmail, {
        redirectTo: `${window.location.origin}/login`
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        toast.success('¡Enlace de recuperación enviado! Revisa tu bandeja de entrada.');
        setSuccessMsg('¡Enlace de recuperación enviado! Revisa tu bandeja de entrada.');
        setRecoverEmail('');
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 py-12 relative overflow-hidden font-sans select-none">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg relative z-10"
      >
        <Card className="border border-slate-200/80 bg-white rounded-3xl overflow-hidden shadow-2xl">
          
          {/* Header Brand Flame */}
          <div className="bg-slate-50 border-b border-slate-100 py-6 text-center flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 bg-[#cc0000]/10 flex items-center justify-center rounded-full border border-[#cc0000]/20 shadow-sm animate-pulse">
              <Flame className="w-6 h-6 text-[#cc0000]" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-base tracking-widest text-slate-900 leading-none">INDUSTRIAS HAAS</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Portal B2B Reservas</span>
            </div>
          </div>

          <Tabs value={isRecovering ? 'login' : undefined} defaultValue="login" className="w-full mt-4">
            <div className="px-8 pt-2">
              {!isRecovering && (
                <TabsList className="grid grid-cols-2 max-w-[320px] mx-auto">
                  <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                  <TabsTrigger value="register">Crear Cuenta</TabsTrigger>
                </TabsList>
              )}
            </div>

            {/* TAB CONTENT: LOGIN / RECOVERY */}
            <TabsContent value="login">
              {isRecovering ? (
                // SUB-FORMULARIO: RECUPERAR CONTRASEÑA
                <>
                  <CardHeader className="space-y-1 text-center pt-2 pb-1">
                    <CardTitle className="text-xl font-black tracking-tight text-slate-900 uppercase">
                      Recuperar Contraseña
                    </CardTitle>
                  </CardHeader>

                  <form onSubmit={handleRecoverSubmit}>
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
                        <Label htmlFor="recover-email" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Correo Electrónico
                        </Label>
                        <Input
                          id="recover-email"
                          type="email"
                          placeholder="ejemplo@correo.com"
                          required
                          value={recoverEmail}
                          onChange={(e) => setRecoverEmail(e.target.value)}
                          disabled={isRecoverPending}
                          className="border-slate-200 bg-white rounded-lg text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#cc0000] focus-visible:border-[#cc0000]"
                        />
                      </div>

                      <div className="pt-2 space-y-3">
                        <Button
                          type="submit"
                          disabled={isRecoverPending}
                          className="w-full bg-[#cc0000] hover:bg-[#a30000] text-white font-bold uppercase tracking-wider text-xs py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-[#cc0000]/10 active:scale-[0.99] cursor-pointer"
                        >
                          {isRecoverPending ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Enviando enlace...
                            </>
                          ) : (
                            'Enviar enlace de recuperación'
                          )}
                        </Button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsRecovering(false);
                            setErrorMsg(null);
                            setSuccessMsg(null);
                          }}
                          className="w-full text-center text-xs font-semibold text-slate-500 hover:text-[#cc0000] transition-colors focus:outline-none"
                        >
                          Volver a Iniciar Sesión
                        </button>
                      </div>
                    </CardContent>
                  </form>
                </>
              ) : (
                // FORMULARIO: LOGIN NORMAL
                <>
                  <CardHeader className="space-y-1 text-center pt-2 pb-1">
                    <CardTitle className="text-xl font-black tracking-tight text-slate-900 uppercase">
                      Acceso al Portal
                    </CardTitle>
                  </CardHeader>

                  <form onSubmit={handleLoginSubmit}>
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

                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Correo Electrónico
                        </Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="ejemplo@correo.com"
                          required
                          disabled={isPending}
                          className="border-slate-200 bg-white rounded-lg text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#cc0000] focus-visible:border-[#cc0000]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Contraseña
                          </Label>
                          <button
                            type="button"
                            onClick={() => {
                              setIsRecovering(true);
                              setErrorMsg(null);
                              setSuccessMsg(null);
                            }}
                            className="text-xs font-semibold text-slate-500 hover:text-[#cc0000] transition-colors focus:outline-none"
                          >
                            ¿Olvidaste tu contraseña?
                          </button>
                        </div>
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          placeholder="••••••••"
                          required
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
                              Validando sesión...
                            </>
                          ) : (
                            'Ingresar'
                          )}
                        </Button>
                      </div>

                      {/* Corporate Footer */}
                      <div className="pt-2">
                        <hr className="border-slate-100 my-4" />
                        
                        <p className="text-center text-[10px] text-slate-400 leading-relaxed font-semibold">
                          Industrias Haas LTDA. - Tradición Alemana.<br />
                          100% Calidad en Cárnicos y Embutidos.
                        </p>
                      </div>
                    </CardContent>
                  </form>
                </>
              )}
            </TabsContent>

            {/* TAB CONTENT: CREAR CUENTA */}
            <TabsContent value="register">
              <CardHeader className="space-y-1 text-center pt-2 pb-1">
                <CardTitle className="text-xl font-black tracking-tight text-slate-900 uppercase">
                  Crear Cuenta
                </CardTitle>
              </CardHeader>

              <form onSubmit={handleRegisterSubmit}>
                <CardContent className="space-y-4 px-8 pb-8 pt-2 text-left">
                  {errorMsg && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg flex items-start gap-2.5 text-xs font-semibold"
                    >
                      <ShieldAlert className="w-4.5 h-4.5 text-red-600 shrink-0 mt-0.5" />
                      <span className="leading-snug">{errorMsg}</span>
                    </motion.div>
                  )}
                  {successMsg && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg flex items-start gap-2.5 text-xs font-semibold"
                    >
                      <ShieldCheck className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="leading-snug">{successMsg}</span>
                    </motion.div>
                  )}

                  {/* Nombres y Apellidos */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-nombres" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Nombres *
                      </Label>
                      <Input
                        id="reg-nombres"
                        name="nombres"
                        placeholder="Juan"
                        required
                        disabled={isRegisterPending}
                        className="border-slate-200 bg-white rounded-lg text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#cc0000] focus-visible:border-[#cc0000] text-xs h-9"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="reg-apellidos" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Apellidos *
                      </Label>
                      <Input
                        id="reg-apellidos"
                        name="apellidos"
                        placeholder="Pérez"
                        required
                        disabled={isRegisterPending}
                        className="border-slate-200 bg-white rounded-lg text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#cc0000] focus-visible:border-[#cc0000] text-xs h-9"
                      />
                    </div>
                  </div>

                  {/* Correo y Contraseña */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-email" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Correo Electrónico *
                      </Label>
                      <Input
                        id="reg-email"
                        name="email"
                        type="email"
                        placeholder="juan@correo.com"
                        required
                        disabled={isRegisterPending}
                        className="border-slate-200 bg-white rounded-lg text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#cc0000] focus-visible:border-[#cc0000] text-xs h-9"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="reg-password" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Contraseña *
                      </Label>
                      <Input
                        id="reg-password"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        required
                        disabled={isRegisterPending}
                        className="border-slate-200 bg-white rounded-lg text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#cc0000] focus-visible:border-[#cc0000] text-xs h-9"
                      />
                    </div>
                  </div>

                  {/* Fecha de Nacimiento y Género */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-birthdate" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Fecha de Nacimiento (Opcional)
                      </Label>
                      <Input
                        id="reg-birthdate"
                        name="birthDate"
                        type="date"
                        disabled={isRegisterPending}
                        className="border-slate-200 bg-white rounded-lg text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#cc0000] focus-visible:border-[#cc0000] text-xs h-9"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="reg-gender" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Género (Opcional)
                      </Label>
                      <Select
                        value={gender}
                        onValueChange={(val) => setGender(val || "Prefiero no decirlo")}
                        disabled={isRegisterPending}
                      >
                        <SelectTrigger
                          id="reg-gender"
                          className="border-slate-200 bg-white rounded-lg text-slate-900 placeholder:text-slate-400 focus:ring-[#cc0000] focus:border-[#cc0000] text-xs h-9"
                        >
                          <SelectValue placeholder="Género" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Masculino">Masculino</SelectItem>
                          <SelectItem value="Femenino">Femenino</SelectItem>
                          <SelectItem value="Prefiero no decirlo">Prefiero no decirlo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={isRegisterPending}
                      className="w-full bg-[#cc0000] hover:bg-[#a30000] text-white font-bold uppercase tracking-wider text-xs py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-[#cc0000]/10 active:scale-[0.99] cursor-pointer"
                    >
                      {isRegisterPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Creando cuenta...
                        </>
                      ) : (
                        'Crear mi cuenta'
                      )}
                    </Button>
                  </div>

                  <p className="text-center text-[10px] text-slate-400 font-semibold leading-relaxed mt-2">
                    Al registrarte, confirmas que eres mayor de edad para consolidar reservas.
                  </p>
                </CardContent>
              </form>
            </TabsContent>
          </Tabs>

        </Card>
      </motion.div>
    </div>
  );
}
