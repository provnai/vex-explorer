# 🧭 VEX Explorer: The Sovereign Forensic Dashboard
## Verifiable Evidence Cross-examination (VEX) v1.5.0
### [Live Deployment: explorer.provnai.com](https://explorer.provnai.com)

The **VEX Explorer** is a high-assurance, client-side dashboard designed for the forensic audit of autonomous agent behavior. Built to serve as the "Sovereign Forensic Plane" of the CHORA-VEX governed execution ecosystem, it enables institutional auditors, developers, and safety researchers to mathematically verify the integrity, authority, and identity of agentic actions.

### 🛡️ Core Features

- **Local WASM Verification**: Powered by a highly-optimized Rust core (`wasm-vex`) compiled to WebAssembly for sub-10ms verification latencies.
- **VEX v1.5.0 Protocol Support**: Fully compliant with the latest Merkle Tree specification, including domain separation and JCS (JSON Canonicalization Scheme) per RFC 8785.
- **Silicon Identity (Hardware Attestation)**: Native verification of the **Identity Pillar**, providing mathematical proof that evidence was signed by an authorized secure enclave or TPM 2.0.
- **Forensic Discovery (0x03 Spec)**: Discovers and parses Evidence Packets in binary streams (logs, disk images) using the v1.5.0 discovery magic.
- **AEM Handshake Visualizer**: Real-time diagnostics for the Authorization Enforcement Module (AEM) and Multi-Agent Coordination Supervision (MCS) signals.
- **Bunker-Ready**: Progressive Web App (PWA) support for offline, air-gapped forensic audits in high-security environments.

### 🏛️ ARIA "Scaling Trust" Baseline

This repository is submitted as an open-source baseline for the **ARIA Scaling Trust Arena**. It demonstrates the "Forensic Plane" of the Governed Execution Hub, providing a transparent, permissionless tool for validating autonomous agent behavior and technical policy enforcement.

---

### 🚀 Quick Start (Local Development)

#### Prerequisites
- Node.js 20+
- Rust 1.75+ (with `wasm-pack`)

#### Installation
```bash
# Clone the repository
git clone https://github.com/provnai/vex-explorer.git
cd vex-explorer

# Install dependencies
npm install

# Build WASM and Start Next.js
npm run build
npm run dev
```

### 🛡️ Security & Privacy
The VEX Explorer is built on the principle of **Zero-Server Visibility**. Unlike traditional block explorers, it does not index data on a centralized server. It acts as a lens through which you can view and verify evidence locally, preserving institutional and individual privacy.

---

### ⚖️ License
This project is licensed under the **Apache License, Version 2.0**. It provides a robust, permissive foundation for institutional forensic auditing and high-assurance tooling.

---

**Built by ProvnAI.**

