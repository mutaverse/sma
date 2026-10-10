import type { AuthResponse, Session } from '@supabase/supabase-js';

import { normalizeAuthIdentifier, type AuthMethod, validatePassword } from '@/lib/auth-validation';
import { getSupabaseClient } from '@/lib/supabase';

export async function signIn(
  method: AuthMethod,
  identifier: string,
  password: string,
): Promise<Session> {
  validatePassword(password);
  const value = normalizeAuthIdentifier(method, identifier);
  const supabase = requireSupabase();
  const credentials =
    method === 'email' ? { email: value, password } : { phone: value, password };
  const { data, error } = await supabase.auth.signInWithPassword(credentials);

  if (error) {
    throw error;
  }
  if (!data.session) {
    throw new Error('We could not start your session. Please try again.');
  }

  return data.session;
}

export async function signUp(
  method: AuthMethod,
  identifier: string,
  password: string,
  companyName: string,
): Promise<AuthResponse['data']> {
  validatePassword(password);
  const value = normalizeAuthIdentifier(method, identifier);
  const company = companyName.trim();
  if (!company) {
    throw new Error('Enter your company name.');
  }

  const supabase = requireSupabase();
  const options = { data: { company_name: company } };
  const credentials =
    method === 'email'
      ? { email: value, password, options }
      : { phone: value, password, options };
  const { data, error } = await supabase.auth.signUp(credentials);

  if (error) {
    throw error;
  }

  return data;
}

export async function verifyPhoneSignUp(phone: string, code: string): Promise<Session> {
  const normalized = normalizeAuthIdentifier('phone', phone);
  const { data, error } = await requireSupabase().auth.verifyOtp({
    phone: normalized,
    token: code.trim(),
    type: 'sms',
  });

  if (error) {
    throw error;
  }
  if (!data.session) {
    throw new Error('That code could not be verified. Please try again.');
  }

  return data.session;
}

export async function sendPasswordReset(email: string): Promise<void> {
  const normalized = normalizeAuthIdentifier('email', email);
  const { error } = await requireSupabase().auth.resetPasswordForEmail(normalized);
  if (error) {
    throw error;
  }
}

function requireSupabase() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Account sign-in is not configured on this install.');
  }
  return client;
}
