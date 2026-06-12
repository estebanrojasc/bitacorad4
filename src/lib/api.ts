import { NextResponse } from "next/server";
import { getSession, type SessionPayload } from "./auth";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Obtiene la sesión o lanza 401. Úsalo al inicio de los handlers protegidos. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new ApiError("No autorizado", 401);
  return session;
}

/** Indica si la sesión corresponde a una cuenta administradora. */
export function isAdmin(session: SessionPayload): boolean {
  return session.role === "admin";
}

/**
 * Filtro de pertenencia por docente para las consultas a la base de datos.
 *
 * - Un docente normal solo accede a sus propios datos (filtra por su teacherId),
 *   por lo que su sesión nunca puede ver lo de otro docente.
 * - Una cuenta administradora (definida en base de datos) no aplica filtro y
 *   puede ver y gestionar los datos de todos los docentes.
 */
export function teacherScope(
  session: SessionPayload,
): Record<string, never> | { teacherId: string } {
  return isAdmin(session) ? {} : { teacherId: session.teacherId };
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

/** Convierte cualquier error en una respuesta JSON consistente. */
export function fail(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("[API] Error inesperado:", error);
  const message =
    error instanceof Error ? error.message : "Error interno del servidor";
  return NextResponse.json({ error: message }, { status: 500 });
}
