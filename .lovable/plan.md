

# Privacy-First Product Store Template

## Overview
A minimalistic black-on-white product store using Supabase (Lovable Cloud) as the backend. Chat messages and order info are PGP-encrypted client-side before being sent to the database. Private keys live in browser cookies and decryption happens automatically so the experience feels seamless.

## Key Changes from Previous Plan
- Entry codes and public keys are independent — no linking between them
- Each user gets their own PGP keypair (public key stored in Supabase, private key in cookies)
- One single admin PGP keypair (both public and private key hardcoded/bundled in the app)
- Order status includes a shareable link for tracking

---

## 1. Install Dependencies
- `openpgp` for client-side PGP encryption/decryption
- `js-cookie` for cookie management

## 2. Supabase Setup (Lovable Cloud)
Four tables:

**products** — plaintext, not sensitive
- id (uuid, PK), name, description, price_xmr (numeric), image_url, created_at

**users** — one row per visitor
- id (uuid, PK), public_key (text), created_at

**orders** — encrypted customer details, plaintext status
- id (uuid, PK), user_id (FK to users), product_id (FK to products), status (text: pending/confirmed/shipped/delivered), encrypted_details (text — PGP ciphertext of shipping info/notes), tracking_token (text, unique — for shareable status link), price_xmr (numeric), xmr_address (text), created_at

**messages** — encrypted chat per order
- id (uuid, PK), order_id (FK to orders), encrypted_content (text — PGP ciphertext), sender (text: 'customer' or 'admin'), created_at

RLS policies: open read/write for now (encryption is the security layer).

## 3. PGP Key Management
- **Customer**: On first visit, auto-generate a PGP keypair using OpenPGP.js. Store private key in cookie, save public key to Supabase `users` table. User ID stored in cookie too.
- **Admin**: One hardcoded admin keypair. Public key bundled in the app (used by customers to encrypt order details). Private key entered by admin on the `/admin` page and kept in memory/cookie for decryption.
- Entry code is a separate cookie — not linked to the public key or user record.

## 4. Entry Gate Screen
- Full-screen input asking for a code on first visit
- Code saved to cookie; on return visits, auto-skip to store
- No relation to PGP keys — purely an access gate

## 5. Store Pages & Routes
- `/` — Entry gate (if no code cookie) or product grid
- `/product/:id` — Product detail with info, reviews, order form
- `/order/:token` — Shareable order status page (by tracking token)
- `/orders` — User's orders list (looked up by user_id cookie)
- `/how-to-buy` — Monero purchase guide
- `/admin` — Password-protected admin panel

## 6. Product Grid & Detail
- Clean cards: product name, XMR price, placeholder image
- Detail page: description, static sample reviews, order form
- Order form: shipping address + notes, encrypted with admin's public key before saving

## 7. Order & Payment Flow
- Customer submits order form; details encrypted with admin public key
- Order saved to Supabase with a unique `tracking_token`
- Display XMR wallet address + amount to pay
- Shareable order status link: `/order/<tracking_token>` — shows status (pending/confirmed/shipped/delivered) without exposing encrypted details
- Customer can view their own orders at `/orders` (decrypted with their private key from cookie)

## 8. Chat System
- Per-order messaging via Supabase
- Customer encrypts messages with admin's public key; admin encrypts with customer's public key (fetched from Supabase via user_id on the order)
- Auto-decrypted on display — looks like normal chat
- Supabase realtime subscription for live updates

## 9. Admin Panel (`/admin`)
- Password-protected (simple password check, stored in env/hardcoded)
- Admin enters/pastes their PGP private key on first admin visit (stored in cookie)
- **Products tab**: CRUD for products (plaintext)
- **Orders tab**: List orders, decrypt customer details with admin private key, update status
- **Chat tab**: Select an order, view/send encrypted messages

## 10. Design System
- Pure black on white, no color accents
- Minimal typography (system sans-serif), generous whitespace
- Clean thin borders (border-black), no shadows, no rounded corners
- Monospace font only for XMR addresses and PGP-related display

## 11. File Structure
```text
src/
  lib/
    pgp.ts          — encrypt/decrypt helpers, key generation
    cookies.ts      — cookie get/set helpers
    admin-keys.ts   — admin public key constant
    supabase.ts     — Supabase client (auto from Lovable Cloud)
  pages/
    EntryGate.tsx
    Store.tsx
    ProductDetail.tsx
    OrderStatus.tsx
    MyOrders.tsx
    HowToBuy.tsx
    Admin.tsx
  components/
    Header.tsx
    ProductCard.tsx
    OrderForm.tsx
    Chat.tsx
    AdminProducts.tsx
    AdminOrders.tsx
    AdminChat.tsx
```

## 12. Implementation Sequence
1. Enable Lovable Cloud Supabase + create tables via migration
2. Install openpgp and js-cookie
3. Build PGP utility functions and cookie helpers
4. Build Entry Gate page
5. Build Store layout, product grid, and product detail
6. Build order form with PGP encryption + payment display
7. Build order status page with tracking token
8. Build chat system with encryption
9. Build admin panel with decryption
10. Seed sample products
11. Wire up all routes

