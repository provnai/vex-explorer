/* tslint:disable */
/* eslint-disable */
/**
* @returns {any}
*/
export function verify_test_vector(): any;
/**
* @param {string} intent_hash
* @param {string} authority_hash
* @param {string} identity_hash
* @param {string} witness_hash
* @returns {string}
*/
export function compute_capsule_root(intent_hash: string, authority_hash: string, identity_hash: string, witness_hash: string): string;
/**
* @param {Uint8Array} data
* @returns {any}
*/
export function parse_vep_header(data: Uint8Array): any;
/**
* @param {string} intent_hash
* @param {string} authority_hash
* @param {string} identity_hash
* @param {string} witness_hash
* @param {string} expected_root
* @returns {any}
*/
export function verify_pillar_hashes(intent_hash: string, authority_hash: string, identity_hash: string, witness_hash: string, expected_root: string): any;
/**
* @param {Uint8Array} data
* @returns {any}
*/
export function verify_capsule(data: Uint8Array): any;
/**
* @param {string} _json_str
* @param {Uint8Array} header_bytes
* @returns {any}
*/
export function verify_capsule_json(_json_str: string, header_bytes: Uint8Array): any;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly compute_capsule_root: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => void;
  readonly parse_vep_header: (a: number, b: number, c: number) => void;
  readonly verify_capsule: (a: number, b: number) => number;
  readonly verify_capsule_json: (a: number, b: number, c: number, d: number) => number;
  readonly verify_pillar_hashes: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number) => number;
  readonly verify_test_vector: () => number;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_exn_store: (a: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {SyncInitInput} module
*
* @returns {InitOutput}
*/
export function initSync(module: SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
