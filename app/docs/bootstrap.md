# Bootstrap Guide

This scaffold is designed for a Tauri + React + TypeScript rebuild.

## Required toolchains

1. Install Node.js 20 or newer.
2. Install Rust using `rustup`.
3. Install WebView2 runtime on Windows if it is not already present.
4. Install the Visual Studio C++ build tools required by Tauri.

## Recommended first commands

Run these after the toolchains are installed:

```powershell
cd app/frontend
npm install
```

```powershell
cd app/backend
cargo check
```

## Immediate next implementation steps

1. Replace the placeholder backend with a full Tauri shell.
2. Add SQLCipher or SQLite plus encrypted blob storage for vault records.
3. Implement master-password setup and unlock.
4. Wire the frontend auth screens to backend commands.
5. Add tests for key derivation, encryption, and vault CRUD.

## Migration note

The original prototype remains in `legacy/prototype-index.html` for reference only. It should not be used for production secrets.
