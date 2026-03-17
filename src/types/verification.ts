export interface CapsuleIntent {
  variant?: string;
  prompt?: string;
  public_inputs?: Record<string, unknown>;
  request_sha256?: string;
  confidence?: number;
  capabilities?: string[];
  [key: string]: unknown;
}

export interface CapsuleAuthority {
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

export interface CapsuleIdentity {
  aid?: string;
  identity_type?: string;
  pcrs?: Record<string, string>;
  [key: string]: unknown;
}

export interface CapsuleWitness {
  chora_node_id?: string;
  receipt_hash?: string;
  timestamp?: number;
  [key: string]: unknown;
}

export interface CapsuleCrypto {
  algo?: string;
  public_key_endpoint?: string;
  signature_scope?: string;
  signature_b64?: string;
}

export interface PillarStatus {
  intent: boolean;
  authority: boolean;
  identity: boolean;
  witness: boolean;
}

export interface VerificationResult {
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

export interface VerificationState {
  status: "idle" | "loading" | "verifying" | "verified" | "error";
  result: VerificationResult | null;
  phase: "drop" | "header" | "pillars" | "hashes" | "signature" | "final" | null;
  activeTab: "overview" | "supervision" | "ledger";
}
