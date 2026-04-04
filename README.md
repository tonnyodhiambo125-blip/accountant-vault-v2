# Accountant Vault v2 Rebuild

This repository is being rebuilt from a single-file browser prototype into a real secure credential manager.

## Current layout

- `legacy/prototype-index.html`: preserved reference copy of the original static prototype
- `app/frontend`: new React + TypeScript user interface scaffold
- `app/backend`: new Rust backend scaffold for secure local vault operations
- `app/docs`: architecture, security, and bootstrap notes

## Security direction

The rebuild targets a local-first desktop app with these principles:

- encrypted secrets at rest
- no plaintext credentials in browser storage
- master password derivation with Argon2id
- authenticated encryption for vault records
- session key kept in memory only
- auto-lock and clipboard hygiene

## Bootstrap status

The local environment used for this rebuild does not currently have `node`, `npm`, `cargo`, or `rustc` installed, so the project has been scaffolded but not executed yet.

See `app/docs/bootstrap.md` for the toolchain setup and next steps.
