"use client";

import { useState } from "react";
import { type BitacoraEntry, type Recording, type Report } from "@/lib/client";
import { Button, Card, Spinner } from "./ui";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function Timeline({
  entries,
  onTranscribe,
  onGenerateReport,
  onAddRecording,
}: {
  entries: BitacoraEntry[];
  onTranscribe: (entryId: string, recId: string) => Promise<void>;
  onGenerateReport: (entryId: string) => Promise<void>;
  onAddRecording: (entryId: string, entryDate: string) => void;
}) {
  if (entries.length === 0) {
    return (
      <Card className="text-center">
        <p className="py-8 text-ink/60">
          Aún no hay registros. Crea la primera grabación con el botón de arriba.
        </p>
      </Card>
    );
  }

  return (
    <div className="relative space-y-6 pl-6">
      <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-brand-200" />
      {entries.map((entry) => (
        <EntryCard
          key={entry._id}
          entry={entry}
          onTranscribe={onTranscribe}
          onGenerateReport={onGenerateReport}
          onAddRecording={onAddRecording}
        />
      ))}
    </div>
  );
}

function EntryCard({
  entry,
  onTranscribe,
  onGenerateReport,
  onAddRecording,
}: {
  entry: BitacoraEntry;
  onTranscribe: (entryId: string, recId: string) => Promise<void>;
  onGenerateReport: (entryId: string) => Promise<void>;
  onAddRecording: (entryId: string, entryDate: string) => void;
}) {
  const [busy, setBusy] = useState<string>("");

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy("");
    }
  }

  const hasTranscripts = entry.recordings.some(
    (r) => r.transcriptionStatus === "done" && r.transcription,
  );

  return (
    <div className="relative">
      <span className="absolute -left-6 top-2 h-4 w-4 rounded-full border-4 border-paper bg-brand-600" />
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold capitalize text-ink">
            {formatDate(entry.date)}
          </h3>
          <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-bold text-brand-700">
            {entry.recordings.length} 🎙️
          </span>
        </div>

        {entry.recordings.map((rec) => (
          <RecordingRow
            key={rec._id}
            rec={rec}
            busy={busy === `t-${rec._id}`}
            onTranscribe={() =>
              run(`t-${rec._id}`, () => onTranscribe(entry._id, rec._id))
            }
          />
        ))}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="soft"
            size="md"
            onClick={() => onAddRecording(entry._id, entry.date)}
          >
            ➕ Añadir grabación
          </Button>
          {hasTranscripts && (
            <Button
              variant="primary"
              size="md"
              loading={busy === "report"}
              onClick={() => run("report", () => onGenerateReport(entry._id))}
            >
              ✨ {entry.report ? "Regenerar" : "Generar"} reporte
            </Button>
          )}
        </div>

        {entry.report && <ReportView report={entry.report} />}
      </Card>
    </div>
  );
}

function RecordingRow({
  rec,
  busy,
  onTranscribe,
}: {
  rec: Recording;
  busy: boolean;
  onTranscribe: () => void;
}) {
  return (
    <div className="rounded-2xl bg-brand-50/60 p-3">
      <div className="flex items-center gap-3">
        {rec.playbackUrl ? (
          <audio controls src={rec.playbackUrl} className="h-9 flex-1" />
        ) : (
          <span className="flex-1 text-sm text-ink/50">
            🎧 Audio guardado{" "}
            {rec.durationSec ? `(${rec.durationSec}s)` : ""}
          </span>
        )}
        <TranscriptStatus status={rec.transcriptionStatus} />
      </div>

      {rec.transcription && (
        <p className="mt-2 rounded-xl bg-white/80 p-3 text-sm text-ink/80">
          {rec.transcription}
          {rec.transcriptionProvider && (
            <span className="ml-2 text-xs text-ink/40">
              · {rec.transcriptionProvider}
            </span>
          )}
        </p>
      )}

      {rec.transcriptionStatus !== "done" && (
        <div className="mt-2">
          <Button
            variant="ghost"
            size="md"
            loading={busy || rec.transcriptionStatus === "processing"}
            onClick={onTranscribe}
          >
            📝 Transcribir
          </Button>
        </div>
      )}
    </div>
  );
}

function TranscriptStatus({ status }: { status: Recording["transcriptionStatus"] }) {
  const map = {
    pending: { label: "Sin transcribir", cls: "bg-brand-100 text-brand-600" },
    processing: { label: "Procesando…", cls: "bg-sun-400/20 text-sun-500" },
    done: { label: "Transcrito", cls: "bg-mint-500/15 text-mint-600" },
    error: { label: "Error", cls: "bg-coral-400/15 text-coral-600" },
  } as const;
  const s = map[status];
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${s.cls}`}>
      {status === "processing" && <Spinner className="mr-1 inline h-3 w-3" />}
      {s.label}
    </span>
  );
}

function ReportView({ report }: { report: Report }) {
  return (
    <div className="space-y-3 rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100/50 p-4">
      <h4 className="flex items-center gap-2 font-bold text-brand-700">
        ✨ Reporte generado
      </h4>
      <Section title="Resumen" text={report.resumen} />
      <Section title="Aspectos académicos" text={report.aspectosAcademicos} />
      <Section title="Comportamiento" text={report.comportamiento} />
      <Section
        title="Socioemocional"
        text={report.aspectosSocioemocionales}
      />
      <ListSection title="Logros" items={report.logros} />
      <ListSection title="Áreas de mejora" items={report.areasDeMejora} />
      <ListSection title="Recomendaciones" items={report.recomendaciones} />
      <Section title="Seguimiento sugerido" text={report.seguimientoSugerido} />
    </div>
  );
}

function Section({ title, text }: { title: string; text: string }) {
  if (!text) return null;
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-brand-600/70">
        {title}
      </p>
      <p className="text-sm text-ink/80">{text}</p>
    </div>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-brand-600/70">
        {title}
      </p>
      <ul className="list-inside list-disc text-sm text-ink/80">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}
