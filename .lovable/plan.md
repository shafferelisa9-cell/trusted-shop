

## Plan: Streamline Checkout Flow and Fix Product Page Display

This plan addresses several issues:
1. Product detail page not properly showing quantity stepping, units, and per-unit pricing
2. Cart not showing USD conversion
3. Checkout (PLACE ORDER) should be in the cart, not on individual product pages
4. Cart checkout should be straightforward: confirm items, see price, enter shipping info, get order link

---

### 1. Remove OrderForm from Product Detail Page

**File: `src/pages/ProductDetail.tsx`**
- Remove the `<OrderForm>` component and its import
- Keep only: image gallery, product info, quantity selector with stepping, "ADD TO CART" button, and detail tables
- Fix the quantity initialization bug (calling `setQuantity` during render causes issues -- move to `useEffect`)

---

### 2. Fix Product Detail Page Display

**File: `src/pages/ProductDetail.tsx`**
- Fix quantity initialization to use `useEffect` instead of calling `setQuantity` during render
- Ensure the quantity selector properly shows units and steps
- Show dynamic price on "ADD TO CART" button that updates with quantity (both XMR and USD)
- Always show per-unit USD price (even when min_quantity is 1, as long as USD rate is available)

---

### 3. Revamp Cart Page with Integrated Checkout

**File: `src/pages/Cart.tsx`**
- Add USD conversion display next to XMR prices (use `useXmrRate` hook)
- Show per-item subtotal in both XMR and USD
- Show total in both XMR and USD
- Replace the current "HOW TO ORDER" instructions with a proper checkout flow:

**Checkout flow (all within Cart page):**
1. **Review items** -- already shown with quantities, prices in XMR + USD
2. **Enter shipping info** -- inline form with shipping address and optional notes (E2E encrypted)
3. **PLACE ORDER button** -- encrypts details, creates one order per cart item (or a single combined order), shows the XMR wallet address and exact amount to send
4. **Order confirmation** -- shows tracking link(s) after successful order placement

This reuses the encryption logic from `OrderForm` but operates on the entire cart instead of a single product.

---

### 4. Update OrderForm Component

**File: `src/components/OrderForm.tsx`**
- Refactor to accept cart items (array of products + quantities) instead of a single product
- Calculate total XMR from all cart items
- Create one order per cart item in the database (each with its own tracking token)
- After success, show all tracking links and the total XMR to send
- Clear the cart after successful order placement

Alternatively, we can move the checkout logic directly into `Cart.tsx` and stop using `OrderForm` as a separate component. This keeps things simpler since the form is now only used in one place.

---

### Technical Details

**Files to modify:**

1. **`src/pages/ProductDetail.tsx`**
   - Remove `import OrderForm` and `<OrderForm product={product} />`
   - Fix quantity init: replace the render-time `if (quantity < minQty) setQuantity(minQty)` with a `useEffect` that sets quantity to `minQty` when product loads
   - Update "ADD TO CART" button to show USD: `ADD TO CART -- 0.5 XMR (~$80.00)`

2. **`src/pages/Cart.tsx`**
   - Import `useXmrRate` hook
   - Import encryption utilities: `encryptMessage`, `getAdminPublicKey`, `getUserId`, `getPrivateKey`
   - Import `supabase` client
   - Add USD display next to every XMR price (per item and total)
   - Add checkout form state: `address`, `notes`, `submitting`, `orderResults`
   - Add `handlePlaceOrder` function that:
     - Validates encryption keys are ready (auto-initializes if needed)
     - Encrypts shipping details
     - Creates an order for each cart item in the database
     - Collects all tracking tokens
     - Shows confirmation with wallet address + total XMR + tracking links
     - Clears the cart
   - Replace the "HOW TO ORDER" / "CONTACT US" section with:
     - Shipping address textarea
     - Notes textarea (optional)
     - PLACE ORDER button
     - After placement: wallet address, total XMR, and list of tracking links

3. **`src/components/OrderForm.tsx`**
   - Keep file but it will no longer be imported anywhere (can clean up later)
   - Or delete the import from ProductDetail -- either way it stops being used on product pages

**No database changes needed** -- the orders table already has all required columns.

**Checkout flow summary for the user:**

```text
Cart Page
  |
  +-- Item list with quantities (stepping by quantity_step), XMR + USD prices
  |
  +-- Total: X.XXXX XMR (~$XX.XX)
  |
  +-- Shipping Address [textarea]
  +-- Notes (optional) [textarea]
  |
  +-- [PLACE ORDER] button
  |
  +-- After order:
       - "Send exactly X.XXXX XMR to [wallet address]"
       - Tracking links for each item
```

