// base64url helpers (URL-safe, no padding), shared by agent tokens and the
// invite-token hashing. Kept dependency-free so anything in the worker can use
// them without import cycles.

const enc = new TextEncoder();

export function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function b64urlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replaceAll("-", "+").replaceAll("_", "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export const strToB64url = (s: string) => bytesToB64url(enc.encode(s));
export const b64urlToStr = (s: string) => new TextDecoder().decode(b64urlToBytes(s));
