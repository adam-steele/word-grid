/**
 * Lightweight encode/decode for level blobs.
 * Not cryptographic security — raises the bar against casual inspection.
 * Build script encodes; client decodes at runtime.
 */

function xorBytes(data: Uint8Array, key: string): Uint8Array {
  const keyBytes = new TextEncoder().encode(key);
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    out[i] = data[i]! ^ keyBytes[i % keyBytes.length]!;
  }
  return out;
}

export function encodePayload(json: string, key: string): string {
  const compressed = new TextEncoder().encode(json);
  const scrambled = xorBytes(compressed, key);
  return btoa(String.fromCharCode(...scrambled));
}

export function decodePayload(encoded: string, key: string): string {
  const raw = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  const unscrambled = xorBytes(raw, key);
  return new TextDecoder().decode(unscrambled);
}
