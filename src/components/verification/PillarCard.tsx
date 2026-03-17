"use client";

import React from "react";
import { HashDisplay } from "./VerificationStatus";

interface PillarCardProps {
  name: string;
  subtitle: string;
  data: Record<string, unknown>;
  hash: string;
  delay: number;
  visible: boolean;
  verified?: boolean;
}

export function PillarCard({
  name,
  subtitle,
  data,
  hash,
  delay,
  visible,
  verified = true,
}: PillarCardProps) {
  const isShadowIntent = name === "Intent" && data.variant === "Shadow";
  const isRedacted = !verified || (name === "Intent" && data.variant === "Shadow" && !data.prompt);

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "object") return JSON.stringify(value);
    if (typeof value === "number") {
      if (name === "Witness" && typeof data.timestamp === "number") {
        return new Date(data.timestamp * 1000).toISOString().split("T")[0];
      }
      return value.toString();
    }
    return String(value);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl border transition-all duration-700 ${
        visible 
          ? isRedacted 
            ? "opacity-60 border-zinc-700 bg-zinc-900/40" 
            : "opacity-100 translate-y-0 border-zinc-800 bg-zinc-950/80"
          : "opacity-0 translate-y-8"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {!isRedacted && <div className="absolute inset-0 bg-linear-to-br from-emerald-500/5 via-transparent to-transparent" />}
      {!isRedacted && <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-emerald-500/50 to-transparent" />}
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-zinc-100">{name}</h3>
            <p className="text-xs text-zinc-500">{subtitle}</p>
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isRedacted ? "bg-zinc-700/50" : "bg-emerald-500/10"
          }`}>
            {isRedacted ? (
              <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            ) : (
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </div>
        </div>

        {isShadowIntent ? (
          <div className="mb-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30 mb-3">
              <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-sm text-purple-400 font-medium">Private Intent (STARK Verified)</span>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-zinc-500">
                Raw prompt text is cryptographically hidden to protect institutional privacy.
              </p>
              {Boolean(data.public_inputs && typeof data.public_inputs === 'object') && (
                <div className="mt-2 p-2 rounded bg-zinc-900/50">
                  <span className="text-xs text-zinc-500 block mb-1">Public Inputs:</span>
                  <code className="text-xs font-mono text-purple-300">
                    {JSON.stringify(data.public_inputs as Record<string, unknown>, null, 2)}
                  </code>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3 mb-4">
            {Object.entries(data).map(([key, value]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="text-zinc-500 capitalize">{key.replace(/_/g, " ")}</span>
                <span className="text-zinc-300 font-mono text-xs truncate max-w-50">
                  {formatValue(value)}
                </span>
              </div>
            ))}
          </div>
        )}
        <HashDisplay label="Pillar Hash (SHA-256)" value={hash} />
      </div>
    </div>
  );
}
