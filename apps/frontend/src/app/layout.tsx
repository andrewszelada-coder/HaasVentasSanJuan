import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
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
      className={`${plusJakarta.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground selection:bg-[#cc0000] selection:text-white antialiased">
        <main className="flex-1 flex flex-col">{children}</main>
        <Toaster position="top-right" closeButton richColors theme="light" />
      </body>
    </html>
  );
}
