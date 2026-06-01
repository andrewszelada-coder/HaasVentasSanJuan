'use client';

import React, { useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/actions';
import { ClipboardList, PackagePlus, ArrowLeft, LogOut, Loader2 } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const menuItems = [
    {
      name: 'Gestión Reservas',
      href: '/admin/pedidos',
      icon: <ClipboardList className="w-4 h-4" />
    },
    {
      name: 'Gestión Promos',
      href: '/admin/promos',
      icon: <PackagePlus className="w-4 h-4" />
    }
  ];

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
    });
  };

  return (
    <div className="min-h-screen flex bg-[#F8FAFC]">
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-100 flex flex-col justify-between shrink-0 sticky top-0 h-screen">
        <div>
          {/* Logo */}
          <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-100">
            <Image 
              src="/logo-haas.png" 
              alt="Haas Logo" 
              width={40} 
              height={40} 
              className="w-10 h-10 rounded-full object-cover shadow-sm border-2 border-gray-200"
            />
            <span className="font-bold text-[#0F172A] text-sm tracking-tight">PORTAL GERENCIAL</span>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {menuItems.map(item => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <span className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-emerald-800/5 text-[#166534] border border-emerald-800/10'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}>
                    {item.icon}
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-100 space-y-2">
          <Link href="/reservas">
            <span className="flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
              Portal Cliente
            </span>
          </Link>
          <button
            onClick={handleLogout}
            disabled={isPending}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin text-red-600" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-8 shrink-0 relative overflow-hidden">
          <div className="flex items-center gap-3 z-10">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
            <span className="text-xs font-mono font-bold text-slate-600">Servicio Activo</span>
          </div>
          
          <div className="h-11 w-64 md:w-80 rounded-lg overflow-hidden border border-slate-200 shadow-sm relative z-10">
            <Image 
              src="/banner-haas.jpg" 
              alt="Haas Banner" 
              fill
              className="object-cover"
              priority
            />
          </div>
        </header>

        {/* Children Render */}
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>

    </div>
  );
}

