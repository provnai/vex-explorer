# VEX Explorer: Public Rollout Checklist (v1.5.0)

This document tracks the final "Acid Test" for the public release of the VEX Explorer at `verify.provnai.com`.

## 🏗️ 1. Repository Staging
- [x] Rename directory to `vex-explorer`
- [x] Audit `package.json` for name/version consistency
- [x] Verify `Dockerfile` multi-stage WASM build (Rust -> Node)
- [ ] Create GitHub Repository: `provnai/vex-explorer`
- [ ] Initial Branch Protection (main) & License check

## 🚀 2. Railway Deployment (`verify.provnai.com`)
- [ ] Initialize Railway Project (linked to GitHub)
- [ ] Configure Environment Variables
- [ ] Map Custom Domain: `verify.provnai.com`
- [ ] Monitor Build Pipeline (Confirm WASM-pack execution)
- [ ] Verify SSL propagation

## ⚓ 3. Live Protocol Verification (The "Acid Test")
- [ ] **Smoke Test**: Load Explorer on live domain.
- [ ] **Identity Pillar**: Verify software-key signature check works.
- [ ] **Authority Pillar**: Upload a George/CHORA v0.3 VEP; confirm "ALLOW" status.
- [ ] **Forensic Pillar**: Verify Merkle proof parity in WASM.
- [ ] **UX Polish**: Confirm responsiveness and "Sovereign UI" aesthetics.

---
**Official Tracking for Phase 21: Public Launch Execution**
