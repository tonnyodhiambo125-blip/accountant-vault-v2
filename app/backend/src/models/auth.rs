use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MasterPasswordRecord {
    pub salt: String,
    pub digest_hint: String,
}
