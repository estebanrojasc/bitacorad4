/**
 * Acceso centralizado a variables de entorno.
 * Los servicios externos (GCS, Qwen, Gemini) son opcionales al inicio:
 * la app funciona y avisa cuando un servicio aún no está configurado.
 */

function optional(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

// La private key de la cuenta de servicio suele venir con saltos de línea
// escapados (\n) cuando se guarda en una variable de entorno de una sola línea.
function normalizeKey(raw?: string): string | undefined {
  if (!raw) return undefined;
  return raw.replace(/\\n/g, "\n");
}

const GB = 1024 * 1024 * 1024;

export const env = {
  mongoUri: optional("MONGODB_URI") ?? "mongodb://127.0.0.1:27017/bitacora",
  // Nombre de la base. Útil cuando la URI no lo incluye (Atlas suele omitirlo).
  mongoDbName: optional("MONGODB_DB_NAME") ?? "bitacora",
  jwtSecret: optional("JWT_SECRET") ?? "dev-secret-cambia-esto-en-produccion",

  // Token para proteger el endpoint de diagnóstico (/api/health) en producción.
  diagnosticsToken: optional("DIAGNOSTICS_TOKEN"),

  // Google Cloud Storage (almacenamiento de audio)
  gcs: {
    bucket: optional("GCS_BUCKET"),
    projectId: optional("GCS_PROJECT_ID"),
    clientEmail: optional("GCS_CLIENT_EMAIL"),
    privateKey: normalizeKey(optional("GCS_PRIVATE_KEY")),
  },

  // DashScope / Qwen (transcripción)
  dashscope: {
    apiKey: optional("DASHSCOPE_API_KEY"),
    // true si la cuenta es región internacional (endpoint dashscope-intl)
    international: optional("DASHSCOPE_INTERNATIONAL") === "true",
  },

  // Gemini (reportes y transcripción de respaldo)
  gemini: {
    apiKey: optional("GEMINI_API_KEY"),
  },

  // Límites del guardián de cuotas (free tier seguro de GCS "Always Free")
  quota: {
    // Almacenamiento total: 5 GB-mes gratis
    storageMaxBytes: Number(optional("STORAGE_MAX_BYTES") ?? 5 * GB),
    // Salida de red (descargas): 100 GB/mes gratis
    egressMaxBytesPerMonth: Number(optional("EGRESS_MAX_BYTES") ?? 100 * GB),
    // Operaciones Clase A (subidas/escrituras): 5.000/mes gratis
    classAMaxPerMonth: Number(optional("CLASS_A_MAX") ?? 5000),
    // Operaciones Clase B (lecturas/descargas): 50.000/mes gratis
    classBMaxPerMonth: Number(optional("CLASS_B_MAX") ?? 50000),
    // Tope mensual de segundos de audio a transcribir (Qwen)
    qwenMaxSecondsPerMonth: Number(
      optional("QWEN_MAX_SECONDS_PER_MONTH") ?? 60 * 60 * 30, // 30 h/mes
    ),
    // Tope mensual de reportes Gemini
    geminiMaxRequestsPerMonth: Number(
      optional("GEMINI_MAX_REQUESTS_PER_MONTH") ?? 1500,
    ),
  },
};

export const isStorageConfigured = () =>
  Boolean(
    env.gcs.bucket &&
      ((env.gcs.clientEmail && env.gcs.privateKey) ||
        process.env.GOOGLE_APPLICATION_CREDENTIALS),
  );

export const isQwenConfigured = () => Boolean(env.dashscope.apiKey);
export const isGeminiConfigured = () => Boolean(env.gemini.apiKey);
