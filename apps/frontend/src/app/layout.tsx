import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HAAS SAN JUAN RESERVAS • Portal B2B",
  description: "Plataforma de reservas anticipadas y planificación de producción para la campaña parrillera San Juan 2026 - Industrias Haas Ltda.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F8FAFC]">
        <main className="flex-1 flex flex-col">{children}</main>
        <Toaster position="top-right" closeButton richColors theme="light" />
      </body>
    </html>
  );
}
