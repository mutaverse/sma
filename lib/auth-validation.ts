export type AuthMethod = 'email' | 'phone';

export function normalizeAuthIdentifier(method: AuthMethod, value: string): string {
  const trimmed = value.trim();

  if (method === 'email') {
    const email = trimmed.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Enter a valid email address.');
    }
    return email;
  }

  const compact = trimmed.replace(/[\s()-]/g, '');
  const normalized = compact.startsWith('0') ? `+233${compact.slice(1)}` : compact;

  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw new Error('Enter a phone number like 024 123 4567 or +233 24 123 4567.');
  }

  return normalized;
}

export function validatePassword(password: string): void {
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }
}

export function authErrorMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : error && typeof error === 'object' && 'message' in error
        ? String(error.message)
        : '';
  const lower = message.toLowerCase();

  if (lower.includes('invalid login') || lower.includes('invalid credentials')) {
    return 'The details you entered are not correct.';
  }
  if (lower.includes('already registered') || lower.includes('already exists')) {
    return 'An account already exists with those details.';
  }
  if (lower.includes('rate limit')) {
    return 'Too many attempts. Wait a moment and try again.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Could not connect. Check your internet and try again.';
  }
  if (message && !/jwt|token|claim/i.test(message)) {
    return message;
  }

  return 'Something went wrong. Please try again.';
}
