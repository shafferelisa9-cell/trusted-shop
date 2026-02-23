

## Fix Messaging, Admin Access, and Improve Admin Dashboard

### Problems Found

1. **Admin role not assigned**: Your account (`admin@nagsom.com`) only has the "user" role. The promotion command failed previously because the account didn't exist at that time. We need to run it again.

2. **Admin tab not showing**: The authentication context has a race condition -- it can resolve the loading state before the admin role check completes, causing the header to skip rendering the Admin link.

3. **Messaging broken**: The admin's public encryption key is stored only in the admin's browser (localStorage). Customers on other browsers have no way to get it, so encryption fails. The key needs to be stored in the database instead.

4. **Messages page requires proper key exchange**: The Messages page uses cookie-based user IDs as thread identifiers, but authenticated users may not have those cookies, breaking the flow.

---

### Step-by-Step Plan

#### 1. Promote admin account (database change)
- Run `SELECT public.promote_to_admin('admin@nagsom.com')` to assign the admin role.

#### 2. Store admin public key in database (database change)
- Create an `admin_settings` table with a single row to store the admin's public encryption key, so all users can retrieve it for message encryption.

```text
Table: admin_settings
- id (uuid, PK, default gen_random_uuid())
- public_key (text, not null)
- updated_at (timestamptz, default now())
RLS: publicly readable, admin-only insert/update
```

#### 3. Fix AuthContext race condition
- Restructure the auth initialization: set up `onAuthStateChange` listener first, then call `getSession()`. Use `setTimeout` for role checks inside the listener to avoid deadlocks. Only set `loading = false` after the initial session AND role check complete.

#### 4. Fix admin-keys.ts to use database
- Change `getAdminPublicKey()` to fetch from the `admin_settings` table instead of localStorage.
- Change `setAdminPublicKey()` to upsert into the database.

#### 5. Fix Messages page
- Ensure authenticated users get a crypto keypair linked to their auth account.
- On login, check if the user already has a `users` row with their `auth_id`; if so, restore the user ID cookie. If not, create one.
- Fetch admin public key from the database instead of localStorage.

#### 6. Fix Admin dashboard messaging
- When admin generates keys, save the public key to `admin_settings` table.
- Messages tab: show user email alongside thread ID for easier identification.
- Add realtime subscription so new messages appear automatically.

#### 7. Require authentication for ordering
- In the Cart page, if the user is not logged in, show a prompt to create an account before proceeding with checkout.
- The order form should only render for authenticated users.

#### 8. Improve Admin dashboard
- **Orders tab**: Show XMR address, payment amount, decrypted customer details (name, address) inline, and order date.
- **Products tab**: Add image preview next to each product, and inline editing for name/description.
- **Messages tab**: Show user email instead of raw UUID, add unread indicator.
- Add a summary bar at the top showing total orders, pending orders, and total revenue.

---

### Technical Details

**Files to create:**
- `supabase/migrations/...` -- admin_settings table + RLS policies

**Files to modify:**
- `src/contexts/AuthContext.tsx` -- fix race condition with proper init sequence
- `src/lib/admin-keys.ts` -- switch from localStorage to database for admin public key
- `src/pages/Messages.tsx` -- fix key initialization for authenticated users
- `src/pages/Admin.tsx` -- save public key to DB, improve dashboard UI, add stats
- `src/pages/Cart.tsx` -- require auth before ordering
- `src/components/Header.tsx` -- ensure admin link renders only after role is confirmed

