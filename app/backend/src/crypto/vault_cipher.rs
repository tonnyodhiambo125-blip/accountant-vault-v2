use chacha20poly1305::aead::{Aead, KeyInit};
use chacha20poly1305::{Key, XChaCha20Poly1305, XNonce};
use base64::{engine::general_purpose::STANDARD_NO_PAD, Engine as _};
use rand::RngCore;

pub struct EncryptedBlob {
    pub nonce: Vec<u8>,
    pub ciphertext: Vec<u8>,
}

pub fn encrypt(key_bytes: &[u8; 32], plaintext: &[u8]) -> EncryptedBlob {
    let cipher = XChaCha20Poly1305::new(Key::from_slice(key_bytes));
    let mut nonce = [0_u8; 24];
    rand::thread_rng().fill_bytes(&mut nonce);
    let ciphertext = cipher
        .encrypt(XNonce::from_slice(&nonce), plaintext)
        .expect("encryption should succeed");

    EncryptedBlob {
        nonce: nonce.to_vec(),
        ciphertext,
    }
}

pub fn decrypt(key_bytes: &[u8; 32], blob: &EncryptedBlob) -> Vec<u8> {
    let cipher = XChaCha20Poly1305::new(Key::from_slice(key_bytes));
    cipher
        .decrypt(XNonce::from_slice(&blob.nonce), blob.ciphertext.as_ref())
        .expect("decryption should succeed")
}

pub fn decode_key(key_b64: &str) -> [u8; 32] {
    let raw = STANDARD_NO_PAD
        .decode(key_b64.as_bytes())
        .expect("base64 key should decode");
    raw.try_into().expect("decoded key should be 32 bytes")
}

#[cfg(test)]
mod tests {
    use super::{decode_key, decrypt, encrypt};

    #[test]
    fn encrypted_blob_round_trips() {
        let key = decode_key("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
        let plaintext = b"super-secret";
        let encrypted = encrypt(&key, plaintext);
        let decrypted = decrypt(&key, &encrypted);
        assert_eq!(decrypted, plaintext);
    }
}
