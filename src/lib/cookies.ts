import Cookies from 'js-cookie';

const COOKIE_OPTIONS = { expires: 365, sameSite: 'strict' as const, secure: true };

export const getEntryCode = () => Cookies.get('entry_code');
export const setEntryCode = (code: string) => Cookies.set('entry_code', code, COOKIE_OPTIONS);
export const clearEntryCode = () => Cookies.remove('entry_code');

export const getUserId = () => Cookies.get('user_id');
export const setUserId = (id: string) => Cookies.set('user_id', id, COOKIE_OPTIONS);

// Private keys: use localStorage for persistence, with cookie fallback for migration
export const getPrivateKey = (): string | undefined => {
  const ls = localStorage.getItem('private_key');
  if (ls) return ls;
  // Migrate from cookie if exists
  const cookie = Cookies.get('private_key');
  if (cookie) {
    localStorage.setItem('private_key', cookie);
    Cookies.remove('private_key');
    return cookie;
  }
  return undefined;
};
export const setPrivateKey = (key: string) => {
  localStorage.setItem('private_key', key);
  Cookies.remove('private_key'); // clean up old cookie
};

export const getAdminPrivateKey = (): string | undefined => {
  const ls = localStorage.getItem('admin_private_key');
  if (ls) return ls;
  const cookie = Cookies.get('admin_private_key');
  if (cookie) {
    localStorage.setItem('admin_private_key', cookie);
    Cookies.remove('admin_private_key');
    return cookie;
  }
  return undefined;
};
export const setAdminPrivateKey = (key: string) => {
  localStorage.setItem('admin_private_key', key);
  Cookies.remove('admin_private_key');
};

export const getAdminAuth = () => Cookies.get('admin_auth');
export const setAdminAuth = (val: string) => Cookies.set('admin_auth', val, COOKIE_OPTIONS);
