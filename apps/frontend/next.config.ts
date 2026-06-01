import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'xymvwsnyvpupejjcsuxz.supabase.co',
      },
    ],
  },
  eslint: {
    // Desactiva la verificación estricta de ESLint durante el despliegue en Vercel
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;