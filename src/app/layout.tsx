import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Personal Task OS",
  description: "Un sistema operativo minimalista y ultra-rápido para gestionar tus pendientes en tiempo real.",
  keywords: ["task manager", "todo", "productivity", "minimalist", "supabase", "nextjs"],
  authors: [{ name: "Personal Task OS" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-slate-950 text-slate-50 flex flex-col font-sans select-none md:select-text">
        {children}
      </body>
    </html>
  );
}
