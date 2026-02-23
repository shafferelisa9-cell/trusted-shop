// Admin PGP public key — customers encrypt order details with this.
// In production, generate a real keypair and replace these.
export const ADMIN_PUBLIC_KEY = `-----BEGIN PGP PUBLIC KEY BLOCK-----

xjMEZ9sBMBYJKwYBBAHaRw8BAQdAexampleKeyForDevelopmentOnlyReplace
ThisWithARealKeyInProductionAAAA
=AAAA
-----END PGP PUBLIC KEY BLOCK-----`;

// Admin password for the /admin panel
export const ADMIN_PASSWORD = 'admin123';
