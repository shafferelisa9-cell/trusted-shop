// Signal-style E2E encryption using Web Crypto API
// ECDH P-256 for key exchange, AES-256-GCM for encryption, HKDF-SHA-256 for key derivation

const ALGO = { name: 'ECDH', namedCurve: 'P-256' };

function bufToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function base64ToBuf(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

export async function generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
  const keyPair = await crypto.subtle.generateKey(ALGO, true, ['deriveKey', 'deriveBits']);
  const publicKeyRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  return {
    publicKey: bufToBase64(publicKeyRaw),
    privateKey: JSON.stringify(privateKeyJwk),
  };
}

async function importPublicKey(base64: string): Promise<CryptoKey> {
  const raw = base64ToBuf(base64);
  return crypto.subtle.importKey('raw', raw, ALGO, true, []);
}

async function importPrivateKey(jwkString: string): Promise<CryptoKey> {
  const jwk = JSON.parse(jwkString);
  return crypto.subtle.importKey('jwk', jwk, ALGO, true, ['deriveKey', 'deriveBits']);
}

async function deriveAESKey(privateKey: CryptoKey, publicKey: CryptoKey): Promise<CryptoKey> {
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: publicKey },
    privateKey,
    256
  );
  // HKDF to derive AES key from shared secret
  const hkdfKey = await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: new TextEncoder().encode('e2e-store') },
    hkdfKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptMessage(
  plaintext: string,
  senderPrivateKey: string,
  recipientPublicKey: string
): Promise<string> {
  const privKey = await importPrivateKey(senderPrivateKey);
  const pubKey = await importPublicKey(recipientPublicKey);
  const aesKey = await deriveAESKey(privKey, pubKey);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, encoded);

  const payload = JSON.stringify({
    iv: bufToBase64(iv.buffer),
    ct: bufToBase64(ciphertext),
  });
  return btoa(payload);
}

export async function decryptMessage(
  encrypted: string,
  recipientPrivateKey: string,
  senderPublicKey: string
): Promise<string> {
  try {
    const payload = JSON.parse(atob(encrypted));
    const iv = new Uint8Array(base64ToBuf(payload.iv));
    const ct = base64ToBuf(payload.ct);

    const privKey = await importPrivateKey(recipientPrivateKey);
    const pubKey = await importPublicKey(senderPublicKey);
    const aesKey = await deriveAESKey(privKey, pubKey);

    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, ct);
    return new TextDecoder().decode(decrypted);
  } catch {
    return '[unable to decrypt]';
  }
}
