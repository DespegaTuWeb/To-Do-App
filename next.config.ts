import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite conexiones HMR desde dispositivos en la red local (ej: celular en la misma WiFi).
  // Ajusta esta IP a la IP local de tu máquina (puedes verla con `ipconfig` en Windows).
  allowedDevOrigins: ['192.168.0.100', '192.168.1.100'],
};

export default nextConfig;
