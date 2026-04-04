import type { VaultData } from "./types";

const STORAGE_KEY = "accountant-vault.encrypted.v1";

export type StoredVaultPayload = {
  version: number;
  salt: string;
  iv: string;
  ciphertext: string;
  updatedAt: string;
};

function toBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function deriveKey(password: string, salt: Uint8Array) {
  const normalizedSalt = Uint8Array.from(salt);
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: normalizedSalt,
      iterations: 250000
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptVaultPayload(
  data: VaultData,
  password: string,
  existingSalt?: string
): Promise<StoredVaultPayload> {
  const salt = existingSalt ? fromBase64(existingSalt) : crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);

  return {
    version: 1,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
    updatedAt: new Date().toISOString()
  };
}

export async function decryptVaultPayload(payload: StoredVaultPayload, password: string): Promise<VaultData> {
  const salt = fromBase64(payload.salt);
  const iv = fromBase64(payload.iv);
  const ciphertext = fromBase64(payload.ciphertext);
  const key = await deriveKey(password, salt);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(plaintext)) as VaultData;
}

export function saveStoredVault(payload: StoredVaultPayload) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function loadStoredVault() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as StoredVaultPayload;
}

export function createEmptyVault(ownerName: string): VaultData {
  const now = new Date().toISOString();
  return {
    version: 1,
    ownerName,
    createdAt: now,
    lastOpenedAt: now,
    clients: []
  };
}
