# vex-verify

**Lightweight cryptographic verification engine for the VEX protocol.**

`vex-verify` is the core Rust implementation used by the VEX Explorer to perform high-assurance forensic auditing of autonomous agent behavior. Compiled to WebAssembly, it enables sub-10ms verification latencies directly in the browser.

## Features

- **Pillar Verification**: Validates the 4 pillars of a VEP (Intent, Authority, Identity, Witness).
- **v1.5.0 Protocol Support**: Fully compliant with the latest Merkle Tree specification (RFC 6962).
- **JCS Canonicalization**: Uses JCS (RFC 8785) for deterministic hashing.
- **Forensic Discovery**: Implements the `0x03` discovery spec for parsing Evidence Packets in binary streams.
- **WASM Optimized**: Zero-server visibility by running entirely in the client.

## Usage

This crate is primarily designed to be used as a WebAssembly module via `wasm-pack`.

```rust
use vex_verify::verify_capsule;

// Verify a VEX Evidence Capsule (VEP) binary
let result = verify_capsule(&bytes);
```

## Protocol Compliance

- **Hashing**: SHA-256 with Merkle domain separation.
- **Signatures**: Ed25519 (RFC 8032).
- **Canonicalization**: JCS (RFC 8785).

## License

Licensed under the Apache License, Version 2.0.
