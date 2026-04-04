use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultEntry {
    pub id: String,
    pub client_name: String,
    pub portal_name: String,
    pub username: String,
    pub encrypted_secret: String,
    pub notes_encrypted: Option<String>,
    pub updated_at_utc: String,
}
