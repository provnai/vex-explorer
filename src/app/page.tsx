"use client";

import { useState, useEffect, useCallback } from "react";
import init, {
  verify_test_vector,
  verify_capsule,
} from "../lib/wasm/wasm_vex";

import { VerificationState, VerificationResult } from "@/types/verification";
import { VerificationPhase } from "@/components/verification/VerificationStatus";
import { DropZone } from "@/components/verification/DropZone";
import { ResultDashboard } from "@/components/verification/ResultDashboard";

export default function Home() {
  const [state, setState] = useState<VerificationState>({
    status: "idle",
    result: null,
    phase: null,
    activeTab: "overview",
  });
  const [wasmLoaded, setWasmLoaded] = useState(false);

  useEffect(() => {
    init()
      .then(() => {
        setWasmLoaded(true);
        console.log("WASM loaded successfully");
      })
      .catch((err) => console.error("Failed to load WASM:", err));
  }, []);

  const runVerification = useCallback(async (file: File) => {
    setState({ status: "loading", result: null, phase: "drop", activeTab: "overview" });

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      if (bytes.length < 76) throw new Error("File too small");

      const phases: VerificationState["phase"][] = ["header", "pillars", "hashes", "signature"];
      for (const phase of phases) {
        setState((prev) => ({ ...prev, phase }));
        await new Promise((r) => setTimeout(r, 400));
      }

      const result = verify_capsule(bytes) as VerificationResult;

      setState({
        status: result.valid ? "verified" : "error",
        result,
        phase: "final",
        activeTab: "overview",
      });
    } catch (_err) {
      setState({ status: "error", result: null, phase: null, activeTab: "overview" });
    }
  }, []);

  const handleTestVector = () => {
    if (!wasmLoaded) return;
    const result = verify_test_vector() as VerificationResult;
    setState({
      status: result.valid ? "verified" : "error",
      result,
      phase: "final",
      activeTab: "overview",
    });
  };

  const getPhaseProgress = () => {
    const phases = ["drop", "header", "pillars", "hashes", "signature", "final"];
    const current = state.phase;
    if (!current) return 0;
    const idx = phases.indexOf(current);
    return ((idx + 1) / phases.length) * 100;
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-zinc-900 via-black to-black" />
      
      <div className="relative z-10 container mx-auto px-4 py-12">
        <header className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/50 border border-zinc-800 mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs uppercase tracking-widest text-zinc-400">Sovereign Proof</span>
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-4 bg-linear-to-b from-white to-zinc-500 bg-clip-text text-transparent">
            VEP Explorer
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto text-center">
            Verify the cryptographic integrity of VEX Evidence Capsules locally.
            <br />
            Zero server-side visibility. 100% cryptographic proof.
          </p>
        </header>

        {!wasmLoaded && (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-zinc-900 border border-zinc-800">
              <div className="w-4 h-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
              <span className="text-zinc-400">Loading verification engine...</span>
            </div>
          </div>
        )}

        {wasmLoaded && state.status === "idle" && (
          <>
            <DropZone onFileDrop={runVerification} isLoading={false} />
            <div className="text-center mt-8">
              <button 
                onClick={handleTestVector}
                className="text-sm text-zinc-500 hover:text-emerald-400 transition-colors underline underline-offset-4"
              >
                Run Test Vector (Sample v3)
              </button>
            </div>
          </>
        )}

        {state.status === "loading" && (
          <div className="flex flex-col items-center justify-center py-12">
            <VerificationPhase phase={state.phase?.toUpperCase() || ""} progress={getPhaseProgress()} />
          </div>
        )}

        {(state.status === "verified" || state.status === "error") && state.result && (
          <div className="space-y-8">
            <ResultDashboard 
              result={state.result} 
              activeTab={state.activeTab} 
              onTabChange={(tab) => setState(prev => ({ ...prev, activeTab: tab }))} 
            />
            
            <div className="text-center pt-8 border-t border-zinc-800">
              <button 
                onClick={() => setState({ status: "idle", result: null, phase: null, activeTab: "overview" })}
                className="px-8 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-all font-medium"
              >
                Verify Another Capsule
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
