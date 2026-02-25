

## Plan: Minimum Quantity, Quantity Step, Unit Type, and Per-Unit Price Display

### What This Does

Adds three new settings per product that the admin can control:

- **Minimum quantity** -- the smallest amount a customer can order (e.g. 50)
- **Quantity step** -- how much the +/- buttons change the quantity by (defaults to the min quantity)
- **Unit type** -- a label like "g", "pcs", "ml", "tabs" shown next to quantities

On the product page and store cards, the price display changes to show both the total and per-unit breakdown, for example:

```text
$80.00 / from $1.60 per g
```

This updates dynamically based on the product's price and minimum quantity.

---

### Database Changes

Add three new columns to the `products` table:

- `min_quantity` (integer, default 1) -- minimum order quantity
- `quantity_step` (integer, default 1) -- increment/decrement step for quantity selector
- `unit_type` (text, default 'pcs') -- unit label (g, pcs, ml, tabs, etc.)

---

### Admin Panel Changes (src/pages/Admin.tsx)

**Add Product form:**
- Add inputs for Min Quantity, Quantity Step, and Unit Type (dropdown or text input)

**Edit Product inline:**
- Add the same three fields to the editing form
- Save them alongside name/description/categories/price

---

### Product Detail Page (src/pages/ProductDetail.tsx)

- Read `min_quantity`, `quantity_step`, `unit_type` from the product
- Show price breakdown: total USD price and per-unit price (price / min_quantity)
- Add a quantity selector that starts at `min_quantity` and increments/decrements by `quantity_step`
- The "Add to Cart" button adds the selected quantity
- Display format example: `0.5 XMR (~$80.00) / from $1.60 per g`

---

### Product Card (src/components/ProductCard.tsx)

- Show per-unit price below the total: e.g. `~$80.00 / $1.60 per g`

---

### Cart (src/pages/Cart.tsx and src/contexts/CartContext.tsx)

- Quantity +/- buttons use the product's `quantity_step` instead of 1
- Enforce `min_quantity` as the floor (removing if quantity goes below it)
- `addItem` sets initial quantity to `min_quantity` instead of 1
- Show unit type next to quantities in the cart

---

### Technical Details

**Migration SQL:**
```sql
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS min_quantity integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS quantity_step integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS unit_type text NOT NULL DEFAULT 'pcs';
```

**Files to modify:**
- `src/pages/Admin.tsx` -- add min_quantity, quantity_step, unit_type to add/edit forms and save logic
- `src/pages/ProductDetail.tsx` -- quantity selector with step, per-unit price display
- `src/components/ProductCard.tsx` -- per-unit price display
- `src/contexts/CartContext.tsx` -- respect min_quantity and quantity_step in addItem/updateQuantity
- `src/pages/Cart.tsx` -- use quantity_step for +/- buttons, show unit type
- `src/integrations/supabase/types.ts` -- auto-updates after migration

**Price display logic (pseudocode):**
```text
perUnitUsd = totalUsd / minQuantity
Display: "$80.00 / from $1.60 per g"
```

