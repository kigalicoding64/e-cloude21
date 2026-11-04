// AES-GCM encryption for stored third-party AI provider keys (server only).
const enc = new TextEncoder();
const dec = new TextDecoder();

function b64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function unb64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

async function vaultKey(): Promise<CryptoKey> {
  const secret = process.env["AI_VAULT_ENCRYPTION_KEY"];
  if (!secret) throw new Error("AI vault is not configured");
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(secret));
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptSecret(plain: string): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await vaultKey(), enc.encode(plain));
  return { ciphertext: b64(ct), iv: b64(iv) };
}

export async function decryptSecret(ciphertext: string, iv: string): Promise<string> {
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64(iv) },
    await vaultKey(),
    unb64(ciphertext),
  );
  return dec.decode(pt);
}
