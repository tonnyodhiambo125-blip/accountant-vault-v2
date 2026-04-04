use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordVerifier, SaltString},
    Argon2, PasswordHasher,
};
use base64::{engine::general_purpose::STANDARD_NO_PAD, Engine as _};
use blake3::Hasher;

pub struct DerivedKeyMaterial {
    pub salt: String,
    pub digest_hint: String,
    pub encryption_key_b64: String,
}

pub fn initialize_master_password(password: &str) -> DerivedKeyMaterial {
    let salt = SaltString::generate(&mut OsRng);
    let digest = Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .expect("argon2 hashing should succeed")
        .to_string();

    DerivedKeyMaterial {
        salt: salt.to_string(),
        digest_hint: digest,
        encryption_key_b64: derive_encryption_key(password, &salt.to_string()),
    }
}

pub fn verify_master_password(password: &str, digest_hint: &str) -> bool {
    let parsed_hash = match PasswordHash::new(digest_hint) {
        Ok(hash) => hash,
        Err(_) => return false,
    };

    Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok()
}

pub fn derive_encryption_key(password: &str, salt: &str) -> String {
    let mut hasher = Hasher::new();
    hasher.update(password.as_bytes());
    hasher.update(salt.as_bytes());
    let digest = hasher.finalize();
    STANDARD_NO_PAD.encode(&digest.as_bytes()[..32])
}

#[cfg(test)]
mod tests {
    use super::{derive_encryption_key, initialize_master_password, verify_master_password};

    #[test]
    fn master_password_round_trip_verifies() {
        let record = initialize_master_password("correct horse battery staple");
        assert!(verify_master_password(
            "correct horse battery staple",
            &record.digest_hint
        ));
        assert!(!verify_master_password("wrong password", &record.digest_hint));
    }

    #[test]
    fn encryption_key_derivation_is_stable() {
        let key_one = derive_encryption_key("sample-password", "sample-salt");
        let key_two = derive_encryption_key("sample-password", "sample-salt");
        assert_eq!(key_one, key_two);
    }
}
