"use client";

import React from "react";
import { VerificationResult } from "@/types/verification";
import { PillarCard } from "./PillarCard";

interface ResultDashboardProps {
  result: VerificationResult;
  activeTab: "overview" | "supervision" | "ledger";
  onTabChange: (tab: "overview" | "supervision" | "ledger") => void;
}

export function ResultDashboard({ result, activeTab, onTabChange }: ResultDashboardProps) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Summary Header */}
      <div className={`p-6 rounded-2xl border ${
        result.valid 
          ? "bg-emerald-500/5 border-emerald-500/20" 
          : "bg-red-500/5 border-red-500/20"
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              result.valid ? "bg-emerald-500/20" : "bg-red-500/20"
            }`}>
              {result.valid ? (
                <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-zinc-100">
                {result.valid ? "Verification Passed" : "Verification Failed"}
              </h2>
              <p className="text-zinc-400">
                {result.valid 
                  ? "All 4 evidence pillars match the signed Merkle root." 
                  : result.error || "Unknown verification error"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800">
                <span className="text-xs text-zinc-500 block uppercase tracking-wider">Protocol</span>
                <span className="text-sm font-medium text-zinc-200">VEP v{result.version}</span>
             </div>
             <div className="px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800">
                <span className="text-xs text-zinc-500 block uppercase tracking-wider">Topology</span>
                <span className="text-sm font-medium text-zinc-200">{result.merkle_tree ? "Merkle (2x2)" : "Linear"}</span>
             </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 rounded-xl bg-zinc-900/50 border border-zinc-800 w-fit">
        {(["overview", "supervision", "ledger"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? "bg-zinc-800 text-white shadow-lg"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="mt-8">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <PillarCard
              name="Intent"
              subtitle="The AI Execution Request"
              data={result.intent || {}}
              hash={result.intent_hash || ""}
              delay={0}
              visible={true}
              verified={result.pillar_status.intent}
            />
            <PillarCard
              name="Authority"
              subtitle="The Policy Decision"
              data={result.authority || {}}
              hash={result.authority_hash || ""}
              delay={100}
              visible={true}
              verified={result.pillar_status.authority}
            />
            <PillarCard
              name="Identity"
              subtitle="The Execution Agent"
              data={result.identity || {}}
              hash={result.identity_hash || ""}
              delay={200}
              visible={true}
              verified={result.pillar_status.identity}
            />
            <PillarCard
              name="Witness"
              subtitle="The External Attestation"
              data={result.witness || {}}
              hash={result.witness_hash || ""}
              delay={300}
              visible={true}
              verified={result.pillar_status.witness}
            />
          </div>
        )}

        {activeTab === "supervision" && (
           <div className="p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800">
             <div className="max-w-3xl mx-auto space-y-8">
                <h4 className="text-xl font-semibold text-zinc-100">Supervision & Safety Metrics</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Metric Cards... simplified for extraction */}
                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                    <span className="text-xs text-zinc-500 uppercase">Completeness</span>
                    <div className="text-2xl font-mono text-emerald-400">
                      {((result.authority?.supervision?.branch_completeness || 0) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                    <span className="text-xs text-zinc-500 uppercase">Contradictions</span>
                    <div className="text-2xl font-mono text-amber-500">
                      {result.authority?.supervision?.contradictions || 0}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                    <span className="text-xs text-zinc-500 uppercase">Confidence</span>
                    <div className="text-2xl font-mono text-emerald-400">
                      {((result.authority?.supervision?.confidence || 0) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
             </div>
           </div>
        )}

        {/* ledger tab simplified for extraction */}
        {activeTab === "ledger" && (
           <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <h4 className="text-lg font-semibold text-zinc-100 mb-4">VEX Ledger Chain</h4>
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 p-4 rounded-lg bg-zinc-950/50 border border-zinc-700">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Previous Hash</div>
                  <div className="text-xs font-mono text-zinc-100 truncate">{result.authority?.prev_hash || "GENESIS"}</div>
                </div>
                {/* SVG Arrow... */}
                <div className="flex-1 p-4 rounded-lg bg-zinc-950/50 border border-zinc-700">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Nonce</div>
                  <div className="text-2xl font-mono text-zinc-100">{result.header?.nonce || 0}</div>
                </div>
              </div>
           </div>
        )}
      </div>
    </div>
  );
}
