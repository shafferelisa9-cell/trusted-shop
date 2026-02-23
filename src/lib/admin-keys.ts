// Admin password for the /admin panel
export const ADMIN_PASSWORD = 'admin123';

// Admin public key is stored in the database or generated on first admin setup.
// The admin generates a keypair in the admin panel and shares the public key.
// This key will be set dynamically when the admin configures their keys.

// localStorage key for admin public key
const ADMIN_PUB_KEY_STORAGE = 'admin_public_key';

export function getAdminPublicKey(): string | null {
  return localStorage.getItem(ADMIN_PUB_KEY_STORAGE);
}

export function setAdminPublicKey(key: string): void {
  localStorage.setItem(ADMIN_PUB_KEY_STORAGE, key);
}
