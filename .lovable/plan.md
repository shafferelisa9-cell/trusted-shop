

# Privacy-First Product Store Template

## Overview
A minimalistic black-on-white product store using Supabase as the backend. Chat messages and order info are PGP-encrypted client-side before being sent to the database, so the server only ever stores ciphertext. Private keys live in browser cookies — decryption happens automatically so the experience feels seamless.

---

## 1. Entry Gate Screen
- Full-screen code input on first visit
- Code saved to cookies; auto-populated and hidden on return visits
- Clean, centered minimal design

## 2. PGP Key Management (Transparent to User)
- On first visit, a PGP keypair is auto-generated client-side (using OpenPGP.js)
- Private key stored in browser cookies
- Public key sent to Supabase (linked to user's entry code)
- All encryption/decryption happens automatically — user sees normal readable text

## 3. Store Layout
- **Header**: Store name + minimal navigation
- **Product Grid**: Clean cards with product name, XMR price, placeholder image
- **Product Detail Page**:
  - Info panel (description, specs) — stored plaintext, not sensitive
  - Reviews section (static sample reviews)
  - Order info section

## 4. Order & Payment Flow
- Customer fills order form (shipping address, notes)
- Order details are PGP-encrypted client-side before saving to Supabase
- Payment via Monero: display XMR wallet address + amount
- Dedicated "How to Buy Monero" text guide
- Order status (pending/confirmed/shipped) stored plaintext; personal details encrypted

## 5. Chat System
- Real-time messaging per order via Supabase
- Messages encrypted with recipient's public key before sending to DB
- Auto-decrypted on the client when displayed — looks like a normal chat
- Admin's public key is bundled; customer's public key is fetched from Supabase

## 6. Admin Panel (`/admin`)
- Password-protected route
- **Products**: Add, edit, remove products (plaintext in Supabase — not sensitive)
- **Orders**: View orders, decrypt customer details with admin's private key
- **Chat**: Real-time encrypted chat with customers, auto-decrypted in UI

## 7. Backend (Supabase via Lovable Cloud)
- **Products table**: name, description, price, image — plaintext
- **Orders table**: status (plaintext), encrypted_details (PGP ciphertext), customer public key
- **Messages table**: order_id, encrypted_content (PGP ciphertext), sender, timestamp
- **Users table**: entry_code, public_key

## 8. Design System
- Pure black on white, no color accents
- Minimal typography, generous whitespace
- Clean thin borders, no shadows
- Monospace font for crypto/XMR addresses only

