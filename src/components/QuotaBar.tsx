"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Card } from "./ui";

type Quota = {
  storage: { usedBytes: number; maxBytes: number };
  egress: { usedBytes: number; maxBytes: number };
  classA: { used: number; max: number };
  classB: { used: number; max: number };
  qwen: { usedSeconds: number; maxSeconds: number };
  gemini: { usedRequests: number; maxRequests: number };
  configured: { storage: boolean; qwen: boolean; gemini: boolean };
};

function fmtBytes(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

export function QuotaBar() {
  const [quota, setQuota] = useState<Quota | null>(null);

  useEffect(() => {
    api<Quota>("/api/quota")
      .then(setQuota)
      .catch(() => {});
  }, []);

  if (!quota) return null;

  return (
    <Card className="space-y-4">
      <Meter
        label="Almacenamiento"
        used={quota.storage.usedBytes}
        max={quota.storage.maxBytes}
        format={fmtBytes}
      />
      <Meter
        label="Descargas este mes"
        used={quota.egress.usedBytes}
        max={quota.egress.maxBytes}
        format={fmtBytes}
      />
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge ok={quota.configured.storage} label="Storage" />
        <Badge ok={quota.configured.qwen} label="Qwen" />
        <Badge ok={quota.configured.gemini} label="Gemini" />
      </div>
    </Card>
  );
}

function Meter({
  label,
  used,
  max,
  format,
}: {
  label: string;
  used: number;
  max: number;
  format: (n: number) => string;
}) {
  const pct = max > 0 ? Math.min(100, (used / max) * 100) : 0;
  const warn = pct > 80;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-ink/80">{label}</span>
        <span
          className={`text-sm font-bold ${warn ? "text-coral-600" : "text-brand-700"}`}
        >
          {format(used)} / {format(max)}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-brand-100">
        <div
          className={`h-full rounded-full transition-all ${
            warn ? "bg-coral-500" : "bg-mint-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${
        ok ? "bg-mint-500/15 text-mint-600" : "bg-sun-400/20 text-sun-500"
      }`}
    >
      {ok ? "✓" : "○"} {label}
      {!ok && " pendiente"}
    </span>
  );
}
