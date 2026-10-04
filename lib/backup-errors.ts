import { BACKUP_PAUSED, BACKUP_STILL_ON_PHONE } from '@/constants/backup';

export { BACKUP_PAUSED, BACKUP_STILL_ON_PHONE };

export function isAuthFailure(error: unknown): boolean {
  const status = errorStatus(error);
  if (status === 401 || status === 403) {
    return true;
  }

  const text = errorText(error).toLowerCase();
  return (
    text.includes('jwt') ||
    text.includes('refresh token') ||
    text.includes('invalid claim') ||
    text.includes('not authenticated') ||
    text.includes('unauthorized') ||
    text.includes('session expired') ||
    text.includes('invalid session')
  );
}

export function humanizeBackupError(error: unknown): string {
  const original = errorText(error);
  if (original === BACKUP_PAUSED || original === BACKUP_STILL_ON_PHONE) {
    return original;
  }

  const code = errorCode(error);
  const text = original.toLowerCase();

  if (
    code === 'invalid_credentials' ||
    text.includes('invalid login') ||
    text.includes('invalid email or password')
  ) {
    return 'That email or password is not right.';
  }

  if (code === 'email_not_confirmed' || text.includes('email not confirmed')) {
    return 'Check your email to finish. Your shop data is still on this phone.';
  }

  if (code === 'user_already_exists' || text.includes('already registered')) {
    return 'That email or password is not right.';
  }

  if (code === 'weak_password' || text.includes('password should be')) {
    return 'Use a longer password (at least 6 characters).';
  }

  if (isAuthFailure(error)) {
    return BACKUP_PAUSED;
  }

  return BACKUP_STILL_ON_PHONE;
}

function errorText(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = error.message;
    if (typeof message === 'string') {
      return message;
    }
  }

  return String(error ?? '');
}

function errorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') {
    return error.code;
  }
  return '';
}

function errorStatus(error: unknown): number | null {
  if (error && typeof error === 'object' && 'status' in error && typeof error.status === 'number') {
    return error.status;
  }
  return null;
}
