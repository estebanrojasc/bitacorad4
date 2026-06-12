"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Button, Card, Field } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const path =
        mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "login"
          ? { email, password }
          : { name, email, password };
      await api(path, { method: "POST", body: JSON.stringify(body) });
      router.replace("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-5">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-600 text-4xl shadow-xl shadow-brand-600/40">
            📒
          </div>
          <h1 className="text-3xl font-extrabold text-ink">Bitácora del Aula</h1>
          <p className="mt-2 text-ink/60">
            Graba, transcribe y genera bitácoras de tus estudiantes.
          </p>
        </div>

        <Card>
          <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-brand-50 p-1">
            <button
              onClick={() => setMode("login")}
              className={`rounded-xl py-2.5 text-sm font-semibold transition ${
                mode === "login"
                  ? "bg-white text-brand-700 shadow"
                  : "text-ink/50"
              }`}
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => setMode("register")}
              className={`rounded-xl py-2.5 text-sm font-semibold transition ${
                mode === "register"
                  ? "bg-white text-brand-700 shadow"
                  : "text-ink/50"
              }`}
            >
              Crear cuenta
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && (
              <Field
                label="Tu nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Prof. Ana López"
                required
              />
            )}
            <Field
              label="Correo"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="docente@escuela.com"
              required
            />
            <Field
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            {error && (
              <p className="rounded-2xl bg-coral-400/15 px-4 py-3 text-sm font-medium text-coral-600">
                {error}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              loading={loading}
              className="w-full"
            >
              {mode === "login" ? "Entrar" : "Crear mi cuenta"}
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-xs text-ink/40">
          Tu sesión queda guardada para no ingresar cada vez.
        </p>
      </div>
    </main>
  );
}
