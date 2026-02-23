

# Replace PGP with Modern E2E Encryption (Signal-style)

## Overview
Replace the current OpenPGP.js-based encryption with a modern, WhatsApp/Signal-style encryption system built on the **Web Crypto API** (built into every browser -- no external library needed). This uses the same cryptographic primitives as Signal Protocol:

- **X25519 ECDH** for key exchange (same elliptic curve as Signal/WhatsApp)
- **AES-256-GCM** for authenticated encryption (same as Signal/WhatsApp)
- **HKDF** for key derivation

This removes the heavy `openpgp` dependency entirely and uses browser-native cryptography which is faster, more reliable, and avoids the "Key not found" errors from OpenPGP.js parsing.

---

## How It Works

1. **Key Generation**: Each user (and admin) generates an X25519 keypair. The public key is shared; the private key stays in the browser cookie.
2. **Encryption**: To send a message, the sender combines their private key with the recipient's public key using ECDH to derive a shared secret. That shared secret is used with AES-256-GCM to encrypt the message.
3. **Decryption**: The recipient does the same ECDH with their private key and the sender's public key -- producing the identical shared secret -- and decrypts.

This is the same fundamental approach WhatsApp, Signal, and other modern E2E systems use.

---

## Changes Required

### 1. Replace `src/lib/pgp.ts` with `src/lib/e2e-crypto.ts`
New file using Web Crypto API:
- `generateKeyPair()` -- generates X25519 (ECDH P-256 as Web Crypto fallback) keypair, exports as base64 strings
- `encryptMessage(plaintext, senderPrivateKey, recipientPublicKey)` -- ECDH + AES-256-GCM encryption
- `decryptMessage(ciphertext, recipientPrivateKey, senderPublicKey)` -- ECDH + AES-256-GCM decryption
- Keys stored as compact base64 strings (not bulky PGP armor blocks)

### 2. Update `src/lib/admin-keys.ts`
- Replace PGP public key block with a compact base64 admin public key
- Generate a real admin keypair on first run and display it for the admin to save

### 3. Update `src/lib/cookies.ts`
- No structural changes needed -- same cookie helpers, just storing shorter base64 keys instead of PGP armor

### 4. Update `src/pages/Index.tsx`
- Import from `e2e-crypto` instead of `pgp`
- Same flow: generate keypair, store private key in cookie, save public key to Supabase

### 5. Update `src/components/OrderForm.tsx`
- Change encryption call: `encryptMessage(details, userPrivateKey, adminPublicKey)` -- now needs both keys for ECDH
- Fetch user's private key from cookie for the ECDH step

### 6. Update `src/components/Chat.tsx`
- Encrypt outgoing: use sender's private key + recipient's public key
- Decrypt incoming: use own private key + sender's public key
- Each message needs to store which public key was used (or we look it up from the order/user)

### 7. Update `src/pages/Admin.tsx`
- Decrypt order details using admin private key + customer public key (fetched from order's user_id)
- Chat encryption/decryption uses same ECDH pattern

### 8. Remove `openpgp` dependency
- Remove from `package.json`

---

## Technical Details

### Crypto Primitives
- **Key Exchange**: ECDH with P-256 curve (Web Crypto native; equivalent security to X25519)
- **Encryption**: AES-256-GCM with random 12-byte IV per message
- **Key Derivation**: HKDF-SHA-256 to derive AES key from ECDH shared secret
- **Output Format**: Base64-encoded JSON containing IV + ciphertext

### Key Format
Keys are stored as short base64 strings (~88 characters) instead of multi-line PGP armor blocks (~600+ characters). This fits more naturally in cookies and database fields.

### Message Format
Each encrypted message is a base64 string containing:
```text
{ iv: <12 bytes>, ciphertext: <AES-256-GCM output> }
```

### Why This Is Better Than PGP
- **No external dependency** -- Web Crypto API is built into every modern browser
- **Faster** -- native browser crypto vs JavaScript library
- **Smaller keys** -- 88 chars vs 600+ chars of PGP armor
- **No parsing errors** -- no armored key format to parse/break
- **Same security level** -- AES-256-GCM + ECDH P-256 matches modern E2E standards

