import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bitácora del Aula",
    short_name: "Bitácora",
    description:
      "Graba, transcribe y genera bitácoras de tus estudiantes de forma fácil.",
    start_url: "/app",
    display: "standalone",
    background_color: "#f5f3ff",
    theme_color: "#6366f1",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
