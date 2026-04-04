mod crypto;
mod db;
mod models;
mod services;

use services::vault_service::VaultService;

fn main() {
    let service = VaultService::new();
    println!("{}", service.bootstrap_summary());
}
