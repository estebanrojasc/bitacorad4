"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Student } from "@/lib/client";
import { Avatar, Button, Card, Field, Spinner } from "@/components/ui";
import { QuotaBar } from "@/components/QuotaBar";

export default function DashboardPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [course, setCourse] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const { students } = await api<{ students: Student[] }>("/api/students");
      setStudents(students);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createStudent(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api("/api/students", {
        method: "POST",
        body: JSON.stringify({ name, course }),
      });
      setName("");
      setCourse("");
      setCreating(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <QuotaBar />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-ink">Mis estudiantes</h1>
        <Button size="md" onClick={() => setCreating((v) => !v)}>
          {creating ? "Cerrar" : "+ Nuevo"}
        </Button>
      </div>

      {creating && (
        <Card>
          <form onSubmit={createStudent} className="space-y-4">
            <Field
              label="Nombre del estudiante"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Juan Pérez"
              required
            />
            <Field
              label="Curso"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              placeholder="3° Básico A"
              required
            />
            {error && (
              <p className="text-sm font-medium text-coral-600">{error}</p>
            )}
            <Button type="submit" size="lg" loading={saving} className="w-full">
              Guardar estudiante
            </Button>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-brand-500">
          <Spinner className="h-8 w-8" />
        </div>
      ) : students.length === 0 ? (
        <Card className="text-center">
          <p className="py-8 text-ink/60">
            Aún no tienes estudiantes. Crea el primero con el botón
            <span className="font-semibold text-brand-700"> + Nuevo</span>.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {students.map((s) => (
            <Link key={s._id} href={`/app/estudiante/${s._id}`}>
              <Card className="flex items-center gap-4 transition-transform hover:-translate-y-0.5">
                <Avatar name={s.name} color={s.color} />
                <div className="min-w-0">
                  <p className="truncate font-bold text-ink">{s.name}</p>
                  <p className="truncate text-sm text-ink/60">{s.course}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
