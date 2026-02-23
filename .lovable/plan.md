

## Fix Decryption Failures + Header Branding

### Root Cause of "[unable to decrypt]"

The encryption system uses ECDH where the shared secret depends on BOTH parties' keys: `derive(sender_private, recipient_public)`. The problem is:

1. When a customer's `private_key` cookie is lost (browser cleanup, different device, page refresh edge cases), the code in `Messages.tsx` **regenerates a new keypair** and **overwrites** the `public_key` in the database
2. Old messages were encrypted with the OLD shared secret (old keypair). When the admin tries to decrypt, they fetch the NEW public key from the DB, producing a DIFFERENT shared secret -- decryption fails
3. Same issue in reverse: if admin regenerates keys, old messages from customers become undecryptable

### Fix Strategy

**Store the sender's public key with each message.** This way, decryption always uses the correct public key that was active when the message was sent, regardless of later key rotations.

### Changes Required

#### 1. Database Migration
- Add `sender_public_key TEXT` column to the `messages` table (nullable for backward compat with existing messages)
- Add `sender_public_key TEXT` column to the `orders` table for encrypted_details (so admin can always decrypt order details even after customer key rotation)
- Add FK constraint from `orders.user_id` to `users(id)` for the admin join query

#### 2. Update message sending (Messages.tsx)
- When sending a message, include the sender's public key in the insert
- When decrypting messages, use `msg.sender_public_key` instead of always fetching the latest key from DB
- For customer messages: decrypt using `customer_private_key + admin_pub` (unchanged, admin key is stable)
- For admin messages: decrypt using `customer_private_key + msg.sender_public_key` (the admin's pub key at send time)

#### 3. Update admin message handling (Admin.tsx)
- When admin sends a reply, include admin's public key in the message insert
- When decrypting customer messages, use `msg.sender_public_key` (customer's pub key at send time) instead of the current DB value
- When decrypting order details, use `order.sender_public_key` if available, fallback to `users.public_key`

#### 4. Update Chat component (Chat.tsx)
- Same pattern: store sender's public key on send, use it on decrypt

#### 5. Update OrderForm (OrderForm.tsx)
- Store the customer's current public key alongside the order so admin can always decrypt

#### 6. Move private keys from cookies to localStorage
- Cookies have size/persistence issues; localStorage is more reliable for key storage
- Update `cookies.ts` to use localStorage for `private_key` and `admin_private_key`
- Add migration logic: if key exists in cookie but not localStorage, move it over

#### 7. Header branding
- Change "STORE" to "NAGSOM" in `Header.tsx`

### Technical Details

**Migration SQL:**
```text
ALTER TABLE public.messages ADD COLUMN sender_public_key TEXT;
ALTER TABLE public.orders ADD COLUMN sender_public_key TEXT;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id);
```

**Files to modify:**
- `src/lib/cookies.ts` -- Move private keys to localStorage with cookie fallback
- `src/components/Header.tsx` -- "STORE" to "NAGSOM"
- `src/pages/Messages.tsx` -- Include sender_public_key on send; use per-message key on decrypt
- `src/pages/Admin.tsx` -- Include sender_public_key on admin reply; use per-message key on decrypt for both messages and orders
- `src/components/Chat.tsx` -- Include sender_public_key on send; use per-message key on decrypt
- `src/components/OrderForm.tsx` -- Include customer public_key on order insert

**Backward compatibility:** Existing messages without `sender_public_key` will fall back to fetching the current key from the DB (same behavior as now). Only future messages will be rotation-proof.

