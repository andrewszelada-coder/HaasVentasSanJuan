'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ReservasCheckoutRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/checkout');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">
      <div className="text-center space-y-2">
        <span className="block text-xs text-gray-500 font-mono">Redireccionando al portal de reservas premium...</span>
      </div>
    </div>
  );
}
