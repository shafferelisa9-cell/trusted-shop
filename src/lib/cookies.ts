import Cookies from 'js-cookie';

const COOKIE_OPTIONS = { expires: 365, sameSite: 'strict' as const };

export const getEntryCode = () => Cookies.get('entry_code');
export const setEntryCode = (code: string) => Cookies.set('entry_code', code, COOKIE_OPTIONS);
export const clearEntryCode = () => Cookies.remove('entry_code');

export const getUserId = () => Cookies.get('user_id');
export const setUserId = (id: string) => Cookies.set('user_id', id, COOKIE_OPTIONS);

export const getPrivateKey = () => Cookies.get('private_key');
export const setPrivateKey = (key: string) => Cookies.set('private_key', key, COOKIE_OPTIONS);

export const getAdminPrivateKey = () => Cookies.get('admin_private_key');
export const setAdminPrivateKey = (key: string) => Cookies.set('admin_private_key', key, COOKIE_OPTIONS);

export const getAdminAuth = () => Cookies.get('admin_auth');
export const setAdminAuth = (val: string) => Cookies.set('admin_auth', val, COOKIE_OPTIONS);
