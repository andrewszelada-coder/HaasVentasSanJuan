'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/actions';
import { ClipboardList, PackagePlus, ArrowLeft, LogOut, Loader2, Menu, X } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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

  const renderSidebarContent = () => (
    <div className="flex flex-col justify-between h-full bg-white select-none">
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
              <Link 
                key={item.href} 
                href={item.href}
                onClick={() => setIsMobileSidebarOpen(false)}
              >
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
        <Link 
          href="/reservas"
          onClick={() => setIsMobileSidebarOpen(false)}
        >
          <span className="flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
            Portal Cliente
          </span>
        </Link>
        <button
          onClick={handleLogout}
          disabled={isPending}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin text-red-600" />
          ) : (
            <LogOut className="w-4 h-4" />
          )}
          Cerrar Sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC] font-sans">
      
      {/* 📱 Mobile Top Bar Header */}
      <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 shrink-0 md:hidden z-30 sticky top-0 w-full shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-50 border border-slate-200 transition-colors cursor-pointer"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Image 
              src="/logo-haas.png" 
              alt="Haas Logo" 
              width={30} 
              height={30} 
              className="w-8 h-8 rounded-full object-cover"
            />
            <span className="font-bold text-[#0F172A] text-xs tracking-tight uppercase">Haas Gerente</span>
          </div>
        </div>

        <div className="h-9 w-28 rounded overflow-hidden border border-slate-200 relative">
          <Image 
            src="/banner-haas.jpg" 
            alt="Haas Banner" 
            fill
            className="object-cover"
            priority
          />
        </div>
      </header>

      {/* 📱 Mobile Drawer Sidebar with Backdrop Overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop Blur */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          />

          {/* Drawer Content */}
          <aside className="relative flex flex-col w-64 max-w-xs h-full bg-white border-r border-slate-200 shadow-xl transition-transform duration-300 z-10">
            {/* Close Button Inside Drawer */}
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors border border-slate-200 cursor-pointer"
              aria-label="Cerrar menú"
            >
              <X className="w-4 h-4" />
            </button>
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* 🖥️ Desktop Sidebar (Static left panel) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-100 shrink-0 sticky top-0 h-screen">
        {renderSidebarContent()}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* 🖥️ Desktop Header (Hidden on Mobile) */}
        <header className="hidden md:flex h-16 bg-white border-b border-slate-100 items-center justify-between px-8 shrink-0 relative overflow-hidden">
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
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>

    </div>
  );
}
