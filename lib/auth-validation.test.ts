import { describe, expect, it } from 'vitest';

import {
  authErrorMessage,
  normalizeAuthIdentifier,
  validatePassword,
} from '@/lib/auth-validation';

describe('authentication validation', () => {
  it('normalizes email addresses', () => {
    expect(normalizeAuthIdentifier('email', '  Owner@Example.COM ')).toBe('owner@example.com');
    expect(() => normalizeAuthIdentifier('email', 'owner')).toThrow(/valid email/);
  });

  it('normalizes Ghana local phone numbers', () => {
    expect(normalizeAuthIdentifier('phone', '024 123 4567')).toBe('+233241234567');
    expect(normalizeAuthIdentifier('phone', '+233 (24) 123-4567')).toBe('+233241234567');
    expect(() => normalizeAuthIdentifier('phone', '123')).toThrow(/phone number/);
  });

  it('requires a usable password and hides auth internals', () => {
    expect(() => validatePassword('12345')).toThrow(/at least 6/);
    expect(() => validatePassword('123456')).not.toThrow();
    expect(authErrorMessage(new Error('JWT expired'))).toBe('Something went wrong. Please try again.');
    expect(authErrorMessage(new Error('Enter a valid email address.'))).toBe(
      'Enter a valid email address.',
    );
  });
});
