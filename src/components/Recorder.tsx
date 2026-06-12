"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./ui";

type Status = "idle" | "recording" | "paused" | "recorded";

export type RecordedAudio = {
  blob: Blob;
  durationSec: number;
  mimeType: string;
  ext: string;
};

function pickMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c))
      return c;
  }
  return "";
}

function extFor(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function Recorder({
  onSave,
  onCancel,
  saving,
}: {
  onSave: (audio: RecordedAudio) => void;
  onCancel: () => void;
  saving?: boolean;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultRef = useRef<RecordedAudio | null>(null);

  // Visualizador
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cleanup() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
  }

  function drawWave() {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const bufferLength = analyser.frequencyBinCount;
    const data = new Uint8Array(bufferLength);

    const render = () => {
      rafRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(data);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bars = 32;
      const step = Math.floor(bufferLength / bars);
      const barWidth = canvas.width / bars;
      for (let i = 0; i < bars; i++) {
        const v = data[i * step] / 255;
        const h = Math.max(4, v * canvas.height);
        ctx.fillStyle = `rgba(99, 102, 241, ${0.4 + v * 0.6})`;
        const x = i * barWidth;
        const y = (canvas.height - h) / 2;
        ctx.beginPath();
        ctx.roundRect(x + barWidth * 0.2, y, barWidth * 0.6, h, 4);
        ctx.fill();
      }
    };
    render();
  }

  async function start() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000,
        },
      });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      const mr = new MediaRecorder(
        stream,
        mimeType
          ? { mimeType, audioBitsPerSecond: 128000 }
          : { audioBitsPerSecond: 128000 },
      );
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const type = mr.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        resultRef.current = {
          blob,
          durationSec: seconds,
          mimeType: type,
          ext: extFor(type),
        };
        setAudioUrl(URL.createObjectURL(blob));
        setStatus("recorded");
      };
      mediaRecorderRef.current = mr;
      mr.start(250);

      // Visualizador
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      analyserRef.current = analyser;
      drawWave();

      setSeconds(0);
      setStatus("recording");
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError(
        "No se pudo acceder al micrófono. Revisa los permisos del navegador.",
      );
    }
  }

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
  }

  function togglePause() {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    if (status === "recording") {
      mr.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      setStatus("paused");
    } else if (status === "paused") {
      mr.resume();
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      setStatus("recording");
    }
  }

  function discard() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    resultRef.current = null;
    setSeconds(0);
    setStatus("idle");
  }

  function save() {
    if (resultRef.current) onSave(resultRef.current);
  }

  const timerColor =
    seconds < 30
      ? "text-mint-600"
      : seconds < 120
        ? "text-sun-500"
        : "text-coral-600";

  return (
    <div className="flex flex-col items-center gap-5">
      {error && (
        <p className="rounded-2xl bg-coral-400/15 px-4 py-3 text-center text-sm font-medium text-coral-600">
          {error}
        </p>
      )}

      {/* Temporizador */}
      <div className={`text-5xl font-black tabular-nums ${timerColor}`}>
        {fmt(seconds)}
      </div>

      {/* Onda / visualizador */}
      <canvas
        ref={canvasRef}
        width={320}
        height={80}
        className={`h-20 w-full max-w-xs ${
          status === "recording" ? "opacity-100" : "opacity-30"
        }`}
      />

      {/* Revisión */}
      {status === "recorded" && audioUrl && (
        <audio controls src={audioUrl} className="w-full max-w-xs" />
      )}

      {/* Controles */}
      {status === "idle" && (
        <button
          onClick={start}
          className="flex h-32 w-32 items-center justify-center rounded-full bg-coral-500 text-6xl text-white shadow-2xl shadow-coral-500/40 transition active:scale-90"
          aria-label="Iniciar grabación"
        >
          🎙️
        </button>
      )}

      {(status === "recording" || status === "paused") && (
        <div className="flex items-center gap-4">
          <Button variant="soft" size="lg" onClick={togglePause}>
            {status === "recording" ? "⏸ Pausar" : "▶ Reanudar"}
          </Button>
          <button
            onClick={stop}
            className="flex h-24 w-24 items-center justify-center rounded-full bg-coral-500 text-white shadow-2xl shadow-coral-500/40 transition active:scale-90 animate-pulse-ring"
            aria-label="Detener grabación"
          >
            <span className="h-8 w-8 rounded-md bg-white" />
          </button>
        </div>
      )}

      {status === "recorded" && (
        <div className="flex w-full max-w-xs flex-col gap-3">
          <Button variant="success" size="lg" loading={saving} onClick={save}>
            💾 Guardar grabación
          </Button>
          <Button variant="ghost" size="md" onClick={discard} disabled={saving}>
            🔁 Volver a grabar
          </Button>
        </div>
      )}

      {status === "idle" && (
        <Button variant="ghost" size="md" onClick={onCancel}>
          Cancelar
        </Button>
      )}
    </div>
  );
}
