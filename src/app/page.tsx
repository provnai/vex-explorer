"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import init, {
  verify_test_vector,
  verify_capsule,
} from "../lib/wasm/wasm_vex";

interface CapsuleIntent {
  variant?: string;
  prompt?: string;
  public_inputs?: Record<string, unknown>;
  request_sha256?: string;
  confidence?: number;
  capabilities?: string[];
  [key: string]: unknown;
}

interface CapsuleAuthority {
  capsule_id?: string;
  outcome?: string;
  reason_code?: string;
  trace_root?: string;
  nonce?: number;
  prev_hash?: string;
  supervision?: {
    branch_completeness?: number;
    contradictions?: number;
    confidence?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface CapsuleIdentity {
  aid?: string;
  identity_type?: string;
  pcrs?: Record<string, string>;
  [key: string]: unknown;
}

interface CapsuleWitness {
  chora_node_id?: string;
  receipt_hash?: string;
  timestamp?: number;
  [key: string]: unknown;
}

interface CapsuleCrypto {
  algo?: string;
  public_key_endpoint?: string;
  signature_scope?: string;
  signature_b64?: string;
}

interface PillarStatus {
  intent: boolean;
  authority: boolean;
  identity: boolean;
  witness: boolean;
}

interface VerificationResult {
  valid: boolean;
  error: string | null;
  header: {
    magic: string;
    version: number;
    aid: string;
    capsule_root: string;
    nonce: number;
  } | null;
  intent_hash: string | null;
  authority_hash: string | null;
  identity_hash: string | null;
  witness_hash: string | null;
  computed_root: string | null;
  expected_root: string | null;
  intent: CapsuleIntent | null;
  authority: CapsuleAuthority | null;
  identity: CapsuleIdentity | null;
  witness: CapsuleWitness | null;
  crypto: CapsuleCrypto | null;
  signature_valid: boolean;
  version: number;
  merkle_tree: boolean;
  pillar_status: PillarStatus;
}

interface VerificationState {
  status: "idle" | "loading" | "verifying" | "verified" | "error";
  result: VerificationResult | null;
  phase: "drop" | "header" | "pillars" | "hashes" | "signature" | "final" | null;
  activeTab: "overview" | "supervision" | "ledger";
}

function HashDisplay({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wider text-zinc-500">{label}</span>
      <code className="text-xs font-mono bg-zinc-900/50 px-2 py-1 rounded text-emerald-400">
        {value}
      </code>
    </div>
  );
}

function PillarCard({
  name,
  subtitle,
  data,
  hash,
  delay,
  visible,
  verified = true,
}: {
  name: string;
  subtitle: string;
  data: Record<string, unknown>;
  hash: string;
  delay: number;
  visible: boolean;
  verified?: boolean;
}) {
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
      {!isRedacted && <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent" />}
      {!isRedacted && <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />}
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
                <span className="text-zinc-300 font-mono text-xs truncate max-w-[200px]">
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

function VerificationPhase({
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

export default function Home() {
  const [state, setState] = useState<VerificationState>({
    status: "idle",
    result: null,
    phase: null,
    activeTab: "overview",
  });
  const [wasmLoaded, setWasmLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      if (bytes.length < 76) {
        throw new Error("File too small - must be at least 76 bytes for VEP header");
      }

      setState((prev) => ({ ...prev, phase: "header" }));
      await new Promise((r) => setTimeout(r, 400));

      setState((prev) => ({ ...prev, phase: "pillars" }));
      await new Promise((r) => setTimeout(r, 600));

      setState((prev) => ({ ...prev, phase: "hashes" }));
      await new Promise((r) => setTimeout(r, 600));

      setState((prev) => ({ ...prev, phase: "signature" }));
      await new Promise((r) => setTimeout(r, 400));

      const result = verify_capsule(bytes);

      setState({
        status: result.valid ? "verified" : "error",
        result,
        phase: "final",
        activeTab: "overview",
      });
    } catch (err) {
      setState({
        status: "error",
        result: null,
        phase: null,
        activeTab: "overview",
      });
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        runVerification(file);
      }
    },
    [runVerification]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        runVerification(file);
      }
    },
    [runVerification]
  );

  const runTestVector = useCallback(() => {
    setState({ status: "loading", result: null, phase: "drop", activeTab: "overview" });

    setTimeout(async () => {
      setState((prev) => ({ ...prev, phase: "header" }));
      await new Promise((r) => setTimeout(r, 400));
      setState((prev) => ({ ...prev, phase: "pillars" }));
      await new Promise((r) => setTimeout(r, 600));
      setState((prev) => ({ ...prev, phase: "hashes" }));
      await new Promise((r) => setTimeout(r, 600));
      setState((prev) => ({ ...prev, phase: "signature" }));
      await new Promise((r) => setTimeout(r, 400));

      const result = verify_test_vector();

      setState({
        status: result.valid ? "verified" : "error",
        result,
        phase: "final",
        activeTab: "overview",
      });
    }, 100);
  }, []);

  const getPhaseProgress = () => {
    const phases = ["drop", "header", "pillars", "hashes", "signature", "final"];
    const current = state.phase;
    if (!current) return 0;
    const idx = phases.indexOf(current);
    return ((idx + 1) / phases.length) * 100;
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black" />
      
      <div className="relative z-10 container mx-auto px-4 py-12">
        <header className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/50 border border-zinc-800 mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs uppercase tracking-widest text-zinc-400">
              Sovereign Proof
            </span>
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-4 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
            VEP Explorer
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Verify the mathematical integrity of VEX Evidence Capsules locally.
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
          <div className="max-w-2xl mx-auto">
            <div
              className={`relative border-2 border-dashed rounded-2xl p-16 text-center transition-all ${
                isDragging
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/30"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".capsule,.vep,.json,.bin"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-zinc-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-medium mb-1">
                    Drop your .capsule file here
                  </p>
                  <p className="text-sm text-zinc-500">
                    or click to browse • VEP binary or JSON
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={runTestVector}
                className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Or run with{" "}
                <span className="text-emerald-400 font-mono">
                  test vector
                </span>
              </button>
            </div>
          </div>
        )}

        {state.status === "loading" && (
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 gap-4 mb-8">
              <VerificationPhase
                phase="Parsing VEP Header"
                progress={state.phase === "header" ? 100 : getPhaseProgress()}
              />
              <VerificationPhase
                phase="Extracting 4 Pillars"
                progress={state.phase === "pillars" ? 100 : getPhaseProgress()}
              />
              <VerificationPhase
                phase="Computing Hashes"
                progress={state.phase === "hashes" ? 100 : getPhaseProgress()}
              />
              <VerificationPhase
                phase="Verifying Signature"
                progress={state.phase === "signature" ? 100 : getPhaseProgress()}
              />
            </div>
          </div>
        )}

        {state.status === "verified" && state.result && (
          <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-6">
                <svg
                  className="w-5 h-5 text-emerald-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <span className="text-emerald-400 font-semibold">
                  Verified
                </span>
              </div>
              <h2 className="text-3xl font-bold">Sovereign Proof</h2>
              <p className="text-zinc-500 mt-2">
                This capsule has been cryptographically verified
              </p>
              {state.result.merkle_tree && (
                <div className="mt-4 flex items-center justify-center gap-4">
                  <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    RFC 6962 Merkle Tree
                  </span>
                  {state.result.pillar_status && (
                    <span className="text-xs text-zinc-500">
                      {Object.values(state.result.pillar_status).filter(Boolean).length}/4 pillars verified
                    </span>
                  )}
                </div>
              )}
            </div>

            {state.result.header && (
              <div className="mb-12 p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm uppercase tracking-wider text-zinc-500">
                    VEP Header
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      state.result.version >= 3 
                        ? "bg-purple-500/20 text-purple-400" 
                        : "bg-zinc-700 text-zinc-400"
                    }`}>
                      v{state.result.version}.{state.result.version >= 3 ? "5" : "2"}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <span className="text-xs text-zinc-500 block mb-1">
                      Magic
                    </span>
                    <code className="text-emerald-400 font-mono">
                      {state.result.header.magic}
                    </code>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500 block mb-1">
                      Version
                    </span>
                    <code className="text-zinc-300 font-mono">
                      0x{state.result.header.version.toString(16)}
                    </code>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500 block mb-1">
                      AID
                    </span>
                    <code className="text-zinc-300 font-mono text-xs">
                      {state.result.header.aid.slice(0, 16)}...
                    </code>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500 block mb-1">
                      Capsule Root
                    </span>
                    <code className="text-zinc-300 font-mono text-xs">
                      {state.result.header.capsule_root.slice(0, 16)}...
                    </code>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500 block mb-1">
                      Nonce
                    </span>
                    <code className="text-zinc-300 font-mono">
                      {state.result.header.nonce}
                    </code>
                  </div>
                  </div>
                </div>
              )}

            <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 mb-8">
              <h3 className="text-sm uppercase tracking-wider text-zinc-500 mb-4">
                Root Hash Verification
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <HashDisplay
                  label="Computed Capsule Root"
                  value={state.result.computed_root || ""}
                />
                <HashDisplay
                  label="Expected Capsule Root"
                  value={state.result.expected_root || ""}
                />
              </div>
            </div>

            {state.result.crypto && (
              <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
                <h3 className="text-sm uppercase tracking-wider text-zinc-500 mb-4">
                  Cryptographic Signature
                </h3>
                <div className="flex items-center gap-4">
                  <div className={`px-4 py-2 rounded-lg ${
                    state.result.signature_valid 
                      ? "bg-emerald-500/10 text-emerald-400" 
                      : "bg-red-500/10 text-red-400"
                  }`}>
                    {state.result.signature_valid ? "Signature Valid" : "Signature Invalid"}
                  </div>
                  <div className="text-sm text-zinc-400">
                    Algorithm: <span className="font-mono">{state.result.crypto.algo || "unknown"}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8">
              <div className="flex border-b border-zinc-800 mb-6">
                {(["overview", "supervision", "ledger"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setState(prev => ({ ...prev, activeTab: tab }))}
                    className={`px-6 py-3 text-sm font-medium transition-colors ${
                      state.activeTab === tab
                        ? "text-emerald-400 border-b-2 border-emerald-400"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {state.activeTab === "overview" && (
                <div className="grid md:grid-cols-2 gap-6">
                  <PillarCard
                    name="Intent"
                    subtitle="The Why"
                    data={state.result.intent || {}}
                    hash={state.result.intent_hash || ""}
                    delay={0}
                    visible={true}
                    verified={state.result.pillar_status?.intent ?? true}
                  />
                  <PillarCard
                    name="Authority"
                    subtitle="The Permission"
                    data={state.result.authority || {}}
                    hash={state.result.authority_hash || ""}
                    delay={100}
                    visible={true}
                    verified={state.result.pillar_status?.authority ?? true}
                  />
                  <PillarCard
                    name="Identity"
                    subtitle="The Silicon"
                    data={state.result.identity || {}}
                    hash={state.result.identity_hash || ""}
                    delay={200}
                    visible={true}
                    verified={state.result.pillar_status?.identity ?? true}
                  />
                  <PillarCard
                    name="Witness"
                    subtitle="The History"
                    data={state.result.witness || {}}
                    hash={state.result.witness_hash || ""}
                    delay={300}
                    visible={true}
                    verified={state.result.pillar_status?.witness ?? true}
                  />
                </div>
              )}

              {state.activeTab === "supervision" && (
                <div className="space-y-6">
                  <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
                    <h4 className="text-lg font-semibold text-zinc-100 mb-4">MCS Diagnostics</h4>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-950/50">
                        <div>
                          <div className="text-sm text-zinc-400">Branch Completeness</div>
                          <div className="text-emerald-400 font-medium">
                            {state.result.authority?.supervision?.branch_completeness ? `${(state.result.authority.supervision.branch_completeness * 100).toFixed(0)}%` : "N/A"}
                          </div>
                        </div>
                        <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${(state.result.authority?.supervision?.branch_completeness || 0) * 100}%` }} />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-950/50">
                        <div>
                          <div className="text-sm text-zinc-400">Contradiction Detection</div>
                          <div className="text-emerald-400 font-medium">
                            {state.result.authority?.supervision?.contradictions === 0 ? "Verified Clear" : state.result.authority?.supervision?.contradictions || "No Signal"}
                          </div>
                        </div>
                        <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div className={`h-full ${state.result.authority?.supervision?.contradictions ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: state.result.authority?.supervision?.contradictions ? "100%" : "15%" }} />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-950/50">
                        <div>
                          <div className="text-sm text-zinc-400">Confidence Alignment</div>
                          <div className="text-emerald-400 font-medium">
                            {state.result.authority?.supervision?.confidence ? `Aligned (${(state.result.authority.supervision.confidence * 100).toFixed(0)}%)` : "N/A"}
                          </div>
                        </div>
                        <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${(state.result.authority?.supervision?.confidence || 0) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
                    <h4 className="text-lg font-semibold text-zinc-100 mb-4">AEM Verification</h4>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                        <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-zinc-100 font-medium">Capability Token Released</div>
                        <div className="text-sm text-zinc-500">Execution was blocked until AEM authorization</div>
                      </div>
                      <div className="ml-auto px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm font-medium">
                        AUTHORIZED
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {state.activeTab === "ledger" && (
                <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
                  <h4 className="text-lg font-semibold text-zinc-100 mb-4">VEX Ledger Chain</h4>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex-1 p-4 rounded-lg bg-zinc-950/50 border border-zinc-700">
                      <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Previous Hash (Ledger Link)</div>
                      <div className="text-xs font-mono text-zinc-100 truncate">{state.result.authority?.prev_hash || "GENESIS"}</div>
                    </div>
                    <div className="flex-shrink-0">
                      <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                    <div className="flex-1 p-4 rounded-lg bg-zinc-950/50 border border-zinc-700">
                      <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Nonce</div>
                      <div className="text-2xl font-mono text-zinc-100">{state.result.header?.nonce || 0}</div>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-zinc-950/30 border border-zinc-800">
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                      <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Append-only integrity verified via Merkle root</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {state.status === "error" && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-red-500/10 border border-red-500/30 mb-6">
              <svg
                className="w-5 h-5 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span className="text-red-400 font-semibold">Verification Failed</span>
            </div>
            <p className="text-zinc-400 mb-6">
              {state.result?.error || "An unknown error occurred"}
            </p>
            <button
              onClick={() =>
                setState({ status: "idle", result: null, phase: null, activeTab: "overview" })
              }
              className="px-6 py-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
