

## Plan: Admin Product Editing, Multi-Image Support, and XMR/USD Price Conversion

This plan covers four main features:

1. **Admin panel: inline editing of name, description, and category tags**
2. **Multiple product images (gallery)**
3. **XMR to USD conversion displayed on store pages**
4. **Admin: set price in USD with auto-conversion to XMR**

---

### 1. Admin Panel - Edit Name, Description, and Categories

Currently the admin product list only allows editing the price. We will add inline editing for:

- **Name**: Click "edit" next to the name to toggle an input field
- **Description**: Expandable textarea for editing
- **Categories**: Tag-based editor where you can add/remove category tags

**Changes:**
- `src/pages/Admin.tsx`: Add state for editing name/description/categories per product. Add an `updateProduct()` function that saves all editable fields. Expand the product list item UI with edit controls for each field.

---

### 2. Multiple Product Images

Add support for a gallery of images per product.

**Database change:**
- Add a `gallery_images` column (jsonb, default `'[]'`) to the `products` table via migration

**Admin changes (`src/pages/Admin.tsx`):**
- Add an "Add more images" file input per product that uploads to storage and appends the URL to `gallery_images`
- Show thumbnail strip of additional images with delete buttons

**Store display changes:**
- `src/pages/ProductDetail.tsx`: Show an image carousel/gallery when multiple images exist, using the existing `embla-carousel-react` dependency
- `src/components/ProductCard.tsx`: Keep showing the main `image_url` as the card thumbnail (no change needed)

---

### 3. XMR to USD Rate Display on Store Pages

Show the equivalent USD price next to the XMR price on product cards and detail pages.

**Approach:** Create a backend function that fetches the XMR/USD rate from CoinGecko's free public API and caches it in a database table. The frontend fetches this cached rate on page load.

**Database change:**
- Create a `settings` table with columns: `key` (text, primary key), `value` (text), `updated_at` (timestamptz). Store the XMR rate as a row with key `xmr_usd_rate`.

**Edge function (`supabase/functions/update-xmr-rate/index.ts`):**
- Fetches `https://api.coingecko.com/api/v3/simple/price?ids=monero&vs_currencies=usd`
- Upserts the rate into the `settings` table
- Called on a schedule (cron job every 24 hours) and also callable manually

**Frontend changes:**
- Create a hook `src/hooks/useXmrRate.ts` that fetches the rate from the `settings` table
- `src/components/ProductCard.tsx`: Show `~$XX.XX` next to XMR price
- `src/pages/ProductDetail.tsx`: Show USD equivalent
- `src/pages/Store.tsx`: Fetch rate once and pass down or use context

---

### 4. Admin - Set Price in USD with Auto XMR Conversion

In the admin panel, allow setting the product price in USD. The system automatically converts it to XMR using the cached exchange rate.

**Changes to `src/pages/Admin.tsx`:**
- When editing price, show two inputs: USD and XMR
- Typing in USD auto-calculates XMR (using the cached rate) and vice versa
- The XMR value is what gets saved to the database
- Also apply this to the "Add Product" form

---

### Technical Details

**New migration SQL:**
```sql
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS gallery_images jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings are publicly readable"
  ON public.settings FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify settings"
  ON public.settings FOR ALL
  USING (has_role(auth.uid(), 'admin'));
```

**Files to create:**
- `supabase/functions/update-xmr-rate/index.ts` - Edge function to fetch and cache XMR rate
- `src/hooks/useXmrRate.ts` - React hook to read cached rate

**Files to modify:**
- `src/pages/Admin.tsx` - Add name/description/categories editing, gallery image management, USD price input
- `src/components/ProductCard.tsx` - Show USD equivalent
- `src/pages/ProductDetail.tsx` - Show USD equivalent, image gallery carousel
- `src/integrations/supabase/types.ts` - Will auto-update after migration

**Cron job** (set up via SQL insert after edge function is deployed):
- Runs the `update-xmr-rate` function every 24 hours

