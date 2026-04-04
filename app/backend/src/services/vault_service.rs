use crate::crypto::key_derivation::{
    initialize_master_password, verify_master_password,
};
use crate::models::auth::MasterPasswordRecord;
use crate::db::schema::{ACCOUNTS_TABLE, AUDIT_EVENTS_TABLE, VAULT_ENTRIES_TABLE};

pub struct VaultService;

impl VaultService {
    pub fn new() -> Self {
        Self
    }

    pub fn bootstrap_summary(&self) -> String {
        format!(
            "Secure vault backend scaffold initialized. Planned tables: {ACCOUNTS_TABLE}, {VAULT_ENTRIES_TABLE}, {AUDIT_EVENTS_TABLE}."
        )
    }

    pub fn create_master_password(&self, password: &str) -> MasterPasswordRecord {
        let material = initialize_master_password(password);
        MasterPasswordRecord {
            salt: material.salt,
            digest_hint: material.digest_hint,
        }
    }

    pub fn verify_master_password(
        &self,
        password: &str,
        record: &MasterPasswordRecord,
    ) -> bool {
        verify_master_password(password, &record.digest_hint)
    }
}
