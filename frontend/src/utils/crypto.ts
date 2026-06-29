const PBKDF2_ITERATIONS = 100000;
const IV_LENGTH = 12;

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function generateSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return arrayBufferToBase64(bytes.buffer);
}

export async function deriveKey(password: string, salt: ArrayBuffer | string): Promise<CryptoKey> {
  const saltBuffer = typeof salt === 'string' ? base64ToArrayBuffer(salt) : salt;
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBuffer, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function generateDataKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(raw);
}

export async function importDataKey(base64: string): Promise<CryptoKey> {
  const raw = base64ToArrayBuffer(base64);
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function encryptKey(dataKey: CryptoKey, kek: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', dataKey);
  const rawBase64 = arrayBufferToBase64(raw);
  return encryptData(rawBase64, kek);
}

export async function decryptKey(encryptedKey: string, kek: CryptoKey): Promise<CryptoKey> {
  const rawBase64 = await decryptData(encryptedKey, kek);
  const raw = base64ToArrayBuffer(rawBase64);
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function encryptData(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plaintext));
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.byteLength);
  return arrayBufferToBase64(combined.buffer);
}

export async function decryptData(ciphertext: string, key: CryptoKey): Promise<string> {
  const combined = new Uint8Array(base64ToArrayBuffer(ciphertext));
  const iv = combined.slice(0, IV_LENGTH);
  const data = combined.slice(IV_LENGTH);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}
