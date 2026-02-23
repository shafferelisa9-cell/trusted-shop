

## Fix Messaging (Root Cause Found) and Add Product Image Upload

### Root Cause of Messaging Failure

The `messages` table has a **foreign key constraint**: `order_id UUID NOT NULL REFERENCES public.orders(id)`. The messaging code uses `order_id` to store the **user's ID** (from the `users` table) as a thread identifier. When a customer sends a message, the insert fails silently because the user ID doesn't exist in the `orders` table -- the FK constraint rejects it.

### Fix Plan

#### 1. Remove the foreign key constraint on `messages.order_id` (database migration)

Drop the FK from `messages.order_id -> orders.id` so it can be used as a generic thread ID (the user's UUID). This is the single change that will make messaging work.

```text
ALTER TABLE public.messages DROP CONSTRAINT messages_order_id_fkey;
```

#### 2. Add a storage bucket for product images (database migration)

Create a public `product-images` storage bucket so admins can upload images from their PC instead of pasting URLs.

```text
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);
-- RLS: anyone can read, only authenticated users can upload/update/delete
```

#### 3. Update Admin dashboard -- product image upload from PC

In the Products tab of `Admin.tsx`:
- Replace the "Image URL" text input with a file picker (`<input type="file">`)
- When a file is selected, upload it to the `product-images` storage bucket
- Use the resulting public URL as the product's `image_url`
- Add an "CHANGE IMAGE" button on each existing product that allows replacing the image

#### 4. Add error logging to message send

Add `console.error` logging in `Messages.tsx` `handleSend` to surface any future insert failures, and also show a toast/error message to the user if sending fails.

---

### Technical Details

**Database migration (single migration file):**
- Drop FK constraint: `ALTER TABLE public.messages DROP CONSTRAINT messages_order_id_fkey;`
- Create storage bucket: `INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);`
- Add storage RLS policies for public read and authenticated upload/delete

**Files to modify:**
- `src/pages/Admin.tsx` -- Add file upload input for new products, add "CHANGE IMAGE" button for existing products, upload files to storage bucket and use public URL
- `src/pages/Messages.tsx` -- Add error handling/logging for failed message inserts
