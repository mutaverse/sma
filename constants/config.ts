export const APP_NAME = 'SMA';
export const DEFAULT_CURRENCY_CODE = 'GHS';
export const DEFAULT_CURRENCY_SYMBOL = 'GH₵';
export const DEFAULT_TIMEZONE = 'Africa/Accra';

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const authRequired = process.env.EXPO_PUBLIC_AUTH_REQUIRED === 'true';
