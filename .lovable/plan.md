

## Plan: Auto-Initialize Encryption Keys Globally

### Problem
Encryption keys are only generated when users visit the homepage (`/`). Navigating directly to `/cart`, `/product/:id`, or any other route skips key initialization, causing "Encryption keys not ready" errors at checkout.

### Solution
Move the key initialization logic out of `Index.tsx` into a shared provider that wraps all routes. Every page will automatically have keys ready.

---

### 1. Create a KeyProvider component

**New file: `src/contexts/KeyProvider.tsx`**

A React context provider that:
- On mount, checks if `getUserId()` and `getPrivateKey()` exist
- If not, generates a keypair, inserts a `users` row, and stores the userId cookie + privateKey in localStorage
- Shows a brief "Initializing..." screen until ready
- Wraps all children so every route has keys available

---

### 2. Simplify Index.tsx

**File: `src/pages/Index.tsx`**

Remove all the key initialization logic. It becomes a simple passthrough:
```
const Index = () => <Store />;
```

---

### 3. Wrap routes with KeyProvider

**File: `src/AppRoutes.tsx`**

Add `<KeyProvider>` inside the existing provider stack (after AuthProvider, before CartProvider) so it runs on every route.

---

### 4. Fix Cart.tsx error message

**File: `src/pages/Cart.tsx`**

- Remove the "visit Messages page" error message since keys will always be initialized
- Keep the check as a safety fallback but change the message to something like "Initializing encryption, please wait..."
- Add a note advising users to use the same device/browser and not clear browser data to keep their keys
- After order confirmation, mention that users should save their order tracking link

---

### 5. Order status page: handle missing keys gracefully

**File: `src/pages/OrderStatus.tsx`**

- If a user opens an order link on a new device/browser (no keys), they can still view order status and payment info
- For the chat section, show a message explaining they need their original keys to send/read encrypted messages
- Optionally allow them to paste their private key to restore access

---

### Technical Details

**KeyProvider logic (pseudocode):**
```
if getUserId() exists AND getPrivateKey() exists:
  ready = true (keys already set up)
else:
  generate keypair
  store privateKey in localStorage
  insert user row with publicKey into DB
  store userId in cookie
  ready = true
```

**Files to create:**
- `src/contexts/KeyProvider.tsx`

**Files to modify:**
- `src/pages/Index.tsx` -- remove init logic, just render Store
- `src/AppRoutes.tsx` -- wrap routes with KeyProvider
- `src/pages/Cart.tsx` -- update error message, add device/browser warning text

