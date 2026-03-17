"use client";

import React from "react";

export function HashDisplay({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 mt-auto">
      <span className="text-xs uppercase tracking-wider text-zinc-500">{label}</span>
      <code className="text-xs font-mono bg-zinc-900/50 px-2 py-1 rounded text-emerald-400 truncate">
        {value}
      </code>
    </div>
  );
}

export function VerificationPhase({
  phase,
  progress,
}: {
  phase: string;
  progress: number;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-sm text-zinc-400">{phase}</div>
      <div className="w-48 h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
