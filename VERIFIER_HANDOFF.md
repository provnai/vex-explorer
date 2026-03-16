# VEP Explorer: Verification Engineer Handoff Spec

**Target:** `verify.provnai.com`
**Objective:** Create an "insane" public-facing, WASM-powered dashboard that visually proves the mathematical integrity of VEX Evidence Capsules (VEPs) with zero server-side visibility.

---

## 1. The Core UX: "The Sovereign Proof"
We are not building a form. We are building a **Forensic Dashboard**. 
Refer to the `ProvnCloud Proof` reference image. The UI must feel premium, institutional, and high-tech (Dark mode, glassmorphism, subtle micro-animations).

### The Verification Flow (The "Magic Trick")
When a user drops a `.capsule` or VEP binary:
1. **The Pulse**: The UI "pings" a local WASM instance.
2. **Deconstruction**: Animate the byte-level breakdown of the VEP header (Magic, Version, AID, Root).
3. **Pillar Extraction**: Visually populate the 4 Pillars (Intent, Identity, Authority, Witness).
4. **Local Hash Re-computation**: Show the JCS canonical strings (RFC 8785) and the resulting SHA-256 hashes for each pillar.
5. **Signature Match**: Perform the Ed25519 signature check locally.
6. **Finality**: A massive, animated "VERIFIED" certificate with the "Sovereign Proof" seal.

---

## 2. Technical Data Layouts (Byte-Perfect Alignment)

### VEP Binary Header (76 Bytes)
The verifier must first slice the raw Uint8Array to extract the header before parsing the JSON payload.
- `0..3` (3 bytes): **Magic** - Must be `0x564550` ("VEP").
- `3..4` (1 byte): **Version** - `0x03` (for v1.4.x / v0.2 spec).
- `4..36` (32 bytes): **AID** - The 32-byte Hardware Identity Hash.
- `36..68` (32 bytes): **Capsule Root** - The 32-byte definitive commitments root.
- `68..76` (8 bytes): **Nonce** - Big-Endian u64 counter.

### The "Minimal" Witness Scope
To verify the Witness Pillar hash, the JS object MUST contain ONLY these three keys (lexicographically ordered) before JCS canonicalization:
1. `chora_node_id`
2. `receipt_hash`
3. `timestamp`

### Lexicographical Sorting (The Root Hash)
When assembling the 32-byte `capsule_root`, the 4 pillar hashes must be placed in a JSON object and sorted **lexicographically by key** before JCS and SHA-256:
`authority_hash` -> `identity_hash` -> `intent_hash` -> `witness_hash`.

---

## 3. The Technical Stack

### The WASM Engine (Rust Bridge)
- **Source**: `crates/vex-core`
- **Compiler**: `wasm-pack` with `wasm-bindgen`.
- **Logic**: You must wrap the `Capsule::verify()` and `VEP::unpack()` methods. 
- **Privacy Requirement**: No data leaves the browser. Any network call to a backend for verification is a failure.

### The Frontend (Next.js)
- **Framework**: Next.js 14+ (App Router).
- **Styling**: Vanilla CSS for maximum control over animations and "glow" effects.
- **WASM Loading**: Use a dynamic import or a dedicated `Worker` to ensure the main thread isn't blocked during heavy JCS crunching.

---

## 3. The 4-Pillar Visualization
Each pillar must be an interactive card:

| Pillar | Data Shown | Visual Marker |
| :--- | :--- | :--- |
| **Intent** | Tool/Method name + Params | *The "Why"* |
| **Authority** | VEX Node ID + Nonce | *The "Permission"* |
| **Identity** | Hardware AID + PCR measurement | *The "Silicon"* |
| **Witness** | CHORA Receipt Hash + L1 Anchor | *The "History"* |

---

## 4. Addressing Common Engineer Questions

### Q1: Where is the Test Vector?
Since you cannot access internal brainstorm files, I have duplicated the **Definitive Parity Vector** below. Your verifier MUST match this output exactly to be compliant with the Rust core.

**Input JSON (The 4 Pillars):**
```json
{
  "authority_hash": "6fac0de31355fc1dfe36eee1e0c226f7cc36dd58eaad0aca0c2d3873b4784d35",
  "identity_hash": "7869bae0249b33e09b881a0b44faba6ee3f4bab7edcc2aa5a5e9290e2563c828",
  "intent_hash": "e02504ea88bd9f05a744cd8a462a114dc2045eb7210ea8c6f5ff2679663c92cb",
  "witness_hash": "174dfb80917cca8a8d4760b82656e78df0778cb3aadd60b51cd018b3313d5733"
}
```

**Expected Result:**
1. **Lexicographical Sort**: Ensure keys are alphabetical.
2. **JCS Transform**: Run through RFC 8785 canonicalization.
3. **SHA-256 Digest**: Compute hex result.
4. **Final Capsule Root**: `71d0324716f378b724e6186340289ecad5b99d6301d1585a322f2518db52693e`

---

### Q2: Where is the `vex-core` WASM Crate?
Since we keep the ProvnAI foundation updated on **crates.io**, you should pull the production-ready libraries directly into your Rust WASM bridge.

- **Crate**: `vex-core`
- **Source**: `crates.io/crates/vex-core`

**Tip**: Use the latest version to ensure you have the `v0.2` JCS canonicalization logic out of the box. You do NOT need to reference the local `../vex` folder; this keeps `verify.provnai.com` fully decoupled and portable.

---

### Q3: What is the current project state?
It is a fresh project. I have initialized the folder and README, but you have a blank canvas for the Next.js scaffold. I recommend using the **App Router** for modern state handling.

---

### Q4: What is the priority?
**CORE VERIFICATION FLOW FIRST.** 
None of the visual "insanity" matters if the Ed25519 signature doesn't verify against the Capsule Root. 
1. Get the WASM tool to take a HEX string/Binary blob and return "VALID/INVALID".
2. Then build the animated forensic UI around it.

---

---

## 5. Implementation Checklist for "Insanity"
- [ ] **Recursive Verification**: If the capsule contains a trace of previous blocks, allow the user to click "Up" the chain.
- [ ] **Binary Inspection Mode**: Allow a toggle to see the raw hex-view of the VEP binary next to the parsed objects.
- [ ] **PCR Decoder**: If the `Identity` data contains PCR measurements, display a "Hardware Integrity Boot Trace" view explaining what PCR-0 or PCR-7 represents.
- [ ] **Offline Mode (PWA)**: Register a Service Worker so the verifier works even when the user is completely offline.

---

## 6. Development Quickstart (WASM Bridge)
To get the core logic into the browser, run this from the `verify.provnai.com` directory:

```bash
# 1. Compile the Rust logic
# Note: You may need to create a small 'wasm-wrapper' crate that imports ../vex/crates/vex-core
wasm-pack build --target web --out-dir ./public/wasm

# 2. Run the dev server
npm run dev
```

---

## Final Note on Aesthetics
If it looks like a standard web app, we failed. It needs to look like a tool used by a trillion-dollar AI holding company's compliance department. Every hover should have a glow; every state change should have an easing function.

Go make it beautiful. 🛡️⚓🚀
