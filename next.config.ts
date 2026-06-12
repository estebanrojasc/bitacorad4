import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @google-cloud/storage usa dependencias nativas/dinámicas que no deben
  // pasar por el bundler; Node las resuelve en runtime en el servidor.
  serverExternalPackages: ["@google-cloud/storage"],

  // Permite acceder al servidor de desarrollo desde túneles HTTPS
  // (útil para probar el micrófono/PWA desde el teléfono).
  allowedDevOrigins: [
    "wyoming-screensavers-heating-stack.trycloudflare.com",
    "*.trycloudflare.com",
    "*.ngrok-free.app",
    "*.loca.lt",
  ],
};

export default nextConfig;
