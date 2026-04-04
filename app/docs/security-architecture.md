# Security Architecture

## Goals

- Protect secrets at rest on the local machine.
- Avoid exposing decrypted credentials to the renderer for longer than necessary.
- Make offline use possible without depending on a remote server.
- Support future import/export, audit events, and recovery without weakening the vault.

## Proposed architecture

### Frontend

- React + TypeScript renderer
- Never stores secrets in `localStorage`
- Holds only ephemeral UI state
- Requests sensitive operations through backend commands

### Backend

- Rust service layer for authentication, encryption, storage, and session control
- Uses Argon2id to derive a key-encryption key from the master password
- Uses XChaCha20-Poly1305 for vault record encryption
- Keeps the decrypted vault key in memory only while unlocked

### Storage

- SQLite database for structured metadata
- Encrypted blobs for credentials and notes
- Separate tables for accounts, entries, audit events, and app settings

## Core security controls

- Master password is never stored directly.
- Vault unlock derives a key using a random salt and strong parameters.
- Session expires after inactivity or explicit lock.
- Clipboard copy events should be time-limited and logged.
- Export files must use a separate export password.
- Recovery must be opt-in and should use recovery codes, not a default reset PIN.

## Non-goals

- Browser-only storage
- Password recovery via hardcoded email contacts
- Plaintext recovery keys stored next to vault data

## Threats to design against

- Shoulder surfing during unlock
- Local disk theft
- Casual access through browser devtools
- Accidental plaintext export or logging
- XSS-like renderer injection through user-entered names
