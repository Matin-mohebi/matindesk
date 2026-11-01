"use client";

import { cn } from "@/lib/utils";

export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <div
      className={cn(
        "relative shrink-0 flex items-center justify-center rounded-2xl shadow-lg",
        "bg-gradient-to-br from-primary to-emerald-700 text-primary-foreground select-none",
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span
        className="font-bold leading-none"
        style={{ fontSize: size * 0.52, marginTop: size * 0.06 }}
      >
        م
      </span>
      <span
        className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/15"
        aria-hidden
      />
    </div>
  );
}
