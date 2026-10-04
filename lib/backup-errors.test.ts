import { describe, expect, it } from 'vitest';

import { BACKUP_PAUSED, BACKUP_STILL_ON_PHONE } from '@/constants/backup';
import { humanizeBackupError, isAuthFailure } from '@/lib/backup-errors';

describe('backup error copy', () => {
  it('never surfaces JWT language', () => {
    const message = humanizeBackupError(new Error('JWT expired'));
    expect(message).toBe(BACKUP_PAUSED);
    expect(message).not.toMatch(/jwt/i);
    expect(isAuthFailure(new Error('JWT expired'))).toBe(true);
  });

  it('keeps shop data on the phone when the cloud is unreachable', () => {
    expect(humanizeBackupError(new Error('Failed to fetch'))).toBe(BACKUP_STILL_ON_PHONE);
    expect(humanizeBackupError({ message: 'Network request failed' })).toBe(BACKUP_STILL_ON_PHONE);
  });

  it('explains a wrong password without leaking auth internals', () => {
    expect(humanizeBackupError({ code: 'invalid_credentials', message: 'Invalid login credentials' })).toBe(
      'That email or password is not right.',
    );
  });
});
