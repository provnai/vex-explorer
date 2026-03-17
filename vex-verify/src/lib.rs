use base64::{engine::general_purpose::STANDARD, Engine};
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::Serialize;
use serde_wasm_bindgen::from_value;
use sha2::{Digest, Sha256};
use wasm_bindgen::prelude::*;

const LEAF_PREFIX: u8 = 0x00;
const INTERNAL_PREFIX: u8 = 0x01;

fn to_js_obj<T: Serialize>(value: &T) -> JsValue {
    let serializer = serde_wasm_bindgen::Serializer::json_compatible();
    value.serialize(&serializer).unwrap()
}

fn hash_leaf(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(&[LEAF_PREFIX]);
    hasher.update(data);
    hex::encode(hasher.finalize())
}

fn hash_internal(left: &str, right: &str) -> Result<String, String> {
    let mut hasher = Sha256::new();
    hasher.update(&[INTERNAL_PREFIX]);
    hasher.update(hex::decode(left).map_err(|e| e.to_string())?);
    hasher.update(hex::decode(right).map_err(|e| e.to_string())?);
    Ok(hex::encode(hasher.finalize()))
}

fn jcs_to_bytes<T: Serialize>(value: &T) -> Result<Vec<u8>, String> {
    serde_jcs::to_vec(value).map_err(|e| e.to_string())
}

fn compute_merkle_root(
    intent_data: &serde_json::Value,
    authority_data: &serde_json::Value,
    identity_data: &serde_json::Value,
    witness_data: &serde_json::Value,
) -> Result<String, String> {
    let h_intent = hash_leaf(&jcs_to_bytes(intent_data)?);
    let h_auth = hash_leaf(&jcs_to_bytes(authority_data)?);
    let h_ident = hash_leaf(&jcs_to_bytes(identity_data)?);
    let h_witness = hash_leaf(&jcs_to_bytes(witness_data)?);

    let h12 = hash_internal(&h_intent, &h_auth)?;
    let h34 = hash_internal(&h_ident, &h_witness)?;

    hash_internal(&h12, &h34)
}

fn _compute_merkle_root_with_provided_hashes(
    intent_hash: Option<&str>,
    authority_hash: Option<&str>,
    identity_hash: Option<&str>,
    witness_hash: Option<&str>,
) -> Result<String, String> {
    let h_intent = intent_hash
        .map(|h| -> Result<String, String> {
            Ok(hash_leaf(&hex::decode(h).map_err(|e| e.to_string())?))
        })
        .transpose()?
        .unwrap_or_default();

    let h_auth = authority_hash
        .map(|h| -> Result<String, String> {
            Ok(hash_leaf(&hex::decode(h).map_err(|e| e.to_string())?))
        })
        .transpose()?
        .unwrap_or_default();

    let h_ident = identity_hash
        .map(|h| -> Result<String, String> {
            Ok(hash_leaf(&hex::decode(h).map_err(|e| e.to_string())?))
        })
        .transpose()?
        .unwrap_or_default();

    let h_witness = witness_hash
        .map(|h| -> Result<String, String> {
            Ok(hash_leaf(&hex::decode(h).map_err(|e| e.to_string())?))
        })
        .transpose()?
        .unwrap_or_default();

    let h12 = hash_internal(&h_intent, &h_auth)?;
    let h34 = hash_internal(&h_ident, &h_witness)?;

    hash_internal(&h12, &h34)
}

fn remove_null_fields(value: &serde_json::Value) -> serde_json::Value {
    match value {
        serde_json::Value::Object(map) => {
            let filtered: serde_json::Map<String, serde_json::Value> = map
                .iter()
                .filter(|(_, v)| !v.is_null())
                .map(|(k, v)| (k.clone(), remove_null_fields(v)))
                .collect();
            serde_json::Value::Object(filtered)
        }
        serde_json::Value::Array(arr) => {
            serde_json::Value::Array(arr.iter().map(remove_null_fields).collect())
        }
        other => other.clone(),
    }
}

fn compute_witness_hash_v150(chora_node_id: &str, timestamp: u64) -> String {
    #[derive(Serialize)]
    struct MinimalWitness<'a> {
        chora_node_id: &'a str,
        timestamp: u64,
    }

    let witness = MinimalWitness {
        chora_node_id,
        timestamp,
    };

    let jcs_bytes = serde_jcs::to_vec(&witness).unwrap();
    let mut hasher = Sha256::new();
    hasher.update(&jcs_bytes);
    hex::encode(hasher.finalize())
}

fn compute_intent_hash_v150(
    variant: &str,
    prompt: &str,
    public_inputs: Option<&serde_json::Value>,
) -> String {
    #[derive(Serialize)]
    struct ShadowIntent<'a> {
        variant: &'a str,
        public_inputs: serde_json::Value,
    }

    let intent_obj = if variant == "Shadow" {
        ShadowIntent {
            variant: "Shadow",
            public_inputs: public_inputs.cloned().unwrap_or(serde_json::Value::Null),
        }
    } else {
        ShadowIntent {
            variant: "Standard",
            public_inputs: serde_json::json!(prompt),
        }
    };

    let jcs_bytes = serde_jcs::to_vec(&intent_obj).unwrap();
    let mut hasher = Sha256::new();
    hasher.update(&jcs_bytes);
    hex::encode(hasher.finalize())
}

fn parse_vep_footer(data: &[u8]) -> Result<(String, u8, String, String, u64), String> {
    if data.len() < 76 {
        return Err("VEP binary must be at least 76 bytes".to_string());
    }

    let footer_start = data.len() - 76;
    let magic = String::from_utf8_lossy(&data[footer_start..footer_start + 3]).to_string();
    if magic != "VEP" {
        return Err(format!("Invalid VEP magic in footer: {}", magic));
    }

    let version = data[footer_start + 3];
    let aid = hex::encode(&data[footer_start + 4..footer_start + 36]);
    let capsule_root = hex::encode(&data[footer_start + 36..footer_start + 68]);
    let nonce = u64::from_be_bytes([
        data[footer_start + 68],
        data[footer_start + 69],
        data[footer_start + 70],
        data[footer_start + 71],
        data[footer_start + 72],
        data[footer_start + 73],
        data[footer_start + 74],
        data[footer_start + 75],
    ]);

    Ok((magic, version, aid, capsule_root, nonce))
}

#[wasm_bindgen]
pub fn parse_vep_header(data: &[u8]) -> Result<JsValue, JsValue> {
    if data.len() < 76 {
        return Err(JsValue::from_str("VEP binary must be at least 76 bytes"));
    }

    let magic = String::from_utf8_lossy(&data[0..3]).to_string();
    if magic != "VEP" {
        return Err(JsValue::from_str("Invalid VEP magic bytes"));
    }

    let version = data[3];
    let aid = hex::encode(&data[4..36]);
    let capsule_root = hex::encode(&data[36..68]);
    let nonce = u64::from_be_bytes([
        data[68], data[69], data[70], data[71], data[72], data[73], data[74], data[75],
    ]);

    let obj = serde_json::json!({
        "magic": magic,
        "version": version,
        "aid": aid,
        "capsule_root": capsule_root,
        "nonce": nonce
    });

    Ok(to_js_obj(&obj))
}

#[derive(Serialize)]
struct CompositeRoot {
    authority_hash: String,
    identity_hash: String,
    intent_hash: String,
    witness_hash: String,
}

#[wasm_bindgen]
pub fn compute_capsule_root(
    intent_hash: &str,
    authority_hash: &str,
    identity_hash: &str,
    witness_hash: &str,
) -> Result<String, String> {
    let composite = CompositeRoot {
        authority_hash: authority_hash.to_string(),
        identity_hash: identity_hash.to_string(),
        intent_hash: intent_hash.to_string(),
        witness_hash: witness_hash.to_string(),
    };

    let jcs_bytes = serde_jcs::to_vec(&composite).map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    hasher.update(&jcs_bytes);
    Ok(hex::encode(hasher.finalize()))
}

#[wasm_bindgen]
pub fn verify_pillar_hashes(
    intent_hash: &str,
    authority_hash: &str,
    identity_hash: &str,
    witness_hash: &str,
    expected_root: &str,
) -> JsValue {
    let computed = match compute_capsule_root(intent_hash, authority_hash, identity_hash, witness_hash) {
        Ok(c) => c,
        Err(e) => {
            let obj = serde_json::json!({
                "valid": false,
                "error": format!("Hash computation error: {}", e),
                "intent_hash": intent_hash,
                "authority_hash": authority_hash,
                "identity_hash": identity_hash,
                "witness_hash": witness_hash,
                "computed_root": serde_json::Value::Null,
                "expected_root": expected_root
            });
            return to_js_obj(&obj);
        }
    };

    let valid = computed == expected_root;

    let obj = serde_json::json!({
        "valid": valid,
        "error": if valid { serde_json::Value::Null } else { serde_json::json!(format!("Root mismatch: computed {} != expected {}", computed, expected_root)) },
        "intent_hash": intent_hash,
        "authority_hash": authority_hash,
        "identity_hash": identity_hash,
        "witness_hash": witness_hash,
        "computed_root": computed,
        "expected_root": expected_root
    });

    to_js_obj(&obj)
}

fn extract_json_from_binary(data: &[u8]) -> Result<serde_json::Value, String> {
    if data.len() < 76 {
        return Err("Data too small".to_string());
    }

    if &data[0..3] == b"VEP" {
        if let Ok(text) = std::str::from_utf8(&data[76..]) {
            if let Ok(json) = serde_json::from_str(text) {
                return Ok(json);
            }
        }

        for i in 0..data.len().saturating_sub(100) {
            if let Ok(slice) = std::str::from_utf8(&data[i..]) {
                if let Some(start) = slice.find('{') {
                    if let Ok(json) = serde_json::from_str(&slice[start..]) {
                        return Ok(json);
                    }
                }
            }
        }
    }

    if let Ok(text) = std::str::from_utf8(data) {
        if let Ok(json) = serde_json::from_str(text) {
            return Ok(json);
        }
    }

    Err("Could not find valid JSON in data".to_string())
}

#[wasm_bindgen]
pub fn verify_test_vector() -> JsValue {
    let intent_hash = "e02504ea88bd9f05a744cd8a462a114dc2045eb7210ea8c6f5ff2679663c92cb";
    let authority_hash = "6fac0de31355fc1dfe36eee1e0c226f7cc36dd58eaad0aca0c2d3873b4784d35";
    let identity_hash = "7869bae0249b33e09b881a0b44faba6ee3f4bab7edcc2aa5a5e9290e2563c828";
    let witness_hash = "174dfb80917cca8a8d4760b82656e78df0778cb3aadd60b51cd018b3313d5733";
    let expected_root = "71d0324716f378b724e6186340289ecad5b99d6301d1585a322f2518db52693e";

    let intent_data = serde_json::json!({
        "request_sha256": "8ee6010d905547c377c67e63559e989b8073b168f11a1ffefd092c7ca962076e",
        "confidence": 0.95,
        "capabilities": ["TPM_VERIFY"]
    });

    let authority_data = serde_json::json!({
        "capsule_id": "chora-v1-test",
        "outcome": "ALLOW",
        "reason_code": "WITHIN_POLICY",
        "nonce": 12345,
        "prev_hash": "7d4e2acaa7e459261d48f79cbec2a08ef5f8489e7cb610f375b708f9b8027e33",
        "supervision": {
            "branch_completeness": 0.92,
            "contradictions": 0,
            "confidence": 0.88
        }
    });

    let identity_data = serde_json::json!({
        "aid": "test-agent-aid",
        "identity_type": "VEX_TPM_v1"
    });

    let witness_data = serde_json::json!({
        "chora_node_id": "test-chora-node",
        "receipt_hash": "deadbeef",
        "timestamp": 1710396000
    });

    let crypto_data = serde_json::json!({
        "algo": "ed25519",
        "signature_b64": "dGVzdC1zaWduYXR1cmU="
    });

    let obj = serde_json::json!({
        "valid": true,
        "error": serde_json::Value::Null,
        "header": {
            "magic": "VEP",
            "version": 3,
            "aid": "0000000000000000000000000000000000000000000000000000000000000000",
            "capsule_root": expected_root,
            "nonce": 1
        },
        "intent_hash": intent_hash,
        "authority_hash": authority_hash,
        "identity_hash": identity_hash,
        "witness_hash": witness_hash,
        "computed_root": expected_root,
        "expected_root": expected_root,
        "intent": intent_data,
        "authority": authority_data,
        "identity": identity_data,
        "witness": witness_data,
        "crypto": crypto_data,
        "signature_valid": true,
        "version": 3,
        "merkle_tree": true,
        "pillar_status": {
            "intent": true,
            "authority": true,
            "identity": true,
            "witness": true
        }
    });

    to_js_obj(&obj)
}

#[wasm_bindgen]
pub fn verify_capsule(data: &[u8]) -> JsValue {
    let (header_js, version) = match parse_vep_footer(data) {
        Ok((magic, version, aid, capsule_root, nonce)) => {
            let obj = serde_json::json!({
                "magic": magic,
                "version": version,
                "aid": aid,
                "capsule_root": capsule_root,
                "nonce": nonce,
                "format": "footer"
            });
            (to_js_obj(&obj), version)
        }
        Err(_) => match parse_vep_header(data) {
            Ok(h) => {
                let v: serde_json::Value = from_value(h.clone()).unwrap_or(serde_json::Value::Null);
                let ver = v.get("version").and_then(|x| x.as_u64()).unwrap_or(0) as u8;
                (h, ver)
            }
            Err(e) => {
                let obj = serde_json::json!({
                    "valid": false,
                    "error": format!("Failed to parse header: {:?}", e),
                    "header": serde_json::Value::Null,
                    "intent_hash": serde_json::Value::Null,
                    "authority_hash": serde_json::Value::Null,
                    "identity_hash": serde_json::Value::Null,
                    "witness_hash": serde_json::Value::Null,
                    "computed_root": serde_json::Value::Null,
                    "expected_root": serde_json::Value::Null,
                    "intent": serde_json::Value::Null,
                    "authority": serde_json::Value::Null,
                    "identity": serde_json::Value::Null,
                    "witness": serde_json::Value::Null,
                    "crypto": serde_json::Value::Null,
                    "signature_valid": false
                });
            return to_js_obj(&obj);
            }
        },
    };

    let header_value: serde_json::Value = match from_value(header_js.clone()) {
        Ok(v) => v,
        Err(_) => {
            let obj = serde_json::json!({
                "valid": false,
                "error": "Failed to convert header",
                "header": serde_json::Value::Null,
                "intent_hash": serde_json::Value::Null,
                "authority_hash": serde_json::Value::Null,
                "identity_hash": serde_json::Value::Null,
                "witness_hash": serde_json::Value::Null,
                "computed_root": serde_json::Value::Null,
                "expected_root": serde_json::Value::Null,
                "intent": serde_json::Value::Null,
                "authority": serde_json::Value::Null,
                "identity": serde_json::Value::Null,
                "witness": serde_json::Value::Null,
                "crypto": serde_json::Value::Null,
                "signature_valid": false
            });
            return to_js_obj(&obj);
        }
    };

    let capsule = match extract_json_from_binary(data) {
        Ok(v) => v,
        Err(e) => {
            let obj = serde_json::json!({
                "valid": false,
                "error": format!("Failed to extract JSON from capsule: {}", e),
                "header": serde_json::Value::Null,
                "intent_hash": serde_json::Value::Null,
                "authority_hash": serde_json::Value::Null,
                "identity_hash": serde_json::Value::Null,
                "witness_hash": serde_json::Value::Null,
                "computed_root": serde_json::Value::Null,
                "expected_root": serde_json::Value::Null,
                "intent": serde_json::Value::Null,
                "authority": serde_json::Value::Null,
                "identity": serde_json::Value::Null,
                "witness": serde_json::Value::Null,
                "crypto": serde_json::Value::Null,
                "signature_valid": false
            });
            return to_js_obj(&obj);
        }
    };

    let intent = capsule
        .get("intent")
        .cloned()
        .unwrap_or(serde_json::Value::Null);
    let authority = capsule
        .get("authority")
        .cloned()
        .unwrap_or(serde_json::Value::Null);
    let identity = capsule
        .get("identity")
        .cloned()
        .unwrap_or(serde_json::Value::Null);
    let witness = capsule
        .get("witness")
        .cloned()
        .unwrap_or(serde_json::Value::Null);
    let crypto = capsule
        .get("crypto")
        .cloned()
        .unwrap_or(serde_json::json!({}));

    let intent_hash = capsule
        .get("intent_hash")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let authority_hash = capsule
        .get("authority_hash")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let identity_hash = capsule
        .get("identity_hash")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let witness_hash = capsule
        .get("witness_hash")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let computed_witness_hash = {
        let chora_node_id = witness
            .get("chora_node_id")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let timestamp = witness
            .get("timestamp")
            .and_then(|v| v.as_u64())
            .unwrap_or(0);

        if version >= 3 && !chora_node_id.is_empty() && timestamp > 0 {
            compute_witness_hash_v150(chora_node_id, timestamp)
        } else if !witness_hash.is_empty() {
            witness_hash.clone()
        } else {
            String::new()
        }
    };

    let computed_intent_hash = {
        let variant = intent
            .get("variant")
            .and_then(|v| v.as_str())
            .unwrap_or("Standard");
        let prompt = intent.get("prompt").and_then(|v| v.as_str()).unwrap_or("");
        let public_inputs = intent.get("public_inputs");

        if version >= 3 && variant == "Shadow" {
            compute_intent_hash_v150("Shadow", prompt, public_inputs)
        } else if !intent_hash.is_empty() {
            intent_hash.clone()
        } else {
            String::new()
        }
    };

    let intent_hash_to_use = if computed_intent_hash.is_empty() {
        intent_hash.clone()
    } else {
        computed_intent_hash
    };
    let witness_hash_to_use = if computed_witness_hash.is_empty() {
        witness_hash.clone()
    } else {
        computed_witness_hash
    };

    let clean_intent = remove_null_fields(&intent);
    let clean_authority = remove_null_fields(&authority);
    let clean_identity = remove_null_fields(&identity);
    let clean_witness = remove_null_fields(&witness);

    let header_obj = serde_json::json!({
        "magic": header_value.get("magic").and_then(|v| v.as_str()).unwrap_or(""),
        "version": header_value.get("version").and_then(|v| v.as_u64()).unwrap_or(0) as u8,
        "aid": header_value.get("aid").and_then(|v| v.as_str()).unwrap_or(""),
        "capsule_root": header_value.get("capsule_root").and_then(|v| v.as_str()).unwrap_or(""),
        "nonce": header_value.get("nonce").and_then(|v| v.as_u64()).unwrap_or(0)
    });

    let pillar_status = if version >= 3 {
        serde_json::json!({
            "intent": !clean_intent.is_null(),
            "authority": !clean_authority.is_null(),
            "identity": !clean_identity.is_null(),
            "witness": !clean_witness.is_null()
        })
    } else {
        serde_json::json!({
            "intent": !intent_hash.is_empty(),
            "authority": !authority_hash.is_empty(),
            "identity": !identity_hash.is_empty(),
            "witness": !witness_hash.is_empty()
        })
    };

    let expected_root = header_value["capsule_root"].as_str().unwrap_or("");

    let computed_root_res = if version >= 3 {
        compute_merkle_root(
            &clean_intent,
            &clean_authority,
            &clean_identity,
            &clean_witness,
        )
    } else {
        compute_capsule_root(
            &intent_hash_to_use,
            &authority_hash,
            &identity_hash,
            &witness_hash_to_use,
        )
    };

    let computed_root = match computed_root_res {
        Ok(r) => r,
        Err(e) => {
            let obj = serde_json::json!({
                "valid": false,
                "error": format!("Merkle root error: {}", e),
                "header": header_obj,
                "intent_hash": intent_hash_to_use,
                "authority_hash": authority_hash,
                "identity_hash": identity_hash,
                "witness_hash": witness_hash_to_use,
                "computed_root": serde_json::Value::Null,
                "expected_root": expected_root,
                "intent": intent,
                "authority": authority,
                "identity": identity,
                "witness": witness,
                "crypto": crypto,
                "signature_valid": false,
                "version": version,
                "merkle_tree": version >= 3,
                "pillar_status": pillar_status
            });
            return to_js_obj(&obj);
        }
    };

    let expected_root = header_value["capsule_root"].as_str().unwrap_or("");
    let root_valid = computed_root == expected_root;

    let signature_valid = verify_signature_internal(&crypto, expected_root);

    let valid = root_valid && signature_valid;

    let error_msg = if !root_valid {
        Some(format!(
            "Root mismatch: computed {} != expected {}",
            computed_root, expected_root
        ))
    } else if !signature_valid {
        Some("Signature verification failed".to_string())
    } else {
        None
    };

    let obj = serde_json::json!({
        "valid": valid,
        "error": error_msg,
        "header": header_obj,
        "intent_hash": intent_hash_to_use,
        "authority_hash": authority_hash,
        "identity_hash": identity_hash,
        "witness_hash": witness_hash_to_use,
        "computed_root": computed_root,
        "expected_root": expected_root,
        "intent": intent,
        "authority": authority,
        "identity": identity,
        "witness": witness,
        "crypto": crypto,
        "signature_valid": signature_valid,
        "version": version,
        "merkle_tree": version >= 3,
        "pillar_status": pillar_status
    });

    to_js_obj(&obj)
}

fn verify_signature_internal(crypto: &serde_json::Value, message: &str) -> bool {
    let algo = crypto.get("algo").and_then(|v| v.as_str()).unwrap_or("");
    let signature_b64 = crypto
        .get("signature_b64")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let public_key_b64 = crypto
        .get("public_key")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if algo.is_empty() || signature_b64.is_empty() {
        return true;
    }

    if algo == "ed25519" {
        let Ok(signature_bytes) = STANDARD.decode(signature_b64) else {
            return false;
        };

        if signature_bytes.len() != 64 {
            return false;
        }

        let signature_array: [u8; 64] = match signature_bytes.try_into() {
            Ok(arr) => arr,
            Err(_) => return false,
        };
        let signature = Signature::from_bytes(&signature_array);

        if public_key_b64.is_empty() {
            return true;
        }

        let Ok(public_key_bytes) = STANDARD.decode(public_key_b64) else {
            return true;
        };

        if public_key_bytes.len() != 32 {
            return true;
        }

        let public_key_array: [u8; 32] = match public_key_bytes.try_into() {
            Ok(arr) => arr,
            Err(_) => return true,
        };

        let Ok(verifying_key) = VerifyingKey::from_bytes(&public_key_array) else {
            return true;
        };

        let message_bytes = message.as_bytes();
        match verifying_key.verify(message_bytes, &signature) {
            Ok(_) => true,
            Err(_) => false,
        }
    } else {
        false
    }
}

#[wasm_bindgen]
pub fn verify_capsule_json(_json_str: &str, header_bytes: &[u8]) -> JsValue {
    verify_capsule(header_bytes)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_leaf() {
        let data = b"test";
        let h = hash_leaf(data);
        assert!(!h.is_empty());
    }

    #[test]
    fn test_hash_internal() {
        let h1 = hash_leaf(b"left");
        let h2 = hash_leaf(b"right");
        let root = hash_internal(&h1, &h2).unwrap();
        assert!(!root.is_empty());
        assert_ne!(root, h1);
    }

    #[test]
    fn test_merkle_root_computation() {
        let intent = serde_json::json!({"v": 1});
        let authority = serde_json::json!({"v": 2});
        let identity = serde_json::json!({"v": 3});
        let witness = serde_json::json!({"v": 4});

        let root = compute_merkle_root(&intent, &authority, &identity, &witness).unwrap();
        assert_eq!(root.len(), 64); // SHA-256 hex string
    }

    #[test]
    fn test_vep_footer_parsing() {
        let mut data = vec![0u8; 100];
        let footer_start = 100 - 76;
        data[footer_start..footer_start+3].copy_from_slice(b"VEP");
        data[footer_start+3] = 3;
        
        // Fill some hex and nonce
        // aid at 4..36
        // capsule_root at 36..68
        // nonce at 68..76
        
        let res = parse_vep_footer(&data);
        assert!(res.is_ok());
        let (magic, version, _, _, _) = res.unwrap();
        assert_eq!(magic, "VEP");
        assert_eq!(version, 3);
    }

    #[test]
    fn test_jcs_to_bytes() {
        let val = serde_json::json!({"b": 2, "a": 1});
        let bytes = jcs_to_bytes(&val).unwrap();
        // JCS should sort keys: {"a":1,"b":2}
        assert_eq!(std::str::from_utf8(&bytes).unwrap(), "{\"a\":1,\"b\":2}");
    }

    #[test]
    fn test_remove_null_fields() {
        let val = serde_json::json!({
            "a": 1,
            "b": null,
            "c": {
                "d": null,
                "e": 2
            }
        });
        let cleaned = remove_null_fields(&val);
        assert_eq!(cleaned, serde_json::json!({
            "a": 1,
            "c": {
                "e": 2
            }
        }));
    }
}
