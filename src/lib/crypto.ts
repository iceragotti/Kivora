// Real Web Crypto API AES-GCM 256-bit Encryption & SHA-256 Key Fingerprint Utility

async function deriveAesKey(passphrase: string, chatId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(`${passphrase}:${chatId}`),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(`KIVORA-E2EE-SALT-${chatId}`),
      iterations: 10000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function encryptMessageE2EE(
  plaintext: string,
  passphrase: string,
  chatId: string
): Promise<{ ciphertext: string; iv: string }> {
  const key = await deriveAesKey(passphrase, chatId);
  const ivBytes = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: ivBytes },
    key,
    encoded
  );
  return {
    ciphertext: toBase64(new Uint8Array(cipherBuffer)),
    iv: toBase64(ivBytes),
  };
}

export async function decryptMessageE2EE(
  ciphertext: string,
  iv: string,
  passphrase: string,
  chatId: string
): Promise<string> {
  try {
    const key = await deriveAesKey(passphrase, chatId);
    const cipherBytes = fromBase64(ciphertext);
    const ivBytes = fromBase64(iv);
    const plainBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivBytes },
      key,
      cipherBytes
    );
    return new TextDecoder().decode(plainBuffer);
  } catch {
    return "[Verschlüsselte Nachricht — Schlüssel-Fingerabdruck erforderlich]";
  }
}

export async function computeSafetyFingerprint(passphrase: string, chatId: string): Promise<string> {
  const data = new TextEncoder().encode(`KIVORA-FINGERPRINT:${passphrase}:${chatId}`);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;
}
