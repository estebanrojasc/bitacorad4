"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "success" | "danger" | "ghost" | "soft";
type Size = "md" | "lg" | "xl";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-600/30",
  success:
    "bg-mint-500 text-white hover:bg-mint-600 shadow-lg shadow-mint-500/30",
  danger:
    "bg-coral-500 text-white hover:bg-coral-600 shadow-lg shadow-coral-500/30",
  ghost: "bg-transparent text-brand-700 hover:bg-brand-100",
  soft: "bg-white text-brand-700 hover:bg-brand-50 shadow-sm ring-1 ring-brand-100",
};

const sizes: Record<Size, string> = {
  md: "px-4 py-2.5 text-sm rounded-xl",
  lg: "px-6 py-3.5 text-base rounded-2xl",
  xl: "px-8 py-5 text-lg rounded-3xl",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  loading,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl bg-white/80 backdrop-blur p-5 shadow-xl shadow-brand-900/5 ring-1 ring-brand-100/70 ${className}`}
    >
      {children}
    </div>
  );
}

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

export function Avatar({
  name,
  color,
  size = 48,
}: {
  name: string;
  color: string;
  size?: number;
}) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div
      className="flex items-center justify-center rounded-2xl font-bold text-white shadow-md"
      style={{ backgroundColor: color, width: size, height: size, fontSize: size / 2.6 }}
    >
      {initials}
    </div>
  );
}

export function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink/80">
        {label}
      </span>
      <input
        {...props}
        className="w-full rounded-2xl border-0 bg-brand-50 px-4 py-3 text-ink ring-1 ring-brand-100 outline-none transition focus:bg-white focus:ring-2 focus:ring-brand-500"
      />
    </label>
  );
}
