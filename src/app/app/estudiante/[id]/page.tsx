"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api, type BitacoraEntry, type Student } from "@/lib/client";
import { Avatar, Button, Card, Spinner } from "@/components/ui";
import { Recorder, type RecordedAudio } from "@/components/Recorder";
import { Timeline } from "@/components/Timeline";
import { queueRecording, countPending } from "@/lib/offline";
import { syncPending } from "@/lib/sync";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export default function StudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [student, setStudent] = useState<Student | null>(null);
  const [entries, setEntries] = useState<BitacoraEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(0);
  const [notice, setNotice] = useState("");

  // Flujo de nueva bitácora
  const [step, setStep] = useState<"none" | "date" | "record">("none");
  const [date, setDate] = useState(todayStr());
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const [{ student }, { entries }] = await Promise.all([
      api<{ student: Student }>(`/api/students/${id}`),
      api<{ entries: BitacoraEntry[] }>(`/api/students/${id}/bitacora`),
    ]);
    setStudent(student);
    setEntries(entries);
    setPending(await countPending());
  }

  async function load() {
    try {
      await refresh();
      // Intenta subir lo que esté en cola offline.
      const res = await syncPending();
      if (res.uploaded > 0) {
        setNotice("");
        await refresh();
      }
      if (res.blocked && (await countPending()) > 0) {
        setNotice(
          "Tienes grabaciones guardadas en este dispositivo. Se subirán automáticamente cuando configures Google Cloud Storage.",
        );
      } else if (res.errors.length > 0) {
        setNotice(`No se pudo subir: ${res.errors[0]}`);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const onOnline = () => load();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function confirmDate() {
    setSaving(true);
    try {
      const { entry } = await api<{ entry: BitacoraEntry }>(
        `/api/students/${id}/bitacora`,
        { method: "POST", body: JSON.stringify({ date }) },
      );
      setActiveEntryId(entry._id);
      setStep("record");
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleSave(audio: RecordedAudio) {
    if (!activeEntryId) return;
    setSaving(true);
    try {
      await queueRecording({
        studentId: id,
        entryId: activeEntryId,
        date,
        blob: audio.blob,
        mimeType: audio.mimeType,
        ext: audio.ext,
        durationSec: audio.durationSec,
        sizeBytes: audio.blob.size,
        note: "",
      });
      const res = await syncPending();
      setStep("none");
      setActiveEntryId(null);
      await refresh();
      if (res.blocked) {
        setNotice(
          "Grabación guardada en este dispositivo. Se subirá cuando configures Google Cloud Storage.",
        );
      } else if (res.errors.length > 0) {
        setNotice(`No se pudo subir: ${res.errors[0]}`);
      } else if (res.uploaded > 0) {
        setNotice("");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-brand-500">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/app" className="text-sm font-semibold text-brand-700">
        ← Volver
      </Link>

      {student && (
        <div className="flex items-center gap-4">
          <Avatar name={student.name} color={student.color} size={60} />
          <div>
            <h1 className="text-2xl font-extrabold text-ink">{student.name}</h1>
            <p className="text-ink/60">{student.course}</p>
          </div>
        </div>
      )}

      {notice && (
        <div className="rounded-2xl bg-sun-400/20 px-4 py-3 text-sm font-medium text-sun-500">
          {notice}
        </div>
      )}

      {pending > 0 && (
        <div className="rounded-2xl bg-brand-100 px-4 py-3 text-sm font-medium text-brand-700">
          📥 {pending} grabación(es) pendiente(s) de subir en este dispositivo.
        </div>
      )}

      {/* Botón gigante para nueva grabación */}
      {step === "none" && (
        <Button
          size="xl"
          variant="primary"
          className="w-full"
          onClick={() => {
            setDate(todayStr());
            setStep("date");
          }}
        >
          🎙️ Nueva grabación
        </Button>
      )}

      {/* Elegir fecha */}
      {step === "date" && (
        <Card className="space-y-4">
          <h2 className="text-lg font-bold text-ink">
            ¿De qué día es esta bitácora?
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setDate(todayStr())}
              className={`rounded-2xl py-4 font-semibold transition ${
                date === todayStr()
                  ? "bg-brand-600 text-white shadow-lg"
                  : "bg-brand-50 text-brand-700"
              }`}
            >
              📅 Hoy
            </button>
            <label
              className={`flex flex-col items-center justify-center rounded-2xl py-4 font-semibold transition ${
                date !== todayStr()
                  ? "bg-brand-600 text-white shadow-lg"
                  : "bg-brand-50 text-brand-700"
              }`}
            >
              Otra fecha
              <input
                type="date"
                value={date}
                max={todayStr()}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 rounded-lg bg-white/90 px-2 py-1 text-sm text-ink"
              />
            </label>
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              size="lg"
              className="flex-1"
              onClick={() => setStep("none")}
            >
              Cancelar
            </Button>
            <Button
              size="lg"
              className="flex-1"
              loading={saving}
              onClick={confirmDate}
            >
              Continuar
            </Button>
          </div>
        </Card>
      )}

      {/* Grabador */}
      {step === "record" && (
        <Card>
          <p className="mb-4 text-center text-sm font-semibold text-ink/60">
            Bitácora del {date}
          </p>
          <Recorder
            saving={saving}
            onSave={handleSave}
            onCancel={() => {
              setStep("none");
              setActiveEntryId(null);
            }}
          />
        </Card>
      )}

      {/* Timeline */}
      <Timeline
        entries={entries}
        onTranscribe={async (entryId, recId) => {
          await api(
            `/api/bitacora/${entryId}/recordings/${recId}/transcribe`,
            { method: "POST" },
          );
          await refresh();
        }}
        onGenerateReport={async (entryId) => {
          await api(`/api/bitacora/${entryId}/report`, { method: "POST" });
          await refresh();
        }}
        onAddRecording={(entryId, entryDate) => {
          setDate(entryDate.slice(0, 10));
          setActiveEntryId(entryId);
          setStep("record");
        }}
      />
    </div>
  );
}
